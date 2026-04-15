import type { HorseColorMap, HorseOption, HorseRenderSheets, LoadedHorseFramePair } from '../types/horse-race'
import { horseFramePairs } from './horse-assets'

const parseHexColor = (hexColor: string): { red: number; green: number; blue: number } => {
  const normalized = hexColor.replace('#', '')
  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

const colorDistance = (
  source: { red: number; green: number; blue: number },
  target: { red: number; green: number; blue: number },
): number => {
  const redDelta = source.red - target.red
  const greenDelta = source.green - target.green
  const blueDelta = source.blue - target.blue
  return Math.sqrt(redDelta * redDelta + greenDelta * greenDelta + blueDelta * blueDelta)
}

const getPaletteMap = (
  maskSourceColors: HorseColorMap,
  targetColors: HorseColorMap,
): Array<{ source: { red: number; green: number; blue: number }; target: { red: number; green: number; blue: number } }> => {return [
  { source: parseHexColor(maskSourceColors.primary), target: parseHexColor(targetColors.primary) },
  { source: parseHexColor(maskSourceColors.secondary), target: parseHexColor(targetColors.secondary) },
  { source: parseHexColor(maskSourceColors.tertiary), target: parseHexColor(targetColors.tertiary) },
  { source: parseHexColor(maskSourceColors.saddle), target: parseHexColor(targetColors.saddle) },
]}

const getReplacementColor = (
  pixel: { red: number; green: number; blue: number },
  paletteMap: Array<{ source: { red: number; green: number; blue: number }; target: { red: number; green: number; blue: number } }>,
): { red: number; green: number; blue: number } | null => {
  let bestDistance = Number.POSITIVE_INFINITY
  let bestTarget: { red: number; green: number; blue: number } | null = null

  for (const entry of paletteMap) {
    const distance = colorDistance(pixel, entry.source)
    if (distance < bestDistance) {
      bestDistance = distance
      bestTarget = entry.target
    }
  }

  return bestDistance <= 55 ? bestTarget : null
}

const loadImage = (path: string): Promise<HTMLImageElement> =>
  {return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {return resolve(image)}
    image.onerror = () => {return reject(new Error(`Failed loading image: ${path}`))}
    image.src = path
  })}

const recolorMaskCanvas = ({
  maskImage,
  maskSourceColors,
  targetColors,
}: {
  maskImage: HTMLImageElement
  maskSourceColors: HorseColorMap
  targetColors: HorseColorMap
}): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })

  if (!context) {
    throw new Error('Canvas 2D context unavailable while recoloring horse mask.')
  }

  canvas.width = maskImage.width
  canvas.height = maskImage.height
  context.drawImage(maskImage, 0, 0)

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const paletteMap = getPaletteMap(maskSourceColors, targetColors)

  for (let index = 0; index < imageData.data.length; index += 4) {
    const red = imageData.data[index]
    const green = imageData.data[index + 1]
    const blue = imageData.data[index + 2]
    const alpha = imageData.data[index + 3]

    if (alpha === 0) {
      continue
    }

    const replacement = getReplacementColor({ red, green, blue }, paletteMap)
    if (replacement) {
      imageData.data[index] = replacement.red
      imageData.data[index + 1] = replacement.green
      imageData.data[index + 2] = replacement.blue
    }
  }

  context.putImageData(imageData, 0, 0)
  return canvas
}

const composeHorseFrame = ({
  spriteImage,
  maskImage,
  maskSourceColors,
  targetColors,
}: {
  spriteImage: HTMLImageElement
  maskImage: HTMLImageElement
  maskSourceColors: HorseColorMap
  targetColors: HorseColorMap
}): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas 2D context unavailable while composing horse frame.')
  }

  canvas.width = spriteImage.width
  canvas.height = spriteImage.height
  context.drawImage(spriteImage, 0, 0)

  const recoloredMaskCanvas = recolorMaskCanvas({
    maskImage,
    maskSourceColors,
    targetColors,
  })

  context.drawImage(recoloredMaskCanvas, 0, 0)
  return canvas
}

export const loadHorseFrameAssets = async (): Promise<LoadedHorseFramePair[]> => {
  const loadedPairs: LoadedHorseFramePair[] = []
  for (const pair of horseFramePairs) {
    const spriteImage = await loadImage(pair.spritePath)
    const maskImage = await loadImage(pair.maskPath)
    loadedPairs.push({ spriteImage, maskImage })
  }
  return loadedPairs
}

export const buildHorseRenderSheets = ({
  horses,
  loadedFramePairs,
  maskSourceColors,
}: {
  horses: HorseOption[]
  loadedFramePairs: LoadedHorseFramePair[]
  maskSourceColors: HorseColorMap
}): HorseRenderSheets => {
  const byHorseId: HorseRenderSheets = {}

  for (const horse of horses) {
    byHorseId[horse.id] = loadedFramePairs.map(({ spriteImage, maskImage }) =>
      {return composeHorseFrame({
        spriteImage,
        maskImage,
        maskSourceColors,
        targetColors: horse.colors,
      })},
    )
  }

  return byHorseId
}
