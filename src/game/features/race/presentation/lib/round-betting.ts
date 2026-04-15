import type { RaceRoundSummary } from '../../types/horse-race'

export const getRoundWinnerHorseId = ({
  roundSummary,
}: {
  roundSummary: RaceRoundSummary | undefined
}): string | null => {
  if (!roundSummary) {
    return null
  }

  const winner = roundSummary.horseResults[0]
  if (!winner) {
    return null
  }

  return winner.id
}

export const resolveAutoStakeAmount = ({
  previousStakeAmount,
  horseCount,
  chipValues,
  canPlaceTotalBetAmount,
}: {
  previousStakeAmount: number
  horseCount: number
  chipValues: number[]
  canPlaceTotalBetAmount: (totalAmount: number) => boolean
}): number => {
  if (horseCount < 1) {
    return 0
  }

  if (canPlaceTotalBetAmount(previousStakeAmount * horseCount)) {
    return previousStakeAmount
  }

  const sortedChipValues = [...chipValues].sort((left, right) => {return left - right})
  for (const chipValue of sortedChipValues) {
    if (canPlaceTotalBetAmount(chipValue * horseCount)) {
      return chipValue
    }
  }

  return 0
}

export const resolveAutoBetHorseIds = ({
  previousHorseIds,
  fallbackHorseId,
}: {
  previousHorseIds: string[]
  fallbackHorseId: string | null
}): string[] => {
  if (previousHorseIds.length > 0) {
    return [...previousHorseIds]
  }

  if (!fallbackHorseId) {
    return []
  }

  return [fallbackHorseId]
}

export const getRoundBetTotalStake = ({
  horseCount,
  stakePerHorse,
}: {
  horseCount: number
  stakePerHorse: number
}): number => {
  if (horseCount < 1 || stakePerHorse < 1) {
    return 0
  }

  return horseCount * stakePerHorse
}
