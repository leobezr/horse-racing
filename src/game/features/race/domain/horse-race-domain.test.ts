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

  it('keeps race running for full configured round duration', () => {
    const rng = createMockDeterministicRng()
    const horses = createHorseOptions(rng).slice(0, gameConfig.raceHorseCount)

    const raceResult = runDeterministicRace({ horses, rng })
    const ticksPerRound = Math.floor((gameConfig.rounds.secondsPerRound * 1000) / gameConfig.animation.tickMs)
    const expectedSnapshotCount = gameConfig.rounds.count * ticksPerRound

    expect(raceResult.raceSnapshots).toHaveLength(expectedSnapshotCount)
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

  it('creates one round summary per configured round', () => {
    const rng = createMockDeterministicRng()
    const horses = createHorseOptions(rng).slice(0, gameConfig.raceHorseCount)

    const raceResult = runDeterministicRace({ horses, rng })

    expect(raceResult.roundSummaries).toHaveLength(gameConfig.rounds.count)
  })
})
