export const createHiddenSeed = (): string => {
  const epoch = Date.now().toString(36)
  const random = Math.floor(Math.random() * 1_000_000_000)
    .toString(36)
    .padStart(6, '0')
  return `${epoch}-${random}`
}
