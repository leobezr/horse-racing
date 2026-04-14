export type DeterministicRng = {
  seedText: string
  random: () => number
  randomInt: (minInclusive: number, maxInclusive: number) => number
  randomFloat: (minInclusive: number, maxExclusive: number) => number
}
