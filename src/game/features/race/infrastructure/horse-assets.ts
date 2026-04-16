import type { HorseColorMap, HorseFramePair } from '../types/horse-race'
import { appConfig } from '../../../../config/app.config'

const createAssetPath = (fileName: string): string => {
  return `${appConfig.assetBasePath}assets/${fileName}`
}

export const horseMaskColorTokens: HorseColorMap = {
  primary: '#ff0000',
  secondary: '#ffe400',
  tertiary: '#ff22e8',
  saddle: '#0866ff',
}

export const horseAssetConfig = {
  totalHorseOptions: 20,
  idleFrameIndex: 0,
  frameIntervalMs: 130,
} as const

export const horseFramePairs: HorseFramePair[] = [
  { spritePath: createAssetPath('01.png'), maskPath: createAssetPath('02.png') },
  { spritePath: createAssetPath('03.png'), maskPath: createAssetPath('04.png') },
  { spritePath: createAssetPath('05.png'), maskPath: createAssetPath('06.png') },
  { spritePath: createAssetPath('07.png'), maskPath: createAssetPath('08.png') },
  { spritePath: createAssetPath('09.png'), maskPath: createAssetPath('10.png') },
  { spritePath: createAssetPath('11.png'), maskPath: createAssetPath('12.png') },
  { spritePath: createAssetPath('13.png'), maskPath: createAssetPath('14.png') },
  { spritePath: createAssetPath('15.png'), maskPath: createAssetPath('16.png') },
  { spritePath: createAssetPath('17.png'), maskPath: createAssetPath('18.png') },
]

export const horseWalkFrameIndices = horseFramePairs
  .map((_, index) => {return index})
  .filter((index) => {return index !== horseAssetConfig.idleFrameIndex})
