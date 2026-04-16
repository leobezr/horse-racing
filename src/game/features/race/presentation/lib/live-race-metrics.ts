import { gameConfig } from '../../../../../config/game.config'
import type {
  HorseOption,
  LiveHorseProgress,
  LiveRaceRound,
  RaceRoundSummary,
  RaceSnapshot,
} from '../../types/horse-race'

/**
 * Computes the live race round snapshot from the current animation tick.
 */
export const createLiveRaceRound = ({
  tickIndex,
}: {
  tickIndex: number
}): LiveRaceRound => {
  const ticksPerRound = Math.max(1, Math.floor((gameConfig.rounds.secondsPerRound * 1000) / gameConfig.animation.tickMs))
  const roundNumber = Math.min(gameConfig.rounds.count, Math.floor(tickIndex / ticksPerRound) + 1)
  const roundTickProgress = tickIndex % ticksPerRound
  const roundTicksRemaining = Math.max(0, ticksPerRound - roundTickProgress)
  const roundSecondsRemaining = Math.max(0, Math.ceil((roundTicksRemaining * gameConfig.animation.tickMs) / 1000))

  return {
    roundNumber,
    roundSecondsRemaining,
  }
}

/**
 * Computes per-horse live progress and returns a distance-sorted leaderboard.
 */
export const createLiveHorseProgress = ({
  horses,
  snapshotByHorseId,
  finishDistance,
  tickIndex,
  raceSnapshots,
  roundSummaries,
}: {
  horses: HorseOption[]
  snapshotByHorseId: Map<string, number>
  finishDistance: number
  tickIndex: number
  raceSnapshots: RaceSnapshot[]
  roundSummaries: RaceRoundSummary[]
}): LiveHorseProgress[] => {
  type LiveHorseProgressSortable = LiveHorseProgress & {
    finishedAtTick: number | null
  }

  const activeRoundSummary = roundSummaries.find((roundSummary) => {
    return tickIndex >= roundSummary.startTick && tickIndex <= roundSummary.endTick
  })
  const roundStartTick = activeRoundSummary?.startTick ?? 0

  const progress: LiveHorseProgressSortable[] = horses.map((horse) => {
    const distance = Math.min(finishDistance, snapshotByHorseId.get(horse.id) ?? 0)
    const distanceToFinish = Math.max(0, finishDistance - distance)
    const tickCount = Math.max(1, tickIndex + 1)
    const averageSpeed = distance / tickCount
    const estimatedTicksToFinish = averageSpeed > 0 ? distanceToFinish / averageSpeed : Number.POSITIVE_INFINITY
    const estimatedSecondsToFinish =
      Number.isFinite(estimatedTicksToFinish) && distanceToFinish > 0? Number.parseFloat(((estimatedTicksToFinish * gameConfig.animation.tickMs) / 1000).toFixed(2)): null

    let resolvedRaceTick = tickIndex
    const roundEndTick = Math.min(tickIndex, activeRoundSummary?.endTick ?? tickIndex)
    for (let snapshotIndex = roundStartTick; snapshotIndex <= roundEndTick; snapshotIndex += 1) {
      const snapshot = raceSnapshots[snapshotIndex] ?? []
      const horseSnapshot = snapshot.find((entry) => {
        return entry.id === horse.id
      })
      const resolvedDistance = horseSnapshot?.distance ?? 0
      if (resolvedDistance >= finishDistance) {
        resolvedRaceTick = snapshotIndex
        break
      }
    }

    const raceTimeSeconds = Number.parseFloat(
      ((Math.max(0, resolvedRaceTick - roundStartTick + 1) * gameConfig.animation.tickMs) / 1000).toFixed(2),
    )

    const finishedAtTick = distance >= finishDistance ? resolvedRaceTick : null

    return {
      id: horse.id,
      name: horse.name,
      laneNumber: horse.laneNumber,
      position: 0,
      raceTimeSeconds,
      finishedAtTick,
      distance,
      distanceToFinish,
      estimatedSecondsToFinish,
    }
  })

  progress.sort((left, right) => {
    if (right.distance !== left.distance) {
      return right.distance - left.distance
    }

    const leftFinishedAtTick = left.finishedAtTick ?? Number.POSITIVE_INFINITY
    const rightFinishedAtTick = right.finishedAtTick ?? Number.POSITIVE_INFINITY
    if (leftFinishedAtTick !== rightFinishedAtTick) {
      return leftFinishedAtTick - rightFinishedAtTick
    }

    return left.laneNumber - right.laneNumber
  })

  return progress.map((horse, index) => {
    const visibleHorse = {
      id: horse.id,
      name: horse.name,
      laneNumber: horse.laneNumber,
      raceTimeSeconds: horse.raceTimeSeconds,
      distance: horse.distance,
      distanceToFinish: horse.distanceToFinish,
      estimatedSecondsToFinish: horse.estimatedSecondsToFinish,
    }
    return {
      ...visibleHorse,
      position: index + 1,
    }
  })
}
