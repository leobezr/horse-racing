import type { FrameVisibleBounds } from '../../types/frame-visible-bounds'
import type { PixelBoundsAccumulator } from '../../types/frame-visible-bounds-cache'

const createFallbackFrameVisibleBounds = ({
  width,
  height,
}: {
  width: number
  height: number
}): FrameVisibleBounds => ({
  left: 0,
  top: 0,
  width,
  height,
})

const createInitialPixelBounds = ({
  width,
  height,
}: {
  width: number
  height: number
}): PixelBoundsAccumulator => ({
  minX: width,
  minY: height,
  maxX: -1,
  maxY: -1,
})

const includePixelInBounds = ({
  pixelBounds,
  x,
  y,
}: {
  pixelBounds: PixelBoundsAccumulator
  x: number
  y: number
}): void => {
  if (x < pixelBounds.minX) {
    pixelBounds.minX = x
  }

  if (y < pixelBounds.minY) {
    pixelBounds.minY = y
  }

  if (x > pixelBounds.maxX) {
    pixelBounds.maxX = x
  }

  if (y > pixelBounds.maxY) {
    pixelBounds.maxY = y
  }
}

const hasVisiblePixelBounds = (pixelBounds: PixelBoundsAccumulator): boolean => {
  if (pixelBounds.maxX < pixelBounds.minX) {
    return false
  }

  return pixelBounds.maxY >= pixelBounds.minY
}

const toFrameVisibleBounds = (pixelBounds: PixelBoundsAccumulator): FrameVisibleBounds => ({
  left: pixelBounds.minX,
  top: pixelBounds.minY,
  width: pixelBounds.maxX - pixelBounds.minX + 1,
  height: pixelBounds.maxY - pixelBounds.minY + 1,
})

const hasVisiblePixelAt = ({
  pixelData,
  width,
  x,
  y,
}: {
  pixelData: Uint8ClampedArray
  width: number
  x: number
  y: number
}): boolean => {
  const alphaIndex = (y * width + x) * 4 + 3
  return pixelData[alphaIndex] !== 0
}

const measureFrameVisibleBounds = ({
  frameCanvas,
  context,
}: {
  frameCanvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
}): FrameVisibleBounds | null => {
  const imageData = context.getImageData(0, 0, frameCanvas.width, frameCanvas.height)
  const pixelData = imageData.data
  
  const pixelBounds = createInitialPixelBounds({
    width: frameCanvas.width,
    height: frameCanvas.height,
  })

  for (let y = 0; y < frameCanvas.height; y += 1) {
    for (let x = 0; x < frameCanvas.width; x += 1) {
      if (!hasVisiblePixelAt({ pixelData, width: frameCanvas.width, x, y })) {
        continue
      }

      includePixelInBounds({ pixelBounds, x, y })
    }
  }

  if (!hasVisiblePixelBounds(pixelBounds)) {
    return null
  }

  return toFrameVisibleBounds(pixelBounds)
}

const resolveFrameVisibleBounds = ({
  frameCanvas,
}: {
  frameCanvas: HTMLCanvasElement
}): FrameVisibleBounds => {
  const fallbackBounds = createFallbackFrameVisibleBounds({
    width: frameCanvas.width,
    height: frameCanvas.height,
  })
  const context = frameCanvas.getContext('2d', { willReadFrequently: true })

  if (!context) {
    return fallbackBounds
  }

  const measuredBounds = measureFrameVisibleBounds({ frameCanvas, context })
  if (!measuredBounds) {
    return fallbackBounds
  }

  return measuredBounds
}

/**
 * Creates a cached visible-bounds reader for horse sprite frame canvases.
 *
 * Bounds are measured once per frame canvas and memoized in a WeakMap so
 * repeated render frames avoid rescanning pixel alpha data.
 */
export const createFrameVisibleBoundsReader = (): {
  getFrameVisibleBounds: (frameCanvas: HTMLCanvasElement) => FrameVisibleBounds
} => {
  const frameVisibleBoundsCache = new WeakMap<HTMLCanvasElement, FrameVisibleBounds>()

  const getFrameVisibleBounds = (frameCanvas: HTMLCanvasElement): FrameVisibleBounds => {
    const cachedBounds = frameVisibleBoundsCache.get(frameCanvas)
    if (cachedBounds) {
      return cachedBounds
    }

    const resolvedBounds = resolveFrameVisibleBounds({ frameCanvas })
    frameVisibleBoundsCache.set(frameCanvas, resolvedBounds)
    return resolvedBounds
  }

  return {
    getFrameVisibleBounds,
  }
}

export const getFallbackFrameVisibleBounds = ({
  width,
  height,
}: {
  width: number
  height: number
}): FrameVisibleBounds => createFallbackFrameVisibleBounds({ width, height })
