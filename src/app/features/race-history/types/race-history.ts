export type RaceHistoryEntry = {
  id: string
  seedText: string
  selectedHorseId: string
  winnerHorseId: string | null
  createdAtIso: string
}

export type RaceHistoryState = {
  historyEntries: RaceHistoryEntry[]
}
