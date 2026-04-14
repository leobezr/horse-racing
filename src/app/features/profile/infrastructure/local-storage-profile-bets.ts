import { profileBetsStorageConfig } from '../config/storage.config'
import type { BetEntry } from '../types/profile-bets'

/**
 * Type guard that validates whether a parsed storage value is a BetEntry.
 */
const isBetEntry = (candidate: unknown): candidate is BetEntry => {
  if (typeof candidate !== 'object' || candidate === null) {
    return false
  }

  const value = candidate as Record<string, unknown>
  return (
    typeof value.id === 'string' &&
    typeof value.raceId === 'string' &&
    typeof value.horseId === 'string' &&
    typeof value.amount === 'number' &&
    (typeof value.winnerHorseId === 'string' || value.winnerHorseId === null) &&
    typeof value.won === 'boolean' &&
    typeof value.payout === 'number' &&
    typeof value.createdAtIso === 'string'
  )
}

/**
 * Returns localStorage when running in browser, otherwise null.
 */
const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null
  }
  return window.localStorage
}

/**
 * Loads and validates persisted bet entries from localStorage.
 * Returns an empty list when storage is unavailable or payload is invalid.
 */
export const loadBetsFromStorage = (): BetEntry[] => {
  const storage = getStorage()
  if (!storage) {
    return []
  }

  const rawValue = storage.getItem(profileBetsStorageConfig.storageKey)
  if (!rawValue) {
    return []
  }

  try {
    const parsed = JSON.parse(rawValue)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(isBetEntry)
  } catch {
    return []
  }
}

/**
 * Persists bet entries into localStorage.
 * No-ops when storage is unavailable.
 */
export const saveBetsToStorage = (entries: BetEntry[]): void => {
  const storage = getStorage()
  if (!storage) {
    return
  }

  storage.setItem(profileBetsStorageConfig.storageKey, JSON.stringify(entries))
}
