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
    trackDistances: number[]
  }
  track: {
    width: number
    height: number
    lanePaddingX: number
    laneStartY: number
    laneGap: number
    finishLineOffset: number
    horseAlignmentBoxSize: number
  }
  animation: {
    tickMs: number
    frameIntervalMs: number
  }
  simulation: {
    baseSpeedMin: number
    baseSpeedMax: number
    accelerationWeight: number
    accelerationVarianceWeight: number
    sprintChance: number
    sprintBonusMin: number
    sprintBonusMax: number
    sprintDurationTicks: number
    staminaDrainMin: number
    staminaDrainMax: number
    staminaFatigueWeight: number
    burstChance: number
    burstDurationTicksMin: number
    burstDurationTicksMax: number
    burstMultiplierMin: number
    burstMultiplierMax: number
    maxTicks: number
  }
}
