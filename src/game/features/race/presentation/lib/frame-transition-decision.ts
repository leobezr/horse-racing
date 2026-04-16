import type { FrameTransitionDecision } from '../../types/frame-transition-decision'

export const getFrameTransitionDecision = ({
  tickIndex,
  nextRoundEndTick,
  nextRoundNumber,
  roundCount,
  isBetweenRoundsTransitioning,
  isAwaitingBetweenRoundsBet,
}: {
  tickIndex: number
  nextRoundEndTick: number | null
  nextRoundNumber: number
  roundCount: number
  isBetweenRoundsTransitioning: boolean
  isAwaitingBetweenRoundsBet: boolean
}): FrameTransitionDecision => {
  if (isBetweenRoundsTransitioning || isAwaitingBetweenRoundsBet) {
    return 'skip'
  }

  const hasNextRound = nextRoundNumber < roundCount
  if (hasNextRound && nextRoundEndTick !== null && tickIndex >= nextRoundEndTick) {
    return 'render_and_pause'
  }

  return 'render'
}
