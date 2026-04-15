import { gameConfig } from '../../../../config/game.config'
import { createHorseOptions, runDeterministicRace } from './horse-race-domain'
import type { DeterministicRng } from '../types/rng'

const createMockDeterministicRng = (): DeterministicRng => ({
  seedText: 'test-seed',
  random: () => 0.5,
  randomInt: (minInclusive, maxInclusive) => Math.floor((minInclusive + maxInclusive) / 2),
  randomFloat: (minInclusive, maxExclusive) => (minInclusive + maxExclusive) / 2,
})

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
})
