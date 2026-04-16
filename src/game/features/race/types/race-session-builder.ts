import type { ReplayRequest } from '../../../../shared/types/replay-request'
import type { createRaceSession } from '../application/race-session-service'
import type { HorseOption } from './horse-race'

export type BuildRaceSessionInput = {
  selectedHorseIdsOverride?: string[]
  selectedHorseIdOverride?: string
  selectedHorseId: string | null
  selectedHorseIds: string[]
  stakeAmount: number
  canPlaceBetAmount: (amount: number) => boolean
  poolSeed: string
  poolHorseIds: string[]
  horsePool: HorseOption[]
  previousRaceHorseIds: string[]
  consumeReplayRequest: () => ReplayRequest | null
}

export type BuildRaceSessionOutput = {
  selectedHorseId: string
  raceSession: Awaited<ReturnType<typeof createRaceSession>>
}
