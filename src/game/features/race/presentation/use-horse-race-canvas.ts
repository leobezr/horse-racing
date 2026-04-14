import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { gameConfig } from '../../../../config/game.config'
import { colorTokens } from '../../../../shared/theme/color-tokens'
import type { HorseOption, LiveHorseProgress, LiveRaceRound, RaceSession } from '../types/horse-race'
import type { ReplayRequest } from '../../../../shared/types/replay-request'
import type { ProfileBetsStorePort, RaceHistoryStorePort, RaceReplayStorePort } from '../types/race-canvas-ports'
import { createHiddenSeed } from '../application/race-seed-service'
import { createRacePoolPreview, createRaceSession } from '../application/race-session-service'
import { horseAssetConfig } from '../infrastructure/horse-assets'

export const useHorseRaceCanvas = ({
  profileBetsStore,
  raceHistoryStore,
  raceReplayStore,
}: {
  profileBetsStore: ProfileBetsStorePort
  raceHistoryStore: RaceHistoryStorePort
  raceReplayStore: RaceReplayStorePort
}) => {

  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const isLoading = ref<boolean>(false)
  const selectedHorseId = ref<string | null>(null)
  const stakeAmount = ref<number>(0)
  const raceSession = ref<RaceSession | null>(null)
  const poolSeed = ref<string>(createHiddenSeed())
  const previewLoaded = ref<boolean>(false)
  const frameIndex = ref<number>(0)
  const animationFrameId = ref<number | null>(null)
  const startEpochMs = ref<number>(0)
  const isRaceConcluded = ref<boolean>(false)
  const preRaceCountdownValue = ref<number | null>(null)
  const preRaceCountdownLabel = ref<string>('')
  const preRaceCountdownTimerId = ref<number | null>(null)
  const countdownRunId = ref<number>(0)
  const liveRaceRound = ref<LiveRaceRound | null>(null)
  const liveHorseProgress = ref<LiveHorseProgress[]>([])

  const previewHorses = ref<HorseOption[]>([])
  const previewRenderSheets = ref<Record<string, HTMLCanvasElement[]>>({})
  const chipValues = gameConfig.betting.chipValues

  const poolHorses = computed<HorseOption[]>(() => previewHorses.value)
  const renderSheets = computed(() => previewRenderSheets.value)
  const showPreRaceCountdown = computed<boolean>(() => preRaceCountdownValue.value !== null)

  const statusMessage = computed<string>(() => {
    if (!raceSession.value) {
      if (selectedHorseId.value === null) {
        return 'Click New Race and pick a horse from the modal.'
      }

      if (stakeAmount.value < 1) {
        return 'Pick a chip amount before starting a race.'
      }

      if (!profileBetsStore.canPlaceBetAmount(stakeAmount.value)) {
        return `Not enough credit for this chip. Available: ${profileBetsStore.availableCredit}.`
      }

      return 'Ready to start. Click New Race.'
    }

    if (showPreRaceCountdown.value) {
      return 'Race countdown in progress.'
    }

    if (!isRaceConcluded.value) {
      const round = liveRaceRound.value?.roundNumber ?? 1
      const secondsRemaining = liveRaceRound.value?.roundSecondsRemaining ?? gameConfig.rounds.secondsPerRound
      return `Round ${round}/${gameConfig.rounds.count} in progress (${secondsRemaining}s left).`
    }

    const playedRounds = raceSession.value.race.roundSummaries.length
    if (playedRounds < gameConfig.rounds.count) {
      return `Race in progress: round ${playedRounds}/${gameConfig.rounds.count}.`
    }

    const winner = raceSession.value.horses.find((horse) => horse.id === raceSession.value?.race.winnerId)
    if (!winner) {
      return 'Race completed with no winner.'
    }

    return `Winner is ${winner.name} after ${gameConfig.rounds.count} rounds.`
  })

  const stopAnimation = (): void => {
    if (animationFrameId.value !== null) {
      window.cancelAnimationFrame(animationFrameId.value)
      animationFrameId.value = null
    }
  }

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

  const drawTrackBackground = (context: CanvasRenderingContext2D): void => {
    const finishX = gameConfig.track.width - gameConfig.track.finishLineOffset
    context.fillStyle = colorTokens.track.base
    context.fillRect(0, 0, gameConfig.track.width, gameConfig.track.height)

    context.fillStyle = colorTokens.track.lane
    context.fillRect(
      gameConfig.track.lanePaddingX,
      gameConfig.track.laneStartY - 20,
      gameConfig.track.width - gameConfig.track.lanePaddingX * 2,
      gameConfig.track.height - gameConfig.track.laneStartY,
    )

    context.strokeStyle = colorTokens.track.line
    context.lineWidth = 2
    const laneHeight = Math.floor((gameConfig.track.height - gameConfig.track.laneStartY - 80) / gameConfig.raceHorseCount)
    for (let index = 0; index <= gameConfig.raceHorseCount; index += 1) {
      const y = gameConfig.track.laneStartY + laneHeight * index
      context.beginPath()
      context.moveTo(gameConfig.track.lanePaddingX, y)
      context.lineTo(gameConfig.track.width - gameConfig.track.lanePaddingX, y)
      context.stroke()
    }

    context.fillStyle = colorTokens.track.finish
    context.fillRect(finishX, gameConfig.track.laneStartY - 20, 7, gameConfig.track.height)
  }

  const renderEmptyTrack = (): void => {
    if (!canvasRef.value) {
      return
    }

    const context = canvasRef.value.getContext('2d')
    if (!context) {
      return
    }

    drawTrackBackground(context)
  }

  const getTickIndex = (elapsedMs: number, snapshotsCount: number): number => {
    const tickIndex = Math.floor(elapsedMs / gameConfig.animation.tickMs)
    return Math.min(Math.max(0, tickIndex), Math.max(0, snapshotsCount - 1))
  }

  const getHorseFrameIndex = (elapsedMs: number, horse: HorseOption): number => {
    if (horse.frameSequence.length === 0) {
      return horseAssetConfig.idleFrameIndex
    }
    const step = Math.floor(elapsedMs / horseAssetConfig.frameIntervalMs)
    const sequenceIndex = step % horse.frameSequence.length
    return horse.frameSequence[sequenceIndex]
  }

  const renderCurrentFrame = (timestampMs: number): void => {
    const session = raceSession.value
    if (!session || !canvasRef.value) {
      return
    }

    const context = canvasRef.value.getContext('2d')
    if (!context) {
      return
    }

    if (startEpochMs.value === 0) {
      startEpochMs.value = timestampMs
    }

    const elapsedMs = timestampMs - startEpochMs.value
    const tickIndex = getTickIndex(elapsedMs, session.race.raceSnapshots.length)
    const snapshot = session.race.raceSnapshots[tickIndex] ?? []
    const snapshotByHorseId = new Map(snapshot.map((entry) => [entry.id, entry.distance]))

    const ticksPerRound = Math.max(1, Math.floor((gameConfig.rounds.secondsPerRound * 1000) / gameConfig.animation.tickMs))
    const currentRoundNumber = Math.min(gameConfig.rounds.count, Math.floor(tickIndex / ticksPerRound) + 1)
    const roundTickProgress = tickIndex % ticksPerRound
    const roundTicksRemaining = Math.max(0, ticksPerRound - roundTickProgress)
    const roundSecondsRemaining = Math.max(0, Math.ceil((roundTicksRemaining * gameConfig.animation.tickMs) / 1000))
    liveRaceRound.value = {
      roundNumber: currentRoundNumber,
      roundSecondsRemaining,
    }

    const finishDistance = gameConfig.track.width - gameConfig.track.finishLineOffset
    const finishX = gameConfig.track.width - gameConfig.track.finishLineOffset
    liveHorseProgress.value = session.horses.map((horse) => {
      const distance = Math.min(finishDistance, snapshotByHorseId.get(horse.id) ?? 0)
      const distanceToFinish = Math.max(0, finishDistance - distance)
      const tickCount = Math.max(1, tickIndex + 1)
      const averageSpeed = distance / tickCount
      const estimatedTicksToFinish = averageSpeed > 0 ? distanceToFinish / averageSpeed : Number.POSITIVE_INFINITY
      const estimatedSecondsToFinish =
        Number.isFinite(estimatedTicksToFinish) && distanceToFinish > 0
          ? Number.parseFloat(((estimatedTicksToFinish * gameConfig.animation.tickMs) / 1000).toFixed(2))
          : null

      return {
        id: horse.id,
        name: horse.name,
        laneNumber: horse.laneNumber,
        distance,
        distanceToFinish,
        estimatedSecondsToFinish,
        finishedAtTick: horse.metadata.finishedAtTick,
      }
    })

    liveHorseProgress.value.sort((left, right) => {
      if (right.distance !== left.distance) {
        return right.distance - left.distance
      }

      return left.laneNumber - right.laneNumber
    })

    drawTrackBackground(context)

    for (const lane of session.lanes) {
      const laneHorse = session.horses.find((entry) => entry.laneNumber === lane.laneNumber)
      if (!laneHorse) {
        continue
      }

      const distance = snapshotByHorseId.get(laneHorse.id) ?? 0
      const clampedDistance = Math.min(finishDistance, Math.max(0, distance))
      const finishedAtTick = laneHorse.metadata.finishedAtTick
      const horseFinished = finishedAtTick !== null && tickIndex >= finishedAtTick
      const frameToDraw =
        horseFinished || tickIndex === session.race.raceSnapshots.length - 1
          ? horseAssetConfig.idleFrameIndex
          : getHorseFrameIndex(elapsedMs, laneHorse)

      const sheet = session.renderSheets[laneHorse.id]
      const frameCanvas = sheet?.[frameToDraw]
      const frameWidth = frameCanvas?.width ?? 0
      const frameHeight = frameCanvas?.height ?? 0
      const maxHorseX = Math.max(gameConfig.track.lanePaddingX, finishX - frameWidth)
      const x = Math.min(maxHorseX, gameConfig.track.lanePaddingX + clampedDistance)
      const laneCenterY = lane.y + Math.floor(lane.height / 2)
      const y = Math.round(laneCenterY - frameHeight / 2)

      if (frameCanvas) {
        context.drawImage(frameCanvas, x, y)
      }

      context.fillStyle = laneHorse.id === session.selectedHorseId ? colorTokens.track.laneTextSelected : colorTokens.track.laneTextDefault
      context.font = '12px Trebuchet MS'
      context.fillText(String(laneHorse.laneNumber), gameConfig.track.lanePaddingX - 28, laneCenterY + 4)
    }

    frameIndex.value = tickIndex
    const hasNextFrame = tickIndex < session.race.raceSnapshots.length - 1
    if (hasNextFrame) {
      animationFrameId.value = window.requestAnimationFrame(renderCurrentFrame)
    } else {
      isRaceConcluded.value = true
    }
  }

  const buildSession = async (selectedHorseIdOverride?: string): Promise<void> => {
    const selectedHorseInput = selectedHorseIdOverride ?? selectedHorseId.value
    if (selectedHorseInput === null) {
      return
    }

    if (stakeAmount.value < 1 || !profileBetsStore.canPlaceBetAmount(stakeAmount.value)) {
      return
    }

    isLoading.value = true
    stopAnimation()
    stopPreRaceCountdown()
    startEpochMs.value = 0
    frameIndex.value = 0
    isRaceConcluded.value = false
    selectedHorseId.value = selectedHorseInput
    liveRaceRound.value = null
    liveHorseProgress.value = []

    try {
      const replayRequest: ReplayRequest | null = raceReplayStore.consumeReplayRequest()
      const currentSeed = replayRequest?.seedText ?? poolSeed.value
      const fallbackHorseId = poolHorses.value[0]?.id ?? null
      const selectedHorseForRace = selectedHorseIdOverride ?? replayRequest?.selectedHorseId ?? selectedHorseId.value ?? fallbackHorseId

      if (!selectedHorseForRace) {
        return
      }

      const nextSession = await createRaceSession({
        seedInput: currentSeed,
        selectedHorseId: selectedHorseForRace,
      })

      raceSession.value = nextSession
      selectedHorseId.value = nextSession.selectedHorseId
      const selectedHorse = nextSession.horses.find((horse) => horse.id === nextSession.selectedHorseId)

      const raceEntry = raceHistoryStore.addRaceEntry({
        seedText: nextSession.seedText,
        selectedHorseId: nextSession.selectedHorseId,
        winnerHorseId: nextSession.race.winnerId,
      })

      profileBetsStore.addResolvedBet({
        raceId: raceEntry.id,
        horseId: nextSession.selectedHorseId,
        amount: Math.floor(stakeAmount.value),
        oddsNumerator: selectedHorse?.odds.numerator ?? 1,
        oddsDenominator: selectedHorse?.odds.denominator ?? 1,
        oddsLabel: selectedHorse?.odds.label ?? '1/1',
        winnerHorseId: nextSession.race.winnerId,
      })

      poolSeed.value = createHiddenSeed()
      const nextPreview = await createRacePoolPreview({ seedInput: poolSeed.value })
      previewHorses.value = nextPreview.horses
      previewRenderSheets.value = nextPreview.renderSheets
      previewLoaded.value = true
      await nextTick()
      renderEmptyTrack()
      await playPreRaceCountdown()
      animationFrameId.value = window.requestAnimationFrame(renderCurrentFrame)
    } finally {
      isLoading.value = false
    }
  }

  onBeforeUnmount(() => {
    stopAnimation()
    stopPreRaceCountdown()
  })

  const initializePool = async (): Promise<void> => {
    if (previewLoaded.value) {
      return
    }

    const replayRequest: ReplayRequest | null = raceReplayStore.consumeReplayRequest()
    if (replayRequest) {
      poolSeed.value = replayRequest.seedText
      selectedHorseId.value = replayRequest.selectedHorseId
      raceReplayStore.setReplayRequest(replayRequest)
    }

    const preview = await createRacePoolPreview({ seedInput: poolSeed.value })
    previewHorses.value = preview.horses
    previewRenderSheets.value = preview.renderSheets
    previewLoaded.value = true
  }

  return {
    canvasRef,
    isLoading,
    selectedHorseId,
    selectHorse: (horseId: string): void => {
      selectedHorseId.value = horseId
    },
    availableCredit: profileBetsStore.availableCredit,
    stakeAmount,
    chipValues,
    selectChipAmount: (amount: number): void => {
      stakeAmount.value = amount
    },
    canAffordChip: (amount: number): boolean => profileBetsStore.canPlaceBetAmount(amount),
    canStartRace: computed(
      () =>
        poolHorses.value.length > 0 &&
        stakeAmount.value >= 1 &&
        profileBetsStore.canPlaceBetAmount(stakeAmount.value),
    ),
    horseOptions: poolHorses,
    renderSheets,
    raceRoundSummaries: computed(() => (isRaceConcluded.value ? raceSession.value?.race.roundSummaries ?? [] : [])),
    liveRaceRound,
    liveHorseProgress,
    showPreRaceCountdown,
    preRaceCountdownValue,
    preRaceCountdownLabel,
    statusMessage,
    buildSession,
    initializePool,
    renderEmptyTrack,
    gameConfig,
  }
}
