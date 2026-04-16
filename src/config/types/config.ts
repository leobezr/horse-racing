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
    maxSpeedDecisionChance: number
    maxSpeedBoostMin: number
    maxSpeedBoostMax: number
    longTrackStaminaScale: number
    burstChance: number
    burstDurationTicksMin: number
    burstDurationTicksMax: number
    burstMultiplierMin: number
    burstMultiplierMax: number
    minRaceSpeed: number
    sprintInjurySpeedPenaltyMultiplier: number
    sprintInjuryStaminaCap: number
    sprintInjuryPenaltyTicks: number
    cruisingSpeedRatio: number
    limpSpeedRatio: number
    kickBurnMultiplier: number
    finishPhaseStart: number
    handicapWeightPerWinKg: number
    dailyFormMin: number
    dailyFormMax: number
    headwindImpactMax: number
    tailwindBoostMax: number
    surfaceGrip: {
      firm: number
      soft: number
      heavy: number
    }
    raceDebugLogging: boolean
    maxTicks: number
  }
}
