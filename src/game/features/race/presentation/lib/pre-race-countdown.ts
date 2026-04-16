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
  return createCountdownActions({
    preRaceCountdownValue,
    preRaceCountdownLabel,
    preRaceCountdownTimerId,
    countdownRunId,
  })
}

const createCountdownActions = ({
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
  const stopPreRaceCountdown = createStopPreRaceCountdown({
    preRaceCountdownValue,
    preRaceCountdownLabel,
    preRaceCountdownTimerId,
    countdownRunId,
  })
  const waitMs = createWaitMs({ preRaceCountdownTimerId })
  const playPreRaceCountdown = createPlayPreRaceCountdown({
    stopPreRaceCountdown,
    countdownRunId,
    preRaceCountdownValue,
    preRaceCountdownLabel,
    waitMs,
  })

  return { stopPreRaceCountdown, playPreRaceCountdown }
}

const createStopPreRaceCountdown = ({
  preRaceCountdownValue,
  preRaceCountdownLabel,
  preRaceCountdownTimerId,
  countdownRunId,
}: {
  preRaceCountdownValue: Ref<number | null>
  preRaceCountdownLabel: Ref<string>
  preRaceCountdownTimerId: Ref<number | null>
  countdownRunId: Ref<number>
}): (() => void) => {
  return (): void => {
    countdownRunId.value += 1
    if (preRaceCountdownTimerId.value !== null) {
      window.clearTimeout(preRaceCountdownTimerId.value)
      preRaceCountdownTimerId.value = null
    }
    preRaceCountdownValue.value = null
    preRaceCountdownLabel.value = ''
  }
}

const createWaitMs = ({
  preRaceCountdownTimerId,
}: {
  preRaceCountdownTimerId: Ref<number | null>
}): ((ms: number) => Promise<void>) => {
  return async (ms: number): Promise<void> => {
    await new Promise<void>((resolve) => {
      preRaceCountdownTimerId.value = window.setTimeout(() => {
        preRaceCountdownTimerId.value = null
        resolve()
      }, ms)
    })
  }
}

const createPlayPreRaceCountdown = ({
  stopPreRaceCountdown,
  countdownRunId,
  preRaceCountdownValue,
  preRaceCountdownLabel,
  waitMs,
}: {
  stopPreRaceCountdown: () => void
  countdownRunId: Ref<number>
  preRaceCountdownValue: Ref<number | null>
  preRaceCountdownLabel: Ref<string>
  waitMs: (ms: number) => Promise<void>
}): (() => Promise<void>) => {
  const runState = createPlayCountdownState({
    countdownRunId,
    preRaceCountdownValue,
    preRaceCountdownLabel,
    waitMs,
  })

  return createPlayPreRaceCountdownRunner({
    stopPreRaceCountdown,
    preRaceCountdownValue,
    preRaceCountdownLabel,
    waitMs,
    runState,
  })
}

const createPlayCountdownState = ({
  countdownRunId,
  preRaceCountdownValue,
  preRaceCountdownLabel,
  waitMs,
}: {
  countdownRunId: Ref<number>
  preRaceCountdownValue: Ref<number | null>
  preRaceCountdownLabel: Ref<string>
  waitMs: (ms: number) => Promise<void>
}) => {
  const runCountdownNumbers = createRunCountdownNumbers({
    countdownRunId,
    preRaceCountdownValue,
    preRaceCountdownLabel,
    waitMs,
  })
  const runGuards = createCountdownRunGuards(countdownRunId)

  return {
    runCountdownNumbers,
    runGuards,
    countdownRunId,
  }
}

const createPlayPreRaceCountdownRunner = ({
  stopPreRaceCountdown,
  preRaceCountdownValue,
  preRaceCountdownLabel,
  waitMs,
  runState,
}: {
  stopPreRaceCountdown: () => void
  preRaceCountdownValue: Ref<number | null>
  preRaceCountdownLabel: Ref<string>
  waitMs: (ms: number) => Promise<void>
  runState: {
    runCountdownNumbers: (runId: number) => Promise<boolean>
    runGuards: { canContinueRun: (runId: number) => boolean }
    countdownRunId: Ref<number>
  }
}): (() => Promise<void>) => {
  return async (): Promise<void> => {
    stopPreRaceCountdown()
    const runId = resolveCountdownRunId(runState.countdownRunId)

    if (await wasCountdownCancelledDuringNumbers({ runCountdownNumbers: runState.runCountdownNumbers, runId })) {
      return
    }

    if (!runState.runGuards.canContinueRun(runId)) {
      return
    }

    await playRaceLabelPhase({
      preRaceCountdownValue,
      preRaceCountdownLabel,
      waitMs,
    })

    if (!runState.runGuards.canContinueRun(runId)) {
      return
    }

    clearCountdownDisplay({
      preRaceCountdownValue,
      preRaceCountdownLabel,
    })
  }
}

const resolveCountdownRunId = (countdownRunId: Ref<number>): number => {
  return countdownRunId.value
}

const createCountdownRunGuards = (
  countdownRunId: Ref<number>,
): {
  canContinueRun: (runId: number) => boolean
} => {
  return {
    canContinueRun: createCanContinueRun(countdownRunId),
  }
}

const createCanContinueRun = (
  countdownRunId: Ref<number>,
): ((runId: number) => boolean) => {
  return (runId: number): boolean => {
    return !isCountdownRunInvalid({ countdownRunId, runId })
  }
}

const playRaceLabelPhase = async ({
  preRaceCountdownValue,
  preRaceCountdownLabel,
  waitMs,
}: {
  preRaceCountdownValue: Ref<number | null>
  preRaceCountdownLabel: Ref<string>
  waitMs: (ms: number) => Promise<void>
}): Promise<void> => {
  preRaceCountdownValue.value = 0
  preRaceCountdownLabel.value = 'RACE'
  await waitMs(1500)
}

const clearCountdownDisplay = ({
  preRaceCountdownValue,
  preRaceCountdownLabel,
}: {
  preRaceCountdownValue: Ref<number | null>
  preRaceCountdownLabel: Ref<string>
}): void => {
  preRaceCountdownValue.value = null
  preRaceCountdownLabel.value = ''
}

const wasCountdownCancelledDuringNumbers = async ({
  runCountdownNumbers,
  runId,
}: {
  runCountdownNumbers: (runId: number) => Promise<boolean>
  runId: number
}): Promise<boolean> => {
  return runCountdownNumbers(runId)
}

const isCountdownRunInvalid = ({
  countdownRunId,
  runId,
}: {
  countdownRunId: Ref<number>
  runId: number
}): boolean => {
  return runId !== countdownRunId.value
}

const createRunCountdownNumbers = ({
  countdownRunId,
  preRaceCountdownValue,
  preRaceCountdownLabel,
  waitMs,
}: {
  countdownRunId: Ref<number>
  preRaceCountdownValue: Ref<number | null>
  preRaceCountdownLabel: Ref<string>
  waitMs: (ms: number) => Promise<void>
}): ((runId: number) => Promise<boolean>) => {
  return async (runId: number): Promise<boolean> => {
    for (let value = 5; value >= 1; value -= 1) {
      if (runId !== countdownRunId.value) {
        return true
      }
      preRaceCountdownValue.value = value
      preRaceCountdownLabel.value = ''
      await waitMs(1000)
    }

    return false
  }
}
