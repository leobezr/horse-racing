import {
  getRoundBetTotalStake,
  getRoundWinnerHorseId,
  resolveAutoBetHorseIds,
  resolveAutoStakeAmount,
} from './round-betting'

describe('resolveAutoStakeAmount', () => {
  it('keeps previous stake when still affordable', () => {
    const resolvedStake = resolveAutoStakeAmount({
      previousStakeAmount: 5000,
      horseCount: 1,
      chipValues: [500, 1500, 5000],
      canPlaceTotalBetAmount: (amount) => {return amount <= 6000},
    })

    expect(resolvedStake).toBe(5000)
  })

  it('falls back to minimum affordable chip when previous stake is not affordable', () => {
    const resolvedStake = resolveAutoStakeAmount({
      previousStakeAmount: 5000,
      horseCount: 1,
      chipValues: [500, 1500, 5000],
      canPlaceTotalBetAmount: (amount) => {return amount <= 1000},
    })

    expect(resolvedStake).toBe(500)
  })

  it('returns zero when no chip is affordable', () => {
    const resolvedStake = resolveAutoStakeAmount({
      previousStakeAmount: 500,
      horseCount: 1,
      chipValues: [500, 1500, 5000],
      canPlaceTotalBetAmount: () => {return false},
    })

    expect(resolvedStake).toBe(0)
  })

  it('evaluates affordability using total stake for all selected horses', () => {
    const resolvedStake = resolveAutoStakeAmount({
      previousStakeAmount: 500,
      horseCount: 3,
      chipValues: [500, 1500, 5000],
      canPlaceTotalBetAmount: (amount) => {return amount <= 2000},
    })

    expect(resolvedStake).toBe(500)
  })
})

describe('getRoundWinnerHorseId', () => {
  it('returns winner id from the first horse result', () => {
    const winnerId = getRoundWinnerHorseId({
      roundSummary: {
        roundNumber: 1,
        seedText: 'round-seed-1',
        startTick: 0,
        endTick: 149,
        horseResults: [
          {
            id: 'horse-2',
            name: 'Winner',
            laneNumber: 2,
            roundDistance: 1200,
            totalDistance: 1200,
            finishedAtTick: 120,
            averageTickSpeed: 8,
            sprintCount: 1,
          },
        ],
      },
    })

    expect(winnerId).toBe('horse-2')
  })

  it('returns null when summary is missing', () => {
    const winnerId = getRoundWinnerHorseId({
      roundSummary: undefined,
    })

    expect(winnerId).toBeNull()
  })

  it('returns null when first horse did not finish within race runtime', () => {
    const winnerId = getRoundWinnerHorseId({
      roundSummary: {
        roundNumber: 1,
        seedText: 'round-seed-1',
        startTick: 0,
        endTick: 149,
        horseResults: [
          {
            id: 'horse-2',
            name: 'No Finish Winner',
            laneNumber: 2,
            roundDistance: 1100,
            totalDistance: 1100,
            finishedAtTick: null,
            averageTickSpeed: 7.3,
            sprintCount: 1,
          },
        ],
      },
    })

    expect(winnerId).toBeNull()
  })
})

describe('resolveAutoBetHorseIds', () => {
  it('keeps previous horse ids when provided', () => {
    const horseIds = resolveAutoBetHorseIds({
      previousHorseIds: ['horse-1', 'horse-2'],
      fallbackHorseId: 'horse-3',
    })

    expect(horseIds).toEqual(['horse-1', 'horse-2'])
  })

  it('falls back to selected horse when previous list is empty', () => {
    const horseIds = resolveAutoBetHorseIds({
      previousHorseIds: [],
      fallbackHorseId: 'horse-3',
    })

    expect(horseIds).toEqual(['horse-3'])
  })
})

describe('getRoundBetTotalStake', () => {
  it('returns stake per horse multiplied by horse count', () => {
    const totalStake = getRoundBetTotalStake({
      horseCount: 3,
      stakePerHorse: 500,
    })

    expect(totalStake).toBe(1500)
  })
})
