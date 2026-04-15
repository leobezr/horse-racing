import { getRoundFinishDistanceForTick } from './round-distance'

describe('getRoundFinishDistanceForTick', () => {
  it('returns round-specific finish distance for early rounds', () => {
    const finishDistance = getRoundFinishDistanceForTick({
      tickIndex: 120,
      roundSummaries: [
        { roundNumber: 1, startTick: 0, endTick: 149, horseResults: [] },
        { roundNumber: 2, startTick: 150, endTick: 299, horseResults: [] },
      ],
      configuredRoundTrackDistances: [1200, 1400],
      fallbackFinishDistance: 2200,
    })

    expect(finishDistance).toBe(1200)
  })

  it('returns round-specific finish distance for later rounds', () => {
    const finishDistance = getRoundFinishDistanceForTick({
      tickIndex: 220,
      roundSummaries: [
        { roundNumber: 1, startTick: 0, endTick: 149, horseResults: [] },
        { roundNumber: 2, startTick: 150, endTick: 299, horseResults: [] },
      ],
      configuredRoundTrackDistances: [1200, 1400],
      fallbackFinishDistance: 2200,
    })

    expect(finishDistance).toBe(1400)
  })

  it('falls back to final finish distance when tick is outside summaries', () => {
    const finishDistance = getRoundFinishDistanceForTick({
      tickIndex: 999,
      roundSummaries: [
        { roundNumber: 1, startTick: 0, endTick: 149, horseResults: [] },
      ],
      configuredRoundTrackDistances: [1200],
      fallbackFinishDistance: 2200,
    })

    expect(finishDistance).toBe(2200)
  })
})
