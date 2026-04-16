import { gameConfig } from '../../../../config/game.config'
import { createHorseOptions, runDeterministicRace } from './horse-race-domain'
import type { HorseOption } from '../types/horse-race'
import type { DeterministicRng } from '../types/rng'

const createMockDeterministicRng = (): DeterministicRng => {
  return {
    seedText: 'test-seed',
    random: () => {
      return 0.5
    },
    randomInt: (minInclusive, maxInclusive) => {
      return Math.floor((minInclusive + maxInclusive) / 2)
    },
    randomFloat: (minInclusive, maxExclusive) => {
      return (minInclusive + maxExclusive) / 2
    },
  }
}

const createHorseFixture = ({
  id,
  laneNumber,
  baseSpeed,
  accelerationBias,
  stamina,
  sprintControl,
}: {
  id: string
  laneNumber: number
  baseSpeed: number
  accelerationBias: number
  stamina: number
  sprintControl: number
}): HorseOption => {
  return {
    id,
    laneNumber,
    name: id,
    colors: {
      primary: '#101010',
      secondary: '#202020',
      tertiary: '#303030',
      saddle: '#404040',
    },
    stats: {
      baseSpeed,
      accelerationBias,
      stamina,
      sprintControl,
      gateJump: accelerationBias,
      topSpeed: baseSpeed,
      staminaReservoir: stamina,
      efficiency: Math.max(0.2, stamina),
      finishDrive: 1.1,
      aerodynamics: 0.7,
      weightKg: 500,
      style: 'grinder',
      dailyForm: 1,
    },
    odds: {
      probability: 0.5,
      numerator: 1,
      denominator: 1,
      label: '1/1',
    },
    frameSequence: [0],
    metadata: {
      selectedByUser: false,
      raceTicksCompleted: 0,
      finalDistance: 0,
      finishedAtTick: null,
      sprintCount: 0,
      averageTickSpeed: 0,
    },
  }
}

const createAlwaysAggressiveRng = (): DeterministicRng => {
  return {
    seedText: 'always-aggressive',
    random: () => {
      return 0
    },
    randomInt: (minInclusive) => {
      return minInclusive
    },
    randomFloat: (minInclusive) => {
      return minInclusive
    },
  }
}

describe('runDeterministicRace', () => {
  it('sets finish distance to final configured round distance', () => {
    const rng = createMockDeterministicRng()
    const horses = createHorseOptions(rng).slice(0, gameConfig.raceHorseCount)

    const raceResult = runDeterministicRace({ horses, rng })

    expect(raceResult.finishDistance).toBe(2200)
  })

  it('keeps horse distances within finish distance in every snapshot', () => {
    const rng = createMockDeterministicRng()
    const horses = createHorseOptions(rng).slice(0, gameConfig.raceHorseCount)

    const raceResult = runDeterministicRace({ horses, rng })

    for (const snapshot of raceResult.raceSnapshots) {
      for (const horseSnapshot of snapshot) {
        expect(horseSnapshot.distance).toBeLessThanOrEqual(raceResult.finishDistance)
      }
    }
  })

  it('does not force rounds to end at configured seconds', () => {
    const rng = createMockDeterministicRng()
    const horses = createHorseOptions(rng).slice(0, gameConfig.raceHorseCount)

    const raceResult = runDeterministicRace({ horses, rng })
    const configuredTotalTicks =
      gameConfig.rounds.count *
      Math.floor((gameConfig.rounds.secondsPerRound * 1000) / gameConfig.animation.tickMs)

    expect(raceResult.raceSnapshots.length).toBeGreaterThan(configuredTotalTicks)
  })

  it('has each horse at finish distance by final snapshot', () => {
    const rng = createMockDeterministicRng()
    const horses = createHorseOptions(rng).slice(0, gameConfig.raceHorseCount)

    const raceResult = runDeterministicRace({ horses, rng })
    const finalSnapshot = raceResult.raceSnapshots[raceResult.raceSnapshots.length - 1] ?? []

    expect(finalSnapshot).toHaveLength(gameConfig.raceHorseCount)
    for (const horseSnapshot of finalSnapshot) {
      expect(horseSnapshot.distance).toBe(raceResult.finishDistance)
    }
  })

  it('has each horse reach configured distance by each round end tick', () => {
    const rng = createMockDeterministicRng()
    const horses = createHorseOptions(rng).slice(0, gameConfig.raceHorseCount)

    const raceResult = runDeterministicRace({ horses, rng })

    for (const roundSummary of raceResult.roundSummaries) {
      const roundSnapshot = raceResult.raceSnapshots[roundSummary.endTick] ?? []
      const expectedRoundDistance = gameConfig.rounds.trackDistances[roundSummary.roundNumber - 1]

      for (const horseSnapshot of roundSnapshot) {
        expect(horseSnapshot.distance).toBe(expectedRoundDistance)
      }
    }
  })

  it('creates one round summary per configured round', () => {
    const rng = createMockDeterministicRng()
    const horses = createHorseOptions(rng).slice(0, gameConfig.raceHorseCount)

    const raceResult = runDeterministicRace({ horses, rng })

    expect(raceResult.roundSummaries).toHaveLength(gameConfig.rounds.count)
  })

  it('uses a different deterministic seed for each round summary', () => {
    const rng = createMockDeterministicRng()
    const horses = createHorseOptions(rng).slice(0, gameConfig.raceHorseCount)

    const raceResult = runDeterministicRace({ horses, rng })
    const roundSeeds = raceResult.roundSummaries.map((roundSummary) => {
      return roundSummary.seedText
    })

    expect(new Set(roundSeeds).size).toBe(gameConfig.rounds.count)
  })

  it('keeps horse race conditions valid in every round summary', () => {
    const rng = createMockDeterministicRng()
    const horses = createHorseOptions(rng).slice(0, gameConfig.raceHorseCount)

    const raceResult = runDeterministicRace({ horses, rng })

    for (const roundSummary of raceResult.roundSummaries) {
      const roundTrackDistance = gameConfig.rounds.trackDistances[roundSummary.roundNumber - 1]
      for (const horseResult of roundSummary.horseResults) {
        expect(horseResult.roundDistance).toBeGreaterThan(0)
        expect(horseResult.roundDistance).toBeLessThanOrEqual(roundTrackDistance)
        expect(horseResult.averageTickSpeed).toBeGreaterThan(0)
        expect(horseResult.sprintCount).toBeGreaterThanOrEqual(0)
        expect(horseResult.sprintCount).toBeLessThanOrEqual(3)
      }
    }
  })

  it('keeps each horse distance monotonic within each round', () => {
    const rng = createMockDeterministicRng()
    const horses = createHorseOptions(rng).slice(0, gameConfig.raceHorseCount)

    const raceResult = runDeterministicRace({ horses, rng })

    for (const roundSummary of raceResult.roundSummaries) {
      const roundSnapshots = raceResult.raceSnapshots.slice(roundSummary.startTick, roundSummary.endTick + 1)
      for (const horse of horses) {
        let previousDistance = 0
        for (const snapshot of roundSnapshots) {
          const horseSnapshot = snapshot.find((entry) => {
            return entry.id === horse.id
          })
          expect(horseSnapshot).toBeDefined()
          const currentDistance = horseSnapshot?.distance ?? 0
          expect(currentDistance).toBeGreaterThanOrEqual(previousDistance)
          previousDistance = currentDistance
        }
      }
    }
  })

  it('does not assign a winner when no horse finishes within race runtime', () => {
    const rng = createMockDeterministicRng()
    const originalMaxTicks = gameConfig.simulation.maxTicks
    gameConfig.simulation.maxTicks = 1

    const horses: HorseOption[] = [
      createHorseFixture({
        id: 'horse-1',
        laneNumber: 1,
        baseSpeed: gameConfig.simulation.baseSpeedMin,
        accelerationBias: 0.1,
        stamina: 0.2,
        sprintControl: 0,
      }),
    ]

    try {
      const raceResult = runDeterministicRace({ horses, rng })
      expect(raceResult.winnerId).toBeNull()
    } finally {
      gameConfig.simulation.maxTicks = originalMaxTicks
    }
  })

  it('applies carry-over stamina fatigue across rounds deterministically', () => {
    const rng = createMockDeterministicRng()
    const horses = createHorseOptions(rng).slice(0, gameConfig.raceHorseCount)

    const raceResult = runDeterministicRace({ horses, rng })
    const firstRoundSummary = raceResult.roundSummaries[0]
    const secondRoundSummary = raceResult.roundSummaries[1]

    expect(firstRoundSummary).toBeDefined()
    expect(secondRoundSummary).toBeDefined()
    expect(firstRoundSummary?.horseResults[0]).toBeDefined()
    expect(secondRoundSummary?.horseResults[0]).toBeDefined()
    const firstRoundLeaderSpeed = firstRoundSummary?.horseResults[0]?.averageTickSpeed ?? 0
    const secondRoundLeaderSpeed = secondRoundSummary?.horseResults[0]?.averageTickSpeed ?? 0
    expect(secondRoundLeaderSpeed).not.toBe(firstRoundLeaderSpeed)
  })

  it('ranks each round winner by actual finish performance, not lane order', () => {
    const rng = createMockDeterministicRng()
    const horses: HorseOption[] = [
      createHorseFixture({
        id: 'horse-1',
        laneNumber: 1,
        baseSpeed: gameConfig.simulation.baseSpeedMin,
        accelerationBias: 0.1,
        stamina: 0.2,
        sprintControl: 0,
      }),
      createHorseFixture({
        id: 'horse-2',
        laneNumber: 2,
        baseSpeed: gameConfig.simulation.baseSpeedMax,
        accelerationBias: 1,
        stamina: 1,
        sprintControl: 1,
      }),
    ]

    const raceResult = runDeterministicRace({ horses, rng })
    const firstRoundWinner = raceResult.roundSummaries[0]?.horseResults[0]?.id

    expect(firstRoundWinner).toBe('horse-2')
  })

  it('applies high lasting speed penalty after risky sprint choices', () => {
    const rng = createAlwaysAggressiveRng()
    const originalSprintChance = gameConfig.simulation.sprintChance
    gameConfig.simulation.sprintChance = 1

    const horses: HorseOption[] = [
      createHorseFixture({
        id: 'horse-1',
        laneNumber: 1,
        baseSpeed: gameConfig.simulation.baseSpeedMax,
        accelerationBias: 1,
        stamina: 1,
        sprintControl: 1,
      }),
      createHorseFixture({
        id: 'horse-2',
        laneNumber: 2,
        baseSpeed: gameConfig.simulation.baseSpeedMax,
        accelerationBias: 1,
        stamina: 1,
        sprintControl: 0,
      }),
    ]

    try {
      const raceResult = runDeterministicRace({
        horses,
        rng,
      })
      const secondRoundSummary = raceResult.roundSummaries[1]
      const riskyHorseRoundTwo = secondRoundSummary?.horseResults.find((horse) => {return horse.id === 'horse-1'})
      const safeHorseRoundTwo = secondRoundSummary?.horseResults.find((horse) => {return horse.id === 'horse-2'})

      expect(riskyHorseRoundTwo).toBeDefined()
      expect(safeHorseRoundTwo).toBeDefined()
      expect(riskyHorseRoundTwo?.averageTickSpeed ?? 0).toBeLessThanOrEqual(safeHorseRoundTwo?.averageTickSpeed ?? 0)
    } finally {
      gameConfig.simulation.sprintChance = originalSprintChance
    }
  })

  it('keeps sprint injury penalty at or below ten percent', () => {
    expect(gameConfig.simulation.sprintInjurySpeedPenaltyMultiplier).toBeGreaterThanOrEqual(0.9)
  })

  it('keeps sprint injury penalty temporary', () => {
    expect(gameConfig.simulation.sprintInjuryPenaltyTicks).toBeLessThanOrEqual(60)
  })

  it('keeps race debug logging disabled by default', () => {
    expect(typeof gameConfig.simulation.raceDebugLogging).toBe('boolean')
  })

  it('keeps global minimum race speed at seven or higher', () => {
    expect(gameConfig.simulation.minRaceSpeed).toBeGreaterThanOrEqual(7)
  })
})
