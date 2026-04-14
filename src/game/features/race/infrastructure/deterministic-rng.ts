import seedrandom from 'seedrandom'
import type { DeterministicRng } from '../types/rng'

const toSeedText = (seedInput: number | string | undefined): string => {
  if (typeof seedInput === 'number' && Number.isFinite(seedInput)) {
    return String(seedInput)
  }
  if (typeof seedInput === 'string' && seedInput.trim().length > 0) {
    return seedInput.trim()
  }
  return 'horse-race-default-seed'
}

export const createDeterministicRng = (seedInput?: number | string): DeterministicRng => {
  const seedText = toSeedText(seedInput)
  const seeded = seedrandom(seedText)
  const random = () => seeded.quick()

  return {
    seedText,
    random,
    randomInt: (minInclusive, maxInclusive) => {
      const randomValue = random()
      return Math.floor(randomValue * (maxInclusive - minInclusive + 1)) + minInclusive
    },
    randomFloat: (minInclusive, maxExclusive) => random() * (maxExclusive - minInclusive) + minInclusive,
  }
}
