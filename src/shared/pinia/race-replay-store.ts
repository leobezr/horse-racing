import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ReplayRequest } from '../types/replay-request'

export const useRaceReplayStore = defineStore('race-replay', () => {
  const replayRequest = ref<ReplayRequest | null>(null)

  const setReplayRequest = (payload: ReplayRequest): void => {
    replayRequest.value = {
      seedText: payload.seedText,
      selectedHorseId: payload.selectedHorseId,
    }
  }

  const consumeReplayRequest = (): ReplayRequest | null => {
    const current = replayRequest.value
    replayRequest.value = null
    return current
  }

  return {
    replayRequest,
    setReplayRequest,
    consumeReplayRequest,
  }
})
