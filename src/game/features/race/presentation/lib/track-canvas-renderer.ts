import { gameConfig } from '../../../../../config/game.config'
import { colorTokens } from '../../../../../shared/theme/color-tokens'
import { horseAssetConfig } from '../../infrastructure/horse-assets'
import type { FrameVisibleBounds } from '../../types/frame-visible-bounds'
import type { HorseOption, RaceSession } from '../../types/horse-race'
import { getRoundFinishDistanceForTick } from './round-distance'

const podiumLaneColors = [
  colorTokens.track.podiumGold,
  colorTokens.track.podiumSilver,
  colorTokens.track.podiumBronze,
] as const

export const getPodiumLaneMap = ({
  session,
  snapshotByHorseId,
  tickIndex,
  raceFinishDistance,
}: {
  session: RaceSession
  snapshotByHorseId: Map<string, number>
  tickIndex: number
  raceFinishDistance: number
}): Map<number, number> => {
  const roundTickRange = resolveRoundTickRange({
    session,
    tickIndex,
  })
  const finishTickByHorseId = resolveFinishTickByHorseId({
    session,
    raceFinishDistance,
    roundStartTick: roundTickRange.roundStartTick,
    roundEndTick: roundTickRange.roundEndTick,
  })
  const orderedByDistance = resolveOrderedHorsesByDistance({
    session,
    snapshotByHorseId,
    finishTickByHorseId,
  })
  return createPodiumLaneMapFromOrderedHorses(orderedByDistance)
}

const resolveRoundTickRange = ({
  session,
  tickIndex,
}: {
  session: RaceSession
  tickIndex: number
}): {
  roundStartTick: number
  roundEndTick: number
} => {
  const activeRoundSummary = session.race.roundSummaries.find((roundSummary) => {
    return tickIndex >= roundSummary.startTick && tickIndex <= roundSummary.endTick
  })

  return {
    roundStartTick: activeRoundSummary?.startTick ?? 0,
    roundEndTick: Math.min(tickIndex, activeRoundSummary?.endTick ?? tickIndex),
  }
}

const resolveFinishTickByHorseId = ({
  session,
  raceFinishDistance,
  roundStartTick,
  roundEndTick,
}: {
  session: RaceSession
  raceFinishDistance: number
  roundStartTick: number
  roundEndTick: number
}): Map<string, number> => {
  const finishTickByHorseId = new Map<string, number>()
  for (const horse of session.horses) {
    const finishTick = resolveHorseFinishTick({
      horseId: horse.id,
      raceSnapshots: session.race.raceSnapshots,
      raceFinishDistance,
      roundStartTick,
      roundEndTick,
    })

    if (finishTick !== null) {
      finishTickByHorseId.set(horse.id, finishTick)
    }
  }

  return finishTickByHorseId
}

const resolveHorseFinishTick = ({
  horseId,
  raceSnapshots,
  raceFinishDistance,
  roundStartTick,
  roundEndTick,
}: {
  horseId: string
  raceSnapshots: RaceSession['race']['raceSnapshots']
  raceFinishDistance: number
  roundStartTick: number
  roundEndTick: number
}): number | null => {
  for (let snapshotIndex = roundStartTick; snapshotIndex <= roundEndTick; snapshotIndex += 1) {
    const snapshot = raceSnapshots[snapshotIndex] ?? []
    const horseSnapshot = snapshot.find((entry) => {
      return entry.id === horseId
    })
    const horseDistance = horseSnapshot?.distance ?? 0
    if (horseDistance >= raceFinishDistance) {
      return snapshotIndex
    }
  }

  return null
}

const resolveOrderedHorsesByDistance = ({
  session,
  snapshotByHorseId,
  finishTickByHorseId,
}: {
  session: RaceSession
  snapshotByHorseId: Map<string, number>
  finishTickByHorseId: Map<string, number>
}): HorseOption[] => {
  return [...session.horses].sort((left, right) => {
    const leftDistance = snapshotByHorseId.get(left.id) ?? 0
    const rightDistance = snapshotByHorseId.get(right.id) ?? 0

    if (rightDistance !== leftDistance) {
      return rightDistance - leftDistance
    }

    const leftFinishedAtTick = finishTickByHorseId.get(left.id) ?? Number.MAX_SAFE_INTEGER
    const rightFinishedAtTick = finishTickByHorseId.get(right.id) ?? Number.MAX_SAFE_INTEGER
    if (leftFinishedAtTick !== rightFinishedAtTick) {
      return leftFinishedAtTick - rightFinishedAtTick
    }

    return left.laneNumber - right.laneNumber
  })
}

const createPodiumLaneMapFromOrderedHorses = (
  orderedHorses: HorseOption[],
): Map<number, number> => {
  const podiumLaneMap = new Map<number, number>()
  for (let index = 0; index < Math.min(3, orderedHorses.length); index += 1) {
    const horse = orderedHorses[index]
    podiumLaneMap.set(horse.laneNumber, index + 1)
  }

  return podiumLaneMap
}

const getFinalPodiumLaneMap = (session: RaceSession): Map<number, number> => {
  const orderedByFinish = [...session.horses].sort((left, right) => {
    const leftDistance = left.metadata.finalDistance
    const rightDistance = right.metadata.finalDistance
    if (rightDistance !== leftDistance) {
      return rightDistance - leftDistance
    }

    const leftFinishedAtTick = left.metadata.finishedAtTick ?? Number.MAX_SAFE_INTEGER
    const rightFinishedAtTick = right.metadata.finishedAtTick ?? Number.MAX_SAFE_INTEGER
    if (leftFinishedAtTick !== rightFinishedAtTick) {
      return leftFinishedAtTick - rightFinishedAtTick
    }

    return left.laneNumber - right.laneNumber
  })

  const podiumLaneMap = new Map<number, number>()
  for (let index = 0; index < Math.min(3, orderedByFinish.length); index += 1) {
    const horse = orderedByFinish[index]
    podiumLaneMap.set(horse.laneNumber, index + 1)
  }

  return podiumLaneMap
}

const drawLivePodiumLaneBackground = ({
  context,
  lane,
  podiumRank,
}: {
  context: CanvasRenderingContext2D
  lane: RaceSession['lanes'][number]
  podiumRank: number
}): void => {
  const podiumColor = podiumLaneColors[podiumRank - 1]
  if (!podiumColor) {
    return
  }

  context.save()
  context.globalAlpha = 0.38
  context.fillStyle = podiumColor
  context.fillRect(
    0,
    lane.y + 1,
    gameConfig.track.width,
    Math.max(1, lane.height - 2),
  )
  context.restore()
}

const drawPodiumRankMarker = ({
  context,
  lane,
  podiumRank,
}: {
  context: CanvasRenderingContext2D
  lane: RaceSession['lanes'][number]
  podiumRank: number
}): void => {
  const markerSize = 20
  const markerX = gameConfig.track.lanePaddingX + 6
  const markerY = lane.y + Math.round((lane.height - markerSize) / 2)

  context.fillStyle = colorTokens.track.podiumMarker
  context.fillRect(markerX, markerY, markerSize, markerSize)

  context.fillStyle = colorTokens.track.podiumMarkerText
  context.font = 'bold 12px Trebuchet MS'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(String(podiumRank), markerX + markerSize / 2, markerY + markerSize / 2)
  context.textAlign = 'start'
  context.textBaseline = 'alphabetic'
}

const drawTrackBackground = (context: CanvasRenderingContext2D): void => {
  const finishX = gameConfig.track.width - gameConfig.track.finishLineOffset
  context.fillStyle = colorTokens.track.base
  context.fillRect(0, 0, gameConfig.track.width, gameConfig.track.height)

  context.strokeStyle = colorTokens.track.line
  context.lineWidth = 1

  const laneHeight = Math.max(
    1,
    Math.floor((gameConfig.track.height - gameConfig.track.laneStartY - 15) / gameConfig.raceHorseCount),
  )

  for (let index = 0; index < gameConfig.raceHorseCount; index += 1) {
    const y = gameConfig.track.laneStartY + laneHeight * index
    const laneFillColor = index % 2 === 0 ? colorTokens.track.lane : colorTokens.track.laneAlternate
    context.fillStyle = laneFillColor
    context.fillRect(0, y, gameConfig.track.width, laneHeight)
  }

  for (let index = 0; index <= gameConfig.raceHorseCount; index += 1) {
    const y = gameConfig.track.laneStartY + laneHeight * index
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(gameConfig.track.width, y)
    context.stroke()
  }

  context.fillStyle = colorTokens.track.finish
  context.fillRect(finishX, 0, 8, gameConfig.track.height)
}

const getFinishLineX = (): number => {return gameConfig.track.width - gameConfig.track.finishLineOffset}

const getTrackDrawableDistance = (): number => {return Math.max(1, getFinishLineX())}

const toCanvasDistance = ({
  raceDistance,
  raceFinishDistance,
}: {
  raceDistance: number
  raceFinishDistance: number
}): number => {
  const safeFinishDistance = Math.max(1, raceFinishDistance)
  const clampedRaceDistance = Math.min(safeFinishDistance, Math.max(0, raceDistance))
  const ratio = clampedRaceDistance / safeFinishDistance
  return ratio * getTrackDrawableDistance()
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

const getHorseFrameToDraw = ({
  horse,
  currentDistance,
  raceFinishDistance,
  elapsedMs,
}: {
  horse: HorseOption
  currentDistance: number
  raceFinishDistance: number
  elapsedMs: number
}): number => {
  const horseFinished = currentDistance >= raceFinishDistance

  if (horseFinished) {
    return horseAssetConfig.idleFrameIndex
  }

  return getHorseFrameIndex(elapsedMs, horse)
}

const getFrameVisibleBoundsForCanvas = ({
  frameCanvas,
  getFrameVisibleBounds,
  getFallbackFrameVisibleBounds,
}: {
  frameCanvas: HTMLCanvasElement | undefined
  getFrameVisibleBounds: (frameCanvas: HTMLCanvasElement) => FrameVisibleBounds
  getFallbackFrameVisibleBounds: ({ width, height }: { width: number; height: number }) => FrameVisibleBounds
}): FrameVisibleBounds => {
  const frameWidth = frameCanvas?.width ?? 0
  const frameHeight = frameCanvas?.height ?? 0
  const fallbackBounds = getFallbackFrameVisibleBounds({
    width: frameWidth,
    height: frameHeight,
  })

  if (!frameCanvas) {
    return fallbackBounds
  }

  return getFrameVisibleBounds(frameCanvas)
}

const getHorseRenderPosition = ({
  lane,
  clampedCanvasDistance,
  finishX,
  frameVisibleBounds,
}: {
  lane: RaceSession['lanes'][number]
  clampedCanvasDistance: number
  finishX: number
  frameVisibleBounds: FrameVisibleBounds
}): {
  x: number
  y: number
  laneCenterY: number
} => {
  const maxVisibleHorseX = Math.max(0, finishX)
  const visibleHorseX = Math.min(maxVisibleHorseX, clampedCanvasDistance)
  const alignmentBoxWidth = Math.min(gameConfig.track.horseAlignmentBoxSize, frameVisibleBounds.width)
  const alignmentBoxHeight = Math.min(gameConfig.track.horseAlignmentBoxSize, frameVisibleBounds.height)
  const alignmentLeft = frameVisibleBounds.left + frameVisibleBounds.width - alignmentBoxWidth
  const alignmentTop = frameVisibleBounds.top + frameVisibleBounds.height - alignmentBoxHeight
  const alignmentCenterX = alignmentLeft + alignmentBoxWidth / 2
  const alignmentCenterY = alignmentTop + alignmentBoxHeight / 2
  const x = Math.round(visibleHorseX - alignmentCenterX)
  const laneCenterY = lane.y + Math.floor(lane.height / 2)
  const y = Math.round(laneCenterY - alignmentCenterY)

  return {
    x,
    y,
    laneCenterY,
  }
}

const drawLaneNumber = ({
  context,
  laneNumber,
  laneCenterY,
  isSelectedHorse,
  isBetHorse,
}: {
  context: CanvasRenderingContext2D
  laneNumber: number
  laneCenterY: number
  isSelectedHorse: boolean
  isBetHorse: boolean
}): void => {
  if (isSelectedHorse) {
    context.fillStyle = colorTokens.track.laneTextSelected
  } else {
    context.fillStyle = colorTokens.track.laneTextDefault
  }

  context.font = '12px Trebuchet MS'
  context.textBaseline = 'middle'
  const laneLabel = isBetHorse ? `>> ${laneNumber}` : String(laneNumber)
  context.fillText(laneLabel, 10, laneCenterY)
  context.textBaseline = 'alphabetic'
}

type TrackRendererDependencies = {
  getFrameVisibleBounds: (frameCanvas: HTMLCanvasElement) => FrameVisibleBounds
  getFallbackFrameVisibleBounds: ({ width, height }: { width: number; height: number }) => FrameVisibleBounds
}

type RenderSessionFrameInput = {
  context: CanvasRenderingContext2D
  session: RaceSession
  tickIndex: number
  elapsedMs: number
  snapshotByHorseId: Map<string, number>
  raceFinishDistance: number
  highlightedHorseIds: Set<string>
}

type RenderSessionContext = {
  finishX: number
  horseByLaneNumber: Map<number, HorseOption>
  isRaceFinished: boolean
  activeRoundFinishDistance: number
  livePodiumLaneMap: Map<number, number>
  finalPodiumLaneMap: Map<number, number>
}

type RenderSessionLaneInput = {
  context: CanvasRenderingContext2D
  lane: RaceSession['lanes'][number]
  session: RaceSession
  elapsedMs: number
  snapshotByHorseId: Map<string, number>
  highlightedHorseIds: Set<string>
  renderContext: RenderSessionContext
  getFrameVisibleBounds: (frameCanvas: HTMLCanvasElement) => FrameVisibleBounds
  getFallbackFrameVisibleBounds: ({ width, height }: { width: number; height: number }) => FrameVisibleBounds
}

type ResolveLaneFrameRenderDataInput = {
  lane: RaceSession['lanes'][number]
  laneHorse: HorseOption
  elapsedMs: number
  snapshotByHorseId: Map<string, number>
  activeRoundFinishDistance: number
  finishX: number
  session: RaceSession
  getFrameVisibleBounds: (frameCanvas: HTMLCanvasElement) => FrameVisibleBounds
  getFallbackFrameVisibleBounds: ({ width, height }: { width: number; height: number }) => FrameVisibleBounds
}

type LaneFrameRenderData = {
  frameCanvas: HTMLCanvasElement | undefined
  x: number
  y: number
  laneCenterY: number
}

const createRenderEmptyTrack = (): ((canvas: HTMLCanvasElement | null) => void) => {
  return (canvas: HTMLCanvasElement | null): void => {
    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    drawTrackBackground(context)
  }
}

const createRenderSessionFrame = ({
  getFrameVisibleBounds,
  getFallbackFrameVisibleBounds,
}: TrackRendererDependencies): ((input: RenderSessionFrameInput) => void) => {
  return ({
    context,
    session,
    tickIndex,
    elapsedMs,
    snapshotByHorseId,
    raceFinishDistance,
    highlightedHorseIds,
  }: RenderSessionFrameInput): void => {
    const renderContext = resolveRenderSessionContext({
      session,
      snapshotByHorseId,
      tickIndex,
      raceFinishDistance,
    })

    drawTrackBackground(context)
    renderSessionLanes({
      context,
      session,
      elapsedMs,
      snapshotByHorseId,
      highlightedHorseIds,
      renderContext,
      getFrameVisibleBounds,
      getFallbackFrameVisibleBounds,
    })
  }
}

const resolveRenderSessionContext = ({
  session,
  snapshotByHorseId,
  tickIndex,
  raceFinishDistance,
}: {
  session: RaceSession
  snapshotByHorseId: Map<string, number>
  tickIndex: number
  raceFinishDistance: number
}): RenderSessionContext => {
  const activeRoundFinishDistance = getRoundFinishDistanceForTick({
    tickIndex,
    roundSummaries: session.race.roundSummaries,
    configuredRoundTrackDistances: gameConfig.rounds.trackDistances,
    fallbackFinishDistance: raceFinishDistance,
  })

  return {
    finishX: getFinishLineX(),
    horseByLaneNumber: new Map(session.horses.map((horse) => {return [horse.laneNumber, horse]})),
    isRaceFinished: tickIndex >= Math.max(0, session.race.raceSnapshots.length - 1),
    activeRoundFinishDistance,
    livePodiumLaneMap: getPodiumLaneMap({
      session,
      snapshotByHorseId,
      tickIndex,
      raceFinishDistance: activeRoundFinishDistance,
    }),
    finalPodiumLaneMap: getFinalPodiumLaneMap(session),
  }
}

const renderSessionLanes = ({
  context,
  session,
  elapsedMs,
  snapshotByHorseId,
  highlightedHorseIds,
  renderContext,
  getFrameVisibleBounds,
  getFallbackFrameVisibleBounds,
}: {
  context: CanvasRenderingContext2D
  session: RaceSession
  elapsedMs: number
  snapshotByHorseId: Map<string, number>
  highlightedHorseIds: Set<string>
  renderContext: RenderSessionContext
  getFrameVisibleBounds: (frameCanvas: HTMLCanvasElement) => FrameVisibleBounds
  getFallbackFrameVisibleBounds: ({ width, height }: { width: number; height: number }) => FrameVisibleBounds
}): void => {
  for (const lane of session.lanes) {
    renderSessionLane({
      context,
      lane,
      session,
      elapsedMs,
      snapshotByHorseId,
      highlightedHorseIds,
      renderContext,
      getFrameVisibleBounds,
      getFallbackFrameVisibleBounds,
    })
  }
}

const renderSessionLane = ({
  context,
  lane,
  session,
  elapsedMs,
  snapshotByHorseId,
  highlightedHorseIds,
  renderContext,
  getFrameVisibleBounds,
  getFallbackFrameVisibleBounds,
}: RenderSessionLaneInput): void => {
  drawLivePodiumLaneIfPresent({ context, lane, renderContext })

  const laneHorse = resolveLaneHorse({ lane, renderContext })
  if (!laneHorse) {
    return
  }

  const frameRenderData = resolveLaneFrameRenderData({
    lane,
    laneHorse,
    elapsedMs,
    snapshotByHorseId,
    activeRoundFinishDistance: renderContext.activeRoundFinishDistance,
    finishX: renderContext.finishX,
    session,
    getFrameVisibleBounds,
    getFallbackFrameVisibleBounds,
  })

  renderLaneHorseDetails({
    context,
    lane,
    laneHorse,
    session,
    highlightedHorseIds,
    renderContext,
    frameRenderData,
  })
}

const renderLaneHorseDetails = ({
  context,
  lane,
  laneHorse,
  session,
  highlightedHorseIds,
  renderContext,
  frameRenderData,
}: {
  context: CanvasRenderingContext2D
  lane: RaceSession['lanes'][number]
  laneHorse: HorseOption
  session: RaceSession
  highlightedHorseIds: Set<string>
  renderContext: RenderSessionContext
  frameRenderData: LaneFrameRenderData
}): void => {
  drawLaneHorseFrame({
    context,
    frameCanvas: frameRenderData.frameCanvas,
    x: frameRenderData.x,
    y: frameRenderData.y,
  })
  drawLaneHorseNumber({
    context,
    laneNumber: laneHorse.laneNumber,
    laneCenterY: frameRenderData.laneCenterY,
    isSelectedHorse: laneHorse.id === session.selectedHorseId,
    isBetHorse: highlightedHorseIds.has(laneHorse.id),
  })
  drawFinalPodiumMarkerIfPresent({ context, lane, renderContext })
}

const drawLivePodiumLaneIfPresent = ({
  context,
  lane,
  renderContext,
}: {
  context: CanvasRenderingContext2D
  lane: RaceSession['lanes'][number]
  renderContext: RenderSessionContext
}): void => {
  const livePodiumRank = renderContext.livePodiumLaneMap.get(lane.laneNumber)
  if (livePodiumRank !== undefined) {
    drawLivePodiumLaneBackground({ context, lane, podiumRank: livePodiumRank })
  }
}

const resolveLaneHorse = ({
  lane,
  renderContext,
}: {
  lane: RaceSession['lanes'][number]
  renderContext: RenderSessionContext
}): HorseOption | undefined => {
  return renderContext.horseByLaneNumber.get(lane.laneNumber)
}

const drawFinalPodiumMarkerIfPresent = ({
  context,
  lane,
  renderContext,
}: {
  context: CanvasRenderingContext2D
  lane: RaceSession['lanes'][number]
  renderContext: RenderSessionContext
}): void => {
  const finalPodiumRank = renderContext.finalPodiumLaneMap.get(lane.laneNumber)
  if (renderContext.isRaceFinished && finalPodiumRank !== undefined) {
    drawPodiumRankMarker({ context, lane, podiumRank: finalPodiumRank })
  }
}

const drawLaneHorseFrame = ({
  context,
  frameCanvas,
  x,
  y,
}: {
  context: CanvasRenderingContext2D
  frameCanvas: HTMLCanvasElement | undefined
  x: number
  y: number
}): void => {
  if (frameCanvas) {
    context.drawImage(frameCanvas, x, y)
  }
}

const drawLaneHorseNumber = ({
  context,
  laneNumber,
  laneCenterY,
  isSelectedHorse,
  isBetHorse,
}: {
  context: CanvasRenderingContext2D
  laneNumber: number
  laneCenterY: number
  isSelectedHorse: boolean
  isBetHorse: boolean
}): void => {
  drawLaneNumber({
    context,
    laneNumber,
    laneCenterY,
    isSelectedHorse,
    isBetHorse,
  })
}

const resolveLaneFrameRenderData = ({
  lane,
  laneHorse,
  elapsedMs,
  snapshotByHorseId,
  activeRoundFinishDistance,
  finishX,
  session,
  getFrameVisibleBounds,
  getFallbackFrameVisibleBounds,
}: ResolveLaneFrameRenderDataInput): LaneFrameRenderData => {
  const frameSelection = resolveLaneFrameSelection({
    laneHorse,
    elapsedMs,
    snapshotByHorseId,
    activeRoundFinishDistance,
    session,
  })
  const frameVisibleBounds = getFrameVisibleBoundsForCanvas({
    frameCanvas: frameSelection.frameCanvas,
    getFrameVisibleBounds,
    getFallbackFrameVisibleBounds,
  })
  const { x, y, laneCenterY } = getHorseRenderPosition({
    lane,
    clampedCanvasDistance: frameSelection.clampedCanvasDistance,
    finishX,
    frameVisibleBounds,
  })

  return {
    frameCanvas: frameSelection.frameCanvas,
    x,
    y,
    laneCenterY,
  }
}

const resolveLaneFrameSelection = ({
  laneHorse,
  elapsedMs,
  snapshotByHorseId,
  activeRoundFinishDistance,
  session,
}: {
  laneHorse: HorseOption
  elapsedMs: number
  snapshotByHorseId: Map<string, number>
  activeRoundFinishDistance: number
  session: RaceSession
}): {
  frameCanvas: HTMLCanvasElement | undefined
  clampedCanvasDistance: number
} => {
  const distance = snapshotByHorseId.get(laneHorse.id) ?? 0
  const clampedCanvasDistance = toCanvasDistance({
    raceDistance: distance,
    raceFinishDistance: activeRoundFinishDistance,
  })
  const frameToDraw = getHorseFrameToDraw({
    horse: laneHorse,
    currentDistance: distance,
    raceFinishDistance: activeRoundFinishDistance,
    elapsedMs,
  })

  return {
    frameCanvas: session.renderSheets[laneHorse.id]?.[frameToDraw],
    clampedCanvasDistance,
  }
}

/**
 * Creates canvas renderer helpers for race-track drawing and frame animation.
 *
 * The returned API isolates presentation concerns (track, horse frame placement,
 * and lane labels) from session orchestration logic.
 */
export const createTrackCanvasRenderer = ({
  getFrameVisibleBounds,
  getFallbackFrameVisibleBounds,
}: TrackRendererDependencies): {
  drawTrackBackground: (context: CanvasRenderingContext2D) => void
  renderEmptyTrack: (canvas: HTMLCanvasElement | null) => void
  getTickIndex: (elapsedMs: number, snapshotsCount: number) => number
  renderSessionFrame: ({
    context,
    session,
    tickIndex,
    elapsedMs,
    snapshotByHorseId,
    raceFinishDistance,
    highlightedHorseIds,
  }: {
    context: CanvasRenderingContext2D
    session: RaceSession
    tickIndex: number
    elapsedMs: number
    snapshotByHorseId: Map<string, number>
    raceFinishDistance: number
    highlightedHorseIds: Set<string>
  }) => void
} => {
  const renderEmptyTrack = createRenderEmptyTrack()
  const renderSessionFrame = createRenderSessionFrame({
    getFrameVisibleBounds,
    getFallbackFrameVisibleBounds,
  })

  return {
    drawTrackBackground,
    renderEmptyTrack,
    getTickIndex,
    renderSessionFrame,
  }
}
