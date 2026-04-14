import type { ReplayRequest } from '../../../../shared/types/replay-request'
import type { createRaceSession } from '../application/race-session-service'

export type BuildRaceSessionInput = {
  selectedHorseIdOverride?: string
  selectedHorseId: string | null
  stakeAmount: number
  canPlaceBetAmount: (amount: number) => boolean
  poolSeed: string
  poolHorseIds: string[]
  consumeReplayRequest: () => ReplayRequest | null
}

export type BuildRaceSessionOutput = {
  selectedHorseId: string
  raceSession: Awaited<ReturnType<typeof createRaceSession>>
}
