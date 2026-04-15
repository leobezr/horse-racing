import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { gameConfig } from '../../config/game.config'
import { loadBetsFromStorage, saveBetsToStorage } from '../../app/features/profile/infrastructure/local-storage-profile-bets'
import type { BetEntry } from '../../app/features/profile/types/profile-bets'

const createBetId = (): string => {
  return `bet-${Date.now()}-${Math.floor(Math.random() * 1000000)}`
}
const initialCredit = gameConfig.betting.initialCredit

const calculateFixedPayout = (bet: number, num: number, den: number): number => {
  const totalPayout = bet * (num / den + 1)
  return Number.parseFloat(totalPayout.toFixed(2))
}

export const useProfileBetsStore = defineStore('profile-bets', () => {
  const bets = ref<BetEntry[]>(loadBetsFromStorage())
  const reservedCredit = ref<number>(0)

  const orderedBets = computed(() => {
    return [...bets.value].sort((left, right) => {
      return right.createdAtIso.localeCompare(left.createdAtIso)
    })
  })
  const totalStake = computed(() => {
    return bets.value.reduce((sum, bet) => {
      return sum + bet.amount
    }, 0)
  })
  const totalPayout = computed(() => {
    return bets.value.reduce((sum, bet) => {
      return sum + bet.payout
    }, 0)
  })
  const availableCredit = computed(() => {
    return initialCredit + totalPayout.value - totalStake.value - reservedCredit.value
  })
  const canPlaceBetAmount = (amount: number): boolean => {
    return amount > 0 && amount <= availableCredit.value
  }

  const reserveBetAmount = (amount: number): boolean => {
    if (!canPlaceBetAmount(amount)) {
      return false
    }

    reservedCredit.value += amount
    return true
  }

  const releaseReservedBetAmount = (amount: number): void => {
    if (amount <= 0) {
      return
    }

    reservedCredit.value = Math.max(0, reservedCredit.value - amount)
  }

  const addResolvedBet = (payload: {
    raceId: string
    horseId: string
    amount: number
    oddsNumerator: number
    oddsDenominator: number
    oddsLabel: string
    winnerHorseId: string | null
  }): boolean => {
    if (!canPlaceBetAmount(payload.amount)) {
      return false
    }

    const won = payload.winnerHorseId !== null && payload.horseId === payload.winnerHorseId
    let payout = 0
    if (won) {
      payout = calculateFixedPayout(payload.amount, payload.oddsNumerator, payload.oddsDenominator)
    }
    const nextEntry: BetEntry = {
      id: createBetId(),
      raceId: payload.raceId,
      horseId: payload.horseId,
      amount: payload.amount,
      oddsNumerator: payload.oddsNumerator,
      oddsDenominator: payload.oddsDenominator,
      oddsLabel: payload.oddsLabel,
      winnerHorseId: payload.winnerHorseId,
      won,
      payout,
      createdAtIso: new Date().toISOString(),
    }

    bets.value = [nextEntry, ...bets.value].slice(0, 500)
    saveBetsToStorage(bets.value)
    return true
  }

  return {
    bets,
    orderedBets,
    totalStake,
    totalPayout,
    availableCredit,
    canPlaceBetAmount,
    reserveBetAmount,
    releaseReservedBetAmount,
    addResolvedBet,
  }
})
