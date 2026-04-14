import type { GameConfig } from '../types/config'

export const gameConfig: GameConfig = {
  defaultRaceSeed: 20260414,
  totalHorseOptions: 20,
  track: {
    width: 980,
    height: 620,
    lanePaddingX: 88,
    laneStartY: 108,
    laneGap: 24,
    finishLineOffset: 120,
  },
  animation: {
    tickMs: 100,
    frameIntervalMs: 130,
  },
  simulation: {
    baseSpeedMin: 6,
    baseSpeedMax: 10,
    accelerationWeight: 0.55,
    burstChance: 0.08,
    burstBonusMin: 2,
    burstBonusMax: 6,
    maxTicks: 700,
  },
}
