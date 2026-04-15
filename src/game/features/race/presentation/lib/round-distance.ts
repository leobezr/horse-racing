import type { RaceRoundSummary } from '../../types/horse-race'

export const getRoundFinishDistanceForTick = ({
  tickIndex,
  roundSummaries,
  configuredRoundTrackDistances,
  fallbackFinishDistance,
}: {
  tickIndex: number
  roundSummaries: RaceRoundSummary[]
  configuredRoundTrackDistances: number[]
  fallbackFinishDistance: number
}): number => {
  const activeRoundSummary = roundSummaries.find(
    (roundSummary) => {return tickIndex >= roundSummary.startTick && tickIndex <= roundSummary.endTick},
  )

  if (!activeRoundSummary) {
    return fallbackFinishDistance
  }

  const configuredDistance = configuredRoundTrackDistances[activeRoundSummary.roundNumber - 1]
  if (configuredDistance === undefined) {
    return fallbackFinishDistance
  }

  return configuredDistance
}
