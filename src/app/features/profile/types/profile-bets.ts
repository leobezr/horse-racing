export type BetEntry = {
  id: string
  raceId: string
  horseId: string
  amount: number
  oddsNumerator: number
  oddsDenominator: number
  oddsLabel: string
  winnerHorseId: string | null
  won: boolean
  payout: number
  createdAtIso: string
}

export type ProfileBetsState = {
  bets: BetEntry[]
}
