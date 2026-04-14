import type { RaceHistoryEntry } from '../types/race-history'
import { raceHistoryStorageConfig } from '../config/storage.config'

const isRaceHistoryEntry = (candidate: unknown): candidate is RaceHistoryEntry => {
  if (typeof candidate !== 'object' || candidate === null) {
    return false
  }

  const value = candidate as Record<string, unknown>
  return (
    typeof value.id === 'string' &&
    typeof value.seedText === 'string' &&
    typeof value.selectedHorseId === 'string' &&
    (typeof value.winnerHorseId === 'string' || value.winnerHorseId === null) &&
    typeof value.createdAtIso === 'string'
  )
}

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null
  }
  return window.localStorage
}

export const loadRaceHistoryFromStorage = (): RaceHistoryEntry[] => {
  const storage = getStorage()
  if (!storage) {
    return []
  }

  const rawValue = storage.getItem(raceHistoryStorageConfig.storageKey)
  if (!rawValue) {
    return []
  }

  try {
    const parsed = JSON.parse(rawValue)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(isRaceHistoryEntry)
  } catch {
    return []
  }
}

export const saveRaceHistoryToStorage = (entries: RaceHistoryEntry[]): void => {
  const storage = getStorage()
  if (!storage) {
    return
  }

  storage.setItem(raceHistoryStorageConfig.storageKey, JSON.stringify(entries))
}
