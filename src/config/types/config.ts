export type AppConfig = {
  appName: string
}

export type GameConfig = {
  defaultRaceSeed: number
  totalHorseOptions: number
  raceHorseCount: number
  betting: {
    initialCredit: number
    chipValues: number[]
    oddsOverround: number
  }
  rounds: {
    count: number
    secondsPerRound: number
    speedMultipliers: number[]
  }
  track: {
    width: number
    height: number
    lanePaddingX: number
    laneStartY: number
    laneGap: number
    finishLineOffset: number
  }
  animation: {
    tickMs: number
    frameIntervalMs: number
  }
  simulation: {
    baseSpeedMin: number
    baseSpeedMax: number
    accelerationWeight: number
    sprintChance: number
    sprintBonusMin: number
    sprintBonusMax: number
    sprintDurationTicks: number
    maxTicks: number
  }
}
