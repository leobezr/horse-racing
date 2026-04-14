import type { HorseColorMap, HorseFramePair } from '../types/horse-race'

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
  { spritePath: '/assets/01.png', maskPath: '/assets/02.png' },
  { spritePath: '/assets/03.png', maskPath: '/assets/04.png' },
  { spritePath: '/assets/05.png', maskPath: '/assets/06.png' },
  { spritePath: '/assets/07.png', maskPath: '/assets/08.png' },
  { spritePath: '/assets/09.png', maskPath: '/assets/10.png' },
  { spritePath: '/assets/11.png', maskPath: '/assets/12.png' },
  { spritePath: '/assets/13.png', maskPath: '/assets/14.png' },
  { spritePath: '/assets/15.png', maskPath: '/assets/16.png' },
  { spritePath: '/assets/17.png', maskPath: '/assets/18.png' },
]

export const horseWalkFrameIndices = horseFramePairs
  .map((_, index) => index)
  .filter((index) => index !== horseAssetConfig.idleFrameIndex)
