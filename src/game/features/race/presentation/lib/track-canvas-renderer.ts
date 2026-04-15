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
}: {
  session: RaceSession
  snapshotByHorseId: Map<string, number>
}): Map<number, number> => {
  const orderedByDistance = [...session.horses].sort((left, right) => {
    const leftDistance = snapshotByHorseId.get(left.id) ?? 0
    const rightDistance = snapshotByHorseId.get(right.id) ?? 0

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
  for (let index = 0; index < Math.min(3, orderedByDistance.length); index += 1) {
    const horse = orderedByDistance[index]
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
    gameConfig.track.lanePaddingX,
    lane.y + 1,
    gameConfig.track.width - gameConfig.track.lanePaddingX * 2,
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

  context.fillStyle = colorTokens.track.lane
  context.fillRect(
    gameConfig.track.lanePaddingX,
    gameConfig.track.laneStartY - 10,
    gameConfig.track.width - gameConfig.track.lanePaddingX * 2,
    gameConfig.track.height - gameConfig.track.laneStartY,
  )

  context.strokeStyle = colorTokens.track.line
  context.lineWidth = 2

  const laneHeight = Math.floor((gameConfig.track.height - gameConfig.track.laneStartY - 15) / gameConfig.raceHorseCount)
  
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

const getFinishLineX = (): number => {return gameConfig.track.width - gameConfig.track.finishLineOffset}

const getTrackDrawableDistance = (): number => {return Math.max(1, getFinishLineX() - gameConfig.track.lanePaddingX)}

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
  const maxVisibleHorseX = Math.max(gameConfig.track.lanePaddingX, finishX - frameVisibleBounds.width)
  const visibleHorseX = Math.min(maxVisibleHorseX, gameConfig.track.lanePaddingX + clampedCanvasDistance)
  const alignmentBoxHeight = Math.min(gameConfig.track.horseAlignmentBoxSize, frameVisibleBounds.height)
  const alignmentTop = frameVisibleBounds.top + frameVisibleBounds.height - alignmentBoxHeight
  const alignmentCenterY = alignmentTop + alignmentBoxHeight / 2
  const x = Math.round(visibleHorseX - frameVisibleBounds.left)
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
  const laneLabel = isBetHorse ? `>> ${laneNumber}` : String(laneNumber)
  context.fillText(laneLabel, gameConfig.track.lanePaddingX - 46, laneCenterY + 4)
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
}: {
  getFrameVisibleBounds: (frameCanvas: HTMLCanvasElement) => FrameVisibleBounds
  getFallbackFrameVisibleBounds: ({ width, height }: { width: number; height: number }) => FrameVisibleBounds
}): {
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
  const renderEmptyTrack = (canvas: HTMLCanvasElement | null): void => {
    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    drawTrackBackground(context)
  }

  const renderSessionFrame = ({
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
  }): void => {
    const finishX = getFinishLineX()
    const horseByLaneNumber = new Map(session.horses.map((horse) => {return [horse.laneNumber, horse]}))
    const isRaceFinished = tickIndex >= Math.max(0, session.race.raceSnapshots.length - 1)
    const activeRoundFinishDistance = getRoundFinishDistanceForTick({
      tickIndex,
      roundSummaries: session.race.roundSummaries,
      configuredRoundTrackDistances: gameConfig.rounds.trackDistances,
      fallbackFinishDistance: raceFinishDistance,
    })
    const livePodiumLaneMap = getPodiumLaneMap({
      session,
      snapshotByHorseId,
    })
    const finalPodiumLaneMap = getFinalPodiumLaneMap(session)

    drawTrackBackground(context)

    for (const lane of session.lanes) {
      const livePodiumRank = livePodiumLaneMap.get(lane.laneNumber)
      if (livePodiumRank !== undefined) {
        drawLivePodiumLaneBackground({
          context,
          lane,
          podiumRank: livePodiumRank,
        })
      }

      const laneHorse = horseByLaneNumber.get(lane.laneNumber)
      if (!laneHorse) {
        continue
      }

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

      const sheet = session.renderSheets[laneHorse.id]
      const frameCanvas = sheet?.[frameToDraw]
      const frameVisibleBounds = getFrameVisibleBoundsForCanvas({
        frameCanvas,
        getFrameVisibleBounds,
        getFallbackFrameVisibleBounds,
      })

      const { x, y, laneCenterY } = getHorseRenderPosition({
        lane,
        clampedCanvasDistance,
        finishX,
        frameVisibleBounds,
      })

      if (frameCanvas) {
        context.drawImage(frameCanvas, x, y)
      }

      drawLaneNumber({
        context,
        laneNumber: laneHorse.laneNumber,
        laneCenterY,
        isSelectedHorse: laneHorse.id === session.selectedHorseId,
        isBetHorse: highlightedHorseIds.has(laneHorse.id),
      })

      const finalPodiumRank = finalPodiumLaneMap.get(lane.laneNumber)
      if (isRaceFinished && finalPodiumRank !== undefined) {
        drawPodiumRankMarker({
          context,
          lane,
          podiumRank: finalPodiumRank,
        })
      }
    }
  }

  return {
    drawTrackBackground,
    renderEmptyTrack,
    getTickIndex,
    renderSessionFrame,
  }
}
