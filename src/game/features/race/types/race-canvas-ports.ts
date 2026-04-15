import type { ReplayRequest } from '../../../../shared/types/replay-request'

export type ProfileBetsStorePort = {
  availableCredit: number
  canPlaceBetAmount: (amount: number) => boolean
  reserveBetAmount: (amount: number) => boolean
  releaseReservedBetAmount: (amount: number) => void
  addResolvedBet: (payload: {
    raceId: string
    horseId: string
    amount: number
    oddsNumerator: number
    oddsDenominator: number
    oddsLabel: string
    winnerHorseId: string | null
  }) => boolean
}

export type RaceHistoryStorePort = {
  addRaceEntry: (payload: {
    seedText: string
    selectedHorseId: string
    winnerHorseId: string | null
  }) => { id: string }
}

export type RaceReplayStorePort = {
  consumeReplayRequest: () => ReplayRequest | null
  setReplayRequest: (payload: ReplayRequest) => void
}

export type RaceCanvasPorts = {
  profileBetsStore: ProfileBetsStorePort
  raceHistoryStore: RaceHistoryStorePort
}
