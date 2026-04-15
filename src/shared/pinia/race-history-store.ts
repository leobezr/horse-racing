import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { loadRaceHistoryFromStorage, saveRaceHistoryToStorage } from '../../app/features/race-history/infrastructure/local-storage-race-history'
import type { RaceHistoryEntry } from '../../app/features/race-history/types/race-history'

const createEntryId = (): string => {return `race-${Date.now()}-${Math.floor(Math.random() * 1000000)}`}

export const useRaceHistoryStore = defineStore('race-history', () => {
  const historyEntries = ref<RaceHistoryEntry[]>(loadRaceHistoryFromStorage())

  const orderedEntries = computed(() => {return [...historyEntries.value].sort((left, right) => {return right.createdAtIso.localeCompare(left.createdAtIso)})})

  const addRaceEntry = (payload: {
    seedText: string
    selectedHorseId: string
    winnerHorseId: string | null
  }): RaceHistoryEntry => {
    const nextEntry: RaceHistoryEntry = {
      id: createEntryId(),
      seedText: payload.seedText,
      selectedHorseId: payload.selectedHorseId,
      winnerHorseId: payload.winnerHorseId,
      createdAtIso: new Date().toISOString(),
    }

    historyEntries.value = [nextEntry, ...historyEntries.value].slice(0, 200)
    saveRaceHistoryToStorage(historyEntries.value)
    return nextEntry
  }

  return {
    historyEntries,
    orderedEntries,
    addRaceEntry,
  }
})
