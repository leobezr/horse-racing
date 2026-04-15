import { gameConfig } from '../../../../../config/game.config'
import type { HorseOption, LiveHorseProgress, LiveRaceRound } from '../../types/horse-race'

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
}: {
  horses: HorseOption[]
  snapshotByHorseId: Map<string, number>
  finishDistance: number
  tickIndex: number
}): LiveHorseProgress[] => {
  const progress = horses.map((horse) => {
    const distance = Math.min(finishDistance, snapshotByHorseId.get(horse.id) ?? 0)
    const distanceToFinish = Math.max(0, finishDistance - distance)
    const tickCount = Math.max(1, tickIndex + 1)
    const averageSpeed = distance / tickCount
    const estimatedTicksToFinish = averageSpeed > 0 ? distanceToFinish / averageSpeed : Number.POSITIVE_INFINITY
    const estimatedSecondsToFinish =
      Number.isFinite(estimatedTicksToFinish) && distanceToFinish > 0? Number.parseFloat(((estimatedTicksToFinish * gameConfig.animation.tickMs) / 1000).toFixed(2)): null

    return {
      id: horse.id,
      name: horse.name,
      laneNumber: horse.laneNumber,
      distance,
      distanceToFinish,
      estimatedSecondsToFinish,
    }
  })

  progress.sort((left, right) => {
    if (right.distance !== left.distance) {
      return right.distance - left.distance
    }

    return left.laneNumber - right.laneNumber
  })

  return progress
}
