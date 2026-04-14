import { gameConfig } from '../../../../../config/game.config'
import { colorTokens } from '../../../../../shared/theme/color-tokens'
import { horseAssetConfig } from '../../infrastructure/horse-assets'
import type { FrameVisibleBounds } from '../../types/frame-visible-bounds'
import type { HorseOption, RaceSession } from '../../types/horse-race'

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
  tickIndex,
  elapsedMs,
  raceSnapshotsCount,
}: {
  horse: HorseOption
  tickIndex: number
  elapsedMs: number
  raceSnapshotsCount: number
}): number => {
  const finishedAtTick = horse.metadata.finishedAtTick
  const horseFinished = finishedAtTick !== null && tickIndex >= finishedAtTick
  const isLastSnapshot = tickIndex === raceSnapshotsCount - 1

  if (horseFinished || isLastSnapshot) {
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
  clampedDistance,
  finishX,
  frameVisibleBounds,
}: {
  lane: RaceSession['lanes'][number]
  clampedDistance: number
  finishX: number
  frameVisibleBounds: FrameVisibleBounds
}): {
  x: number
  y: number
  laneCenterY: number
} => {
  const maxVisibleHorseX = Math.max(gameConfig.track.lanePaddingX, finishX - frameVisibleBounds.width)
  const visibleHorseX = Math.min(maxVisibleHorseX, gameConfig.track.lanePaddingX + clampedDistance)
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
}: {
  context: CanvasRenderingContext2D
  laneNumber: number
  laneCenterY: number
  isSelectedHorse: boolean
}): void => {
  if (isSelectedHorse) {
    context.fillStyle = colorTokens.track.laneTextSelected
  } else {
    context.fillStyle = colorTokens.track.laneTextDefault
  }

  context.font = '12px Trebuchet MS'
  context.fillText(String(laneNumber), gameConfig.track.lanePaddingX - 28, laneCenterY + 4)
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
    finishDistance,
  }: {
    context: CanvasRenderingContext2D
    session: RaceSession
    tickIndex: number
    elapsedMs: number
    snapshotByHorseId: Map<string, number>
    finishDistance: number
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
    finishDistance,
  }: {
    context: CanvasRenderingContext2D
    session: RaceSession
    tickIndex: number
    elapsedMs: number
    snapshotByHorseId: Map<string, number>
    finishDistance: number
  }): void => {
    const finishX = finishDistance
    const horseByLaneNumber = new Map(session.horses.map((horse) => [horse.laneNumber, horse]))

    drawTrackBackground(context)

    for (const lane of session.lanes) {
      const laneHorse = horseByLaneNumber.get(lane.laneNumber)
      if (!laneHorse) {
        continue
      }

      const distance = snapshotByHorseId.get(laneHorse.id) ?? 0
      const clampedDistance = Math.min(finishDistance, Math.max(0, distance))
      const frameToDraw = getHorseFrameToDraw({
        horse: laneHorse,
        tickIndex,
        elapsedMs,
        raceSnapshotsCount: session.race.raceSnapshots.length,
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
        clampedDistance,
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
      })
    }
  }

  return {
    drawTrackBackground,
    renderEmptyTrack,
    getTickIndex,
    renderSessionFrame,
  }
}
