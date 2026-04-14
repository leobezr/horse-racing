import type { GameConfig } from './types/config'

export const gameConfig: GameConfig = {
  defaultRaceSeed: 20260414,
  totalHorseOptions: 20,
  raceHorseCount: 10,
  betting: {
    initialCredit: 15000,
    chipValues: [500, 1500, 3000, 5000, 10000, 15000, 20000, 25000, 50000, 100000],
    oddsOverround: 1.15,
  },
  rounds: {
    count: 6,
    secondsPerRound: 15,
    speedMultipliers: [0.96, 1, 1.03, 0.99, 1.05, 1.08],
    trackDistances: [1200, 1400, 1600, 1800, 2000, 2200],
  },
  track: {
    width: 800,
    height: 440,
    lanePaddingX: 70,
    laneStartY: 10,
    laneGap: 120,
    finishLineOffset: 80,
    horseAlignmentBoxSize: 32,
  },
  animation: {
    tickMs: 100,
    frameIntervalMs: 130,
  },
  simulation: {
    baseSpeedMin: 6,
    baseSpeedMax: 10,
    accelerationWeight: 0.55,
    sprintChance: 0.18,
    sprintBonusMin: 2,
    sprintBonusMax: 6,
    sprintDurationTicks: 4,
    maxTicks: 900,
  },
}
