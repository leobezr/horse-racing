import { getFrameTransitionDecision } from './frame-transition-decision'

describe('getFrameTransitionDecision', () => {
  it('returns render_and_pause when round end tick is reached', () => {
    const decision = getFrameTransitionDecision({
      tickIndex: 120,
      nextRoundEndTick: 120,
      nextRoundNumber: 1,
      roundCount: 6,
      isBetweenRoundsTransitioning: false,
      isAwaitingBetweenRoundsBet: false,
    })

    expect(decision).toBe('render_and_pause')
  })

  it('returns skip while waiting between rounds', () => {
    const decision = getFrameTransitionDecision({
      tickIndex: 121,
      nextRoundEndTick: 120,
      nextRoundNumber: 1,
      roundCount: 6,
      isBetweenRoundsTransitioning: false,
      isAwaitingBetweenRoundsBet: true,
    })

    expect(decision).toBe('skip')
  })

  it('returns render when final round is complete', () => {
    const decision = getFrameTransitionDecision({
      tickIndex: 320,
      nextRoundEndTick: 320,
      nextRoundNumber: 6,
      roundCount: 6,
      isBetweenRoundsTransitioning: false,
      isAwaitingBetweenRoundsBet: false,
    })

    expect(decision).toBe('render')
  })
})
