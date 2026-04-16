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
  roundSummaries,
}: {
  tickIndex: number
  roundSummaries: RaceRoundSummary[]
}): LiveRaceRound => {
  const activeRoundSummary = roundSummaries.find((roundSummary) => {
    return tickIndex >= roundSummary.startTick && tickIndex <= roundSummary.endTick
  })

  if (!activeRoundSummary) {
    return createFallbackLiveRaceRound({ tickIndex })
  }

  const roundTickProgress = Math.max(0, tickIndex - activeRoundSummary.startTick)
  const roundTickCount = Math.max(
    1,
    activeRoundSummary.endTick - activeRoundSummary.startTick + 1,
  )
  const roundTicksRemaining = Math.max(0, roundTickCount - roundTickProgress)
  const roundSecondsRemaining = Math.max(0, Math.ceil((roundTicksRemaining * gameConfig.animation.tickMs) / 1000))

  return {
    roundNumber: activeRoundSummary.roundNumber,
    roundSecondsRemaining,
  }
}

const createFallbackLiveRaceRound = ({
  tickIndex,
}: {
  tickIndex: number
}): LiveRaceRound => {
  const ticksPerRound = Math.max(
    1,
    Math.floor((gameConfig.rounds.secondsPerRound * 1000) / gameConfig.animation.tickMs),
  )
  const roundNumber = Math.min(
    gameConfig.rounds.count,
    Math.floor(tickIndex / ticksPerRound) + 1,
  )
  const roundTickProgress = tickIndex % ticksPerRound
  const roundTicksRemaining = Math.max(0, ticksPerRound - roundTickProgress)
  const roundSecondsRemaining = Math.max(
    0,
    Math.ceil((roundTicksRemaining * gameConfig.animation.tickMs) / 1000),
  )

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
  const activeRoundSummary = roundSummaries.find((roundSummary) => {
    return tickIndex >= roundSummary.startTick && tickIndex <= roundSummary.endTick
  })
  const roundStartTick = activeRoundSummary?.startTick ?? 0

  const progress = createProgressRows({
    horses,
    snapshotByHorseId,
    finishDistance,
    tickIndex,
    raceSnapshots,
    roundStartTick,
    roundEndTick: Math.min(tickIndex, activeRoundSummary?.endTick ?? tickIndex),
  })
  sortProgressRows(progress)
  return toLiveHorseProgress(progress)
}

type LiveHorseProgressSortable = LiveHorseProgress & {
  finishedAtTick: number | null
}

const createProgressRows = ({
  horses,
  snapshotByHorseId,
  finishDistance,
  tickIndex,
  raceSnapshots,
  roundStartTick,
  roundEndTick,
}: {
  horses: HorseOption[]
  snapshotByHorseId: Map<string, number>
  finishDistance: number
  tickIndex: number
  raceSnapshots: RaceSnapshot[]
  roundStartTick: number
  roundEndTick: number
}): LiveHorseProgressSortable[] => {
  return horses.map((horse) => {
    return createHorseProgressRow({
      horse,
      snapshotByHorseId,
      finishDistance,
      tickIndex,
      raceSnapshots,
      roundStartTick,
      roundEndTick,
    })
  })
}

const createHorseProgressRow = ({
  horse,
  snapshotByHorseId,
  finishDistance,
  tickIndex,
  raceSnapshots,
  roundStartTick,
  roundEndTick,
}: CreateHorseProgressRowInput): LiveHorseProgressSortable => {
  const baseProgress = resolveHorseBaseProgress({
    horse,
    snapshotByHorseId,
    finishDistance,
    tickIndex,
  })
  const resolvedRaceTick = resolveRaceTick({
    horseId: horse.id,
    finishDistance,
    raceSnapshots,
    roundStartTick,
    roundEndTick,
    tickIndex,
  })
  const raceTimeSeconds = resolveRaceTimeSeconds({
    resolvedRaceTick,
    roundStartTick,
  })

  return createHorseProgressRowOutput({
    horse,
    baseProgress,
    raceTimeSeconds,
    resolvedRaceTick,
    finishDistance,
  })
}

type CreateHorseProgressRowInput = {
  horse: HorseOption
  snapshotByHorseId: Map<string, number>
  finishDistance: number
  tickIndex: number
  raceSnapshots: RaceSnapshot[]
  roundStartTick: number
  roundEndTick: number
}

const resolveHorseBaseProgress = ({
  horse,
  snapshotByHorseId,
  finishDistance,
  tickIndex,
}: {
  horse: HorseOption
  snapshotByHorseId: Map<string, number>
  finishDistance: number
  tickIndex: number
}): {
  distance: number
  distanceToFinish: number
  estimatedSecondsToFinish: number | null
} => {
  const distance = Math.min(finishDistance, snapshotByHorseId.get(horse.id) ?? 0)
  const distanceToFinish = Math.max(0, finishDistance - distance)
  const estimatedSecondsToFinish = resolveEstimatedSecondsToFinish({
    distance,
    distanceToFinish,
    tickIndex,
  })

  return {
    distance,
    distanceToFinish,
    estimatedSecondsToFinish,
  }
}

const createHorseProgressRowOutput = ({
  horse,
  baseProgress,
  raceTimeSeconds,
  resolvedRaceTick,
  finishDistance,
}: {
  horse: HorseOption
  baseProgress: {
    distance: number
    distanceToFinish: number
    estimatedSecondsToFinish: number | null
  }
  raceTimeSeconds: number
  resolvedRaceTick: number
  finishDistance: number
}): LiveHorseProgressSortable => {
  return {
    id: horse.id,
    name: horse.name,
    laneNumber: horse.laneNumber,
    position: 0,
    raceTimeSeconds,
    finishedAtTick:
      baseProgress.distance >= finishDistance ? resolvedRaceTick : null,
    distance: baseProgress.distance,
    distanceToFinish: baseProgress.distanceToFinish,
    estimatedSecondsToFinish: baseProgress.estimatedSecondsToFinish,
  }
}

const resolveEstimatedSecondsToFinish = ({
  distance,
  distanceToFinish,
  tickIndex,
}: {
  distance: number
  distanceToFinish: number
  tickIndex: number
}): number | null => {
  const tickCount = Math.max(1, tickIndex + 1)
  const averageSpeed = distance / tickCount
  if (averageSpeed <= 0 || distanceToFinish <= 0) {
    return null
  }

  const estimatedTicksToFinish = distanceToFinish / averageSpeed
  if (!Number.isFinite(estimatedTicksToFinish)) {
    return null
  }

  return Number.parseFloat(
    ((estimatedTicksToFinish * gameConfig.animation.tickMs) / 1000).toFixed(2),
  )
}

const resolveRaceTick = ({
  horseId,
  finishDistance,
  raceSnapshots,
  roundStartTick,
  roundEndTick,
  tickIndex,
}: {
  horseId: string
  finishDistance: number
  raceSnapshots: RaceSnapshot[]
  roundStartTick: number
  roundEndTick: number
  tickIndex: number
}): number => {
  let resolvedRaceTick = tickIndex
  for (let snapshotIndex = roundStartTick; snapshotIndex <= roundEndTick; snapshotIndex += 1) {
    const snapshot = raceSnapshots[snapshotIndex] ?? []
    const horseSnapshot = snapshot.find((entry) => {
      return entry.id === horseId
    })
    const resolvedDistance = horseSnapshot?.distance ?? 0
    if (resolvedDistance >= finishDistance) {
      resolvedRaceTick = snapshotIndex
      break
    }
  }

  return resolvedRaceTick
}

const resolveRaceTimeSeconds = ({
  resolvedRaceTick,
  roundStartTick,
}: {
  resolvedRaceTick: number
  roundStartTick: number
}): number => {
  return Number.parseFloat(
    ((Math.max(0, resolvedRaceTick - roundStartTick + 1) * gameConfig.animation.tickMs) / 1000).toFixed(2),
  )
}

const sortProgressRows = (progress: LiveHorseProgressSortable[]): void => {
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
}

const toLiveHorseProgress = (
  progress: LiveHorseProgressSortable[],
): LiveHorseProgress[] => {
  return progress.map((horse, index) => {
    return {
      id: horse.id,
      name: horse.name,
      laneNumber: horse.laneNumber,
      raceTimeSeconds: horse.raceTimeSeconds,
      distance: horse.distance,
      distanceToFinish: horse.distanceToFinish,
      estimatedSecondsToFinish: horse.estimatedSecondsToFinish,
      position: index + 1,
    }
  })
}
