import type { Ref } from 'vue'

/**
 * Creates a cancel-safe pre-race countdown controller.
 *
 * The controller writes countdown state through Vue refs and supports restarting
 * without leaking timers by invalidating prior runs.
 */
export const createPreRaceCountdownController = ({
  preRaceCountdownValue,
  preRaceCountdownLabel,
  preRaceCountdownTimerId,
  countdownRunId,
}: {
  preRaceCountdownValue: Ref<number | null>
  preRaceCountdownLabel: Ref<string>
  preRaceCountdownTimerId: Ref<number | null>
  countdownRunId: Ref<number>
}): {
  stopPreRaceCountdown: () => void
  playPreRaceCountdown: () => Promise<void>
} => {
  const stopPreRaceCountdown = (): void => {
    countdownRunId.value += 1
    if (preRaceCountdownTimerId.value !== null) {
      window.clearTimeout(preRaceCountdownTimerId.value)
      preRaceCountdownTimerId.value = null
    }
    preRaceCountdownValue.value = null
    preRaceCountdownLabel.value = ''
  }

  const waitMs = async (ms: number): Promise<void> => {
    await new Promise<void>((resolve) => {
      preRaceCountdownTimerId.value = window.setTimeout(() => {
        preRaceCountdownTimerId.value = null
        resolve()
      }, ms)
    })
  }

  const playPreRaceCountdown = async (): Promise<void> => {
    stopPreRaceCountdown()
    const runId = countdownRunId.value

    for (let value = 5; value >= 1; value -= 1) {
      if (runId !== countdownRunId.value) {
        return
      }
      preRaceCountdownValue.value = value
      preRaceCountdownLabel.value = ''
      await waitMs(1000)
    }

    if (runId !== countdownRunId.value) {
      return
    }

    preRaceCountdownValue.value = 0
    preRaceCountdownLabel.value = 'RACE'
    await waitMs(1500)

    if (runId !== countdownRunId.value) {
      return
    }

    preRaceCountdownValue.value = null
    preRaceCountdownLabel.value = ''
  }

  return {
    stopPreRaceCountdown,
    playPreRaceCountdown,
  }
}
