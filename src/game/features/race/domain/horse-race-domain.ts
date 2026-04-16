import { gameConfig } from '../../../../config/game.config'
import type {
  HorseColorMap,
  HorseOption,
  HorseOdds,
  RaceResult,
  RaceStateEntry,
  RoundExecution,
  TickRolls,
  TrackLane,
} from '../types/horse-race'
import type { DeterministicRng } from '../types/rng'
import { createDeterministicRng } from '../infrastructure/deterministic-rng'
import { horseAssetConfig, horseMaskColorTokens, horseWalkFrameIndices } from '../infrastructure/horse-assets'

const styleNamePool = [
  'Cream',
  'Gelato',
  'Vanilla',
  'Comet',
  'Ranger',
  'Nova',
  'Sprint',
  'Storm',
  'Echo',
  'Arrow',
  'Velvet',
  'Blaze',
  'Fjord',
  'Shadow',
  'Zephyr',
  'Nimbus',
  'Vortex',
  'Luna',
  'Solar',
  'Ember',
  'Glide',
  'Phantom',
  'Turbo',
  'Buttercup',
]

const clampColorChannel = (value: number): number => {return Math.max(0, Math.min(255, value))}

const toHexColor = (color: { red: number; green: number; blue: number }): string =>
  {return `#${[color.red, color.green, color.blue]
    .map((channel) => {return clampColorChannel(channel).toString(16).padStart(2, '0')})
    .join('')}`}

const buildHorseName = (rng: DeterministicRng, collection: string[]): string => {
  const horseName = collection.splice(rng.randomInt(0, collection.length - 1), 1)[0]
  return horseName
}

const createHorseColors = (rng: DeterministicRng): HorseColorMap => {
  const hueBase = rng.randomInt(20, 230)
  const core = toHexColor({
    red: hueBase,
    green: rng.randomInt(35, 200),
    blue: rng.randomInt(20, 180),
  })

  return {
    primary: core,
    secondary: core,
    tertiary: core,
    saddle: toHexColor({
      red: rng.randomInt(10, 120),
      green: rng.randomInt(20, 140),
      blue: rng.randomInt(80, 220),
    }),
  }
}

const createHorseBaseStats = (rng: DeterministicRng): HorseOption['stats'] => {return {
  gateJump: rng.randomFloat(0.25, 1),
  topSpeed: rng.randomFloat(gameConfig.simulation.baseSpeedMin, gameConfig.simulation.baseSpeedMax),
  staminaReservoir: rng.randomFloat(0.45, 1),
  efficiency: rng.randomFloat(0.25, 1),
  finishDrive: rng.randomFloat(1.02, 1.3),
  aerodynamics: rng.randomFloat(0.2, 1),
  weightKg: rng.randomFloat(430, 560),
  style: ['rabbit', 'closer', 'grinder'][rng.randomInt(0, 2)] as HorseOption['stats']['style'],
  dailyForm: rng.randomFloat(gameConfig.simulation.dailyFormMin, gameConfig.simulation.dailyFormMax),
  baseSpeed: 0,
  accelerationBias: 0,
  stamina: 0,
  sprintControl: 0,
}}

const applyStyleProfile = (stats: HorseOption['stats']): HorseOption['stats'] => {
  if (stats.style === 'rabbit') {
    return {
      ...stats,
      gateJump: Math.min(1, stats.gateJump * 1.22),
      topSpeed: stats.topSpeed * 1.06,
      staminaReservoir: stats.staminaReservoir * 0.84,
      finishDrive: Math.max(1.01, stats.finishDrive * 0.92),
      efficiency: stats.efficiency * 0.88,
      sprintControl: 0.95,
      accelerationBias: stats.gateJump,
    }
  }

  if (stats.style === 'closer') {
    return {
      ...stats,
      gateJump: stats.gateJump * 0.82,
      topSpeed: stats.topSpeed * 0.97,
      staminaReservoir: stats.staminaReservoir * 1.15,
      finishDrive: Math.max(1.12, stats.finishDrive * 1.2),
      efficiency: stats.efficiency * 1.05,
      sprintControl: 0.72,
      accelerationBias: stats.gateJump,
    }
  }

  return {
    ...stats,
    gateJump: stats.gateJump * 0.95,
    topSpeed: stats.topSpeed,
    staminaReservoir: stats.staminaReservoir * 1.05,
    finishDrive: Math.max(1.03, stats.finishDrive * 1.02),
    efficiency: Math.min(1, stats.efficiency * 1.24),
    sprintControl: 0.55,
    accelerationBias: stats.gateJump,
  }
}

const normalizeLegacyStats = (stats: HorseOption['stats']): HorseOption['stats'] => {
  return {
    ...stats,
    baseSpeed: stats.topSpeed,
    stamina: stats.staminaReservoir,
  }
}

const greatestCommonDivisor = (left: number, right: number): number => {
  let valueLeft = Math.abs(left)
  let valueRight = Math.abs(right)

  while (valueRight !== 0) {
    const remainder = valueLeft % valueRight
    valueLeft = valueRight
    valueRight = remainder
  }

  return valueLeft || 1
}

const createTrueProbabilityScore = (stats: HorseOption['stats']): number =>
  {return stats.topSpeed * 0.42 + stats.gateJump * 5 + stats.staminaReservoir * 4.8 + stats.efficiency * 4.2 + stats.finishDrive * 3.2}

type SurfaceType = 'firm' | 'soft' | 'heavy'

type RaceEnvironment = {
  surface: SurfaceType
  wind: number
}

type RoundDebugSample = {
  roundNumber: number
  surface: SurfaceType
  wind: number
  horseId: string
  laneNumber: number
  distance: number
  speed: number
  staminaReserve: number
  injuryPenaltyTicksRemaining: number
  exhausted: boolean
  tick: number
}

const isRaceDebugLoggingEnabled = (): boolean => {
  let nodeEnv: string | undefined
  if (typeof globalThis !== 'undefined') {
    const maybeProcess = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process
    nodeEnv = maybeProcess?.env?.NODE_ENV
  }
  return gameConfig.simulation.raceDebugLogging && nodeEnv !== 'test'
}

const debugRoundStateSamples = ({
  roundNumber,
  raceEnvironment,
  racingState,
  horses,
  roundTick,
}: {
  roundNumber: number
  raceEnvironment: RaceEnvironment
  racingState: RaceStateEntry[]
  horses: HorseOption[]
  roundTick: number
}): void => {
  if (!isRaceDebugLoggingEnabled()) {
    return
  }

  const horseById = new Map(horses.map((horse) => {return [horse.id, horse]}))
  const samples: RoundDebugSample[] = racingState.map((horseState) => {
    const horse = horseById.get(horseState.id)
    return {
      roundNumber,
      surface: raceEnvironment.surface,
      wind: Number(raceEnvironment.wind.toFixed(3)),
      horseId: horseState.id,
      laneNumber: horse?.laneNumber ?? 0,
      distance: Number(horseState.distance.toFixed(2)),
      speed: Number(horseState.currentSpeed.toFixed(3)),
      staminaReserve: Number(horseState.staminaReserve.toFixed(4)),
      injuryPenaltyTicksRemaining: horseState.injuryPenaltyTicksRemaining,
      exhausted: horseState.staminaReserve <= 0,
      tick: roundTick,
    }
  })

  const sortedByDistance = [...samples].sort((left, right) => {
    return right.distance - left.distance
  })
  const leader = sortedByDistance[0]
  const trailer = sortedByDistance[sortedByDistance.length - 1]
  const exhaustedCount = samples.filter((sample) => {return sample.exhausted}).length
  const injuredCount = samples.filter((sample) => {
    return sample.injuryPenaltyTicksRemaining > 0
  }).length

  console.log('[RACE_DEBUG] round_snapshot', {
    roundNumber,
    tick: roundTick,
    surface: raceEnvironment.surface,
    wind: Number(raceEnvironment.wind.toFixed(3)),
    leader,
    trailer,
    exhaustedCount,
    injuredCount,
  })
}

const debugRoundFinishSummary = ({
  roundNumber,
  summary,
  horses,
}: {
  roundNumber: number
  summary: RaceResult['roundSummaries'][number]
  horses: HorseOption[]
}): void => {
  if (!isRaceDebugLoggingEnabled()) {
    return
  }

  const topThree = summary.horseResults.slice(0, 3).map((horseResult) => {
    return {
      horseId: horseResult.id,
      laneNumber: horseResult.laneNumber,
      roundDistance: Number(horseResult.roundDistance.toFixed(2)),
      averageTickSpeed: Number(horseResult.averageTickSpeed.toFixed(3)),
      sprintCount: horseResult.sprintCount,
    }
  })

  console.log('[RACE_DEBUG] round_finish', {
    roundNumber,
    seedText: summary.seedText,
    fieldHorseIds: horses.map((horse) => {return horse.id}),
    topThree,
  })
}

const createRaceEnvironment = (rng: DeterministicRng): RaceEnvironment => {
  const surfaceIndex = rng.randomInt(0, 2)
  const surfaceByIndex: SurfaceType[] = ['firm', 'soft', 'heavy']
  return {
    surface: surfaceByIndex[surfaceIndex] ?? 'firm',
    wind: rng.randomFloat(-1, 1),
  }
}

const createFractionalOdds = (probability: number): { numerator: number; denominator: number; label: string } => {
  const clampedProbability = Math.max(0.001, Math.min(0.999, probability))
  const decimalOdds = 1 / clampedProbability
  const fractionalValue = decimalOdds - 1
  const roundedHalfSteps = Math.max(0.5, Math.round(fractionalValue * 2) / 2)
  const rawNumerator = Math.round(roundedHalfSteps * 2)
  const rawDenominator = 2
  const divisor = greatestCommonDivisor(rawNumerator, rawDenominator)
  const numerator = Math.max(1, Math.floor(rawNumerator / divisor))
  const denominator = Math.max(1, Math.floor(rawDenominator / divisor))

  return {
    numerator,
    denominator,
    label: `${numerator}/${denominator}`,
  }
}

const assignHorseOdds = ({
  horses,
}: {
  horses: HorseOption[]
}): HorseOption[] => {
  if (horses.length === 0) {
    return horses
  }

  const scores = horses.map((horse) => {return createTrueProbabilityScore(horse.stats)})
  const scoreSum = scores.reduce((sum, score) => {return sum + score}, 0)
  const normalizedProbabilities =
    scoreSum > 0 ? scores.map((score) => {return score / scoreSum}) : horses.map(() => {return 1 / horses.length})

  const overround = gameConfig.betting.oddsOverround

  const oddsByHorseId = new Map<string, HorseOdds>()
  for (let index = 0; index < horses.length; index += 1) {
    const horse = horses[index]
    const trueProbability = normalizedProbabilities[index]
    const inflatedProbability = Math.min(0.99, Math.max(0.001, trueProbability * overround))
    const fractionalOdds = createFractionalOdds(inflatedProbability)
    oddsByHorseId.set(horse.id, {
      probability: trueProbability,
      numerator: fractionalOdds.numerator,
      denominator: fractionalOdds.denominator,
      label: fractionalOdds.label,
    })
  }

  return horses.map((horse) => {return {
    ...horse,
    odds: oddsByHorseId.get(horse.id) ?? {
      probability: 1 / horses.length,
      numerator: 1,
      denominator: 1,
      label: '1/1',
    },
  }})
}

const createWalkFrameSequence = (rng: DeterministicRng): number[] => {
  const rotatedStart = rng.randomInt(0, horseWalkFrameIndices.length - 1)
  const ordered: number[] = []

  for (let index = 0; index < horseWalkFrameIndices.length; index += 1) {
    ordered.push(horseWalkFrameIndices[(rotatedStart + index) % horseWalkFrameIndices.length])
  }

  return ordered
}

const createInitialRaceState = ({
  horses,
  carryOverState,
  rng,
}: {
  horses: HorseOption[]
  carryOverState: Map<string, RaceStateEntry>
  rng: DeterministicRng
}): RaceStateEntry[] => {
  return horses.map((horse) => {
    const previousState = carryOverState.get(horse.id)
    const previousStaminaReserve = previousState?.staminaReserve ?? 1
    const recoveryRoll = rng.randomFloat(0.08, 0.28)
    const recoveredStaminaReserve = Math.min(1, previousStaminaReserve + recoveryRoll)

    return {
      id: horse.id,
      distance: 0,
      tickSpeedSamples: [],
      finishedAtTick: null,
      sprintCount: 0,
      sprintTicksRemaining: 0,
      staminaReserve: recoveredStaminaReserve,
      burstTicksRemaining: 0,
      activeBurstMultiplier: 1,
      injurySpeedPenaltyMultiplier: previousState?.injurySpeedPenaltyMultiplier ?? 1,
      hasSprintInjury: previousState?.hasSprintInjury ?? false,
      injuryPenaltyTicksRemaining: previousState?.injuryPenaltyTicksRemaining ?? 0,
      currentSpeed: 0,
      roundWins: previousState?.roundWins ?? 0,
      handicapWeightKg: previousState?.handicapWeightKg ?? 0,
    }
  })
}

const getRoundSpeedMultiplier = (roundNumber: number): number => {
  const configuredMultiplier = gameConfig.rounds.speedMultipliers[roundNumber - 1]
  if (configuredMultiplier !== undefined) {
    return configuredMultiplier
  }

  const fallbackMultiplier = gameConfig.rounds.speedMultipliers[gameConfig.rounds.speedMultipliers.length - 1]
  return fallbackMultiplier ?? 1
}

const getRoundTrackDistance = (roundNumber: number): number => {
  const configuredDistance = gameConfig.rounds.trackDistances[roundNumber - 1]
  if (configuredDistance !== undefined) {
    return configuredDistance
  }

  const fallbackDistance = gameConfig.rounds.trackDistances[gameConfig.rounds.trackDistances.length - 1]
  if (fallbackDistance !== undefined) {
    return fallbackDistance
  }

  return gameConfig.track.width - gameConfig.track.finishLineOffset
}

const getNormalizedBaseSpeed = (baseSpeed: number): number => {
  const speedRange = gameConfig.simulation.baseSpeedMax - gameConfig.simulation.baseSpeedMin
  if (speedRange <= 0) {
    return 0.5
  }

  return (baseSpeed - gameConfig.simulation.baseSpeedMin) / speedRange
}

const clampRatio = (value: number): number => {
  return Math.max(0, Math.min(1, value))
}

const getWeightNormalized = ({
  horse,
  horseState,
}: {
  horse: HorseOption
  horseState: RaceStateEntry
}): number => {
  const minWeight = 430
  const maxWeight = 580
  const effectiveWeight = horse.stats.weightKg + horseState.handicapWeightKg
  return clampRatio((effectiveWeight - minWeight) / (maxWeight - minWeight))
}

const getWeightSpeedMultiplier = ({
  weightNormalized,
}: {
  weightNormalized: number
}): number => {
  return 1 - weightNormalized * 0.08
}

const getExhaustedSpeedTarget = ({
  horse,
  weightNormalized,
}: {
  horse: HorseOption
  weightNormalized: number
}): number => {
  const baseFloor = gameConfig.simulation.minRaceSpeed
  const efficiencyContribution = horse.stats.efficiency * 0.45
  const aerodynamicsContribution = horse.stats.aerodynamics * 0.35
  const weightContribution = (1 - weightNormalized) * 0.2
  const formContribution = (horse.stats.dailyForm - 1) * 0.4
  return baseFloor + efficiencyContribution + aerodynamicsContribution + weightContribution + formContribution
}

const getSurfaceSpeedMultiplier = ({
  surface,
  weightNormalized,
}: {
  surface: SurfaceType
  weightNormalized: number
}): number => {
  const baseGrip = gameConfig.simulation.surfaceGrip[surface]
  if (surface === 'heavy') {
    return baseGrip + weightNormalized * 0.02
  }

  if (surface === 'firm') {
    return baseGrip + (1 - weightNormalized) * 0.02
  }

  return baseGrip + (0.5 - Math.abs(weightNormalized - 0.5)) * 0.01
}

const getWindSpeedMultiplier = ({
  wind,
  aerodynamics,
}: {
  wind: number
  aerodynamics: number
}): number => {
  if (wind >= 0) {
    const resistance = wind * gameConfig.simulation.headwindImpactMax * (1 - aerodynamics)
    return Math.max(0.7, 1 - resistance)
  }

  const tailBoost = Math.abs(wind) * gameConfig.simulation.tailwindBoostMax * (0.5 + aerodynamics * 0.5)
  return 1 + tailBoost
}

const createTickRolls = (rng: DeterministicRng): TickRolls => {
  return {
    acceleration: rng.randomFloat(0, 1),
    sprint: rng.randomFloat(0, 1),
    burst: rng.randomFloat(0, 1),
    staminaDrain: rng.randomFloat(gameConfig.simulation.staminaDrainMin, gameConfig.simulation.staminaDrainMax),
  }
}

const calculateBaseTickDistance = ({
  horse,
  horseState,
  roundMultiplier,
  accelerationRoll,
  finishDistance,
  raceEnvironment,
  isKickPhase,
}: {
  horse: HorseOption
  horseState: RaceStateEntry
  roundMultiplier: number
  accelerationRoll: number
  finishDistance: number
  raceEnvironment: RaceEnvironment
  isKickPhase: boolean
}): number => {
  const distanceRatio = finishDistance > 0 ? horseState.distance / finishDistance : 0
  const finishDriveMultiplier =
    distanceRatio >= gameConfig.simulation.finishPhaseStart ? horse.stats.finishDrive : 1
  const weightNormalized = getWeightNormalized({ horse, horseState })
  const weightSpeedMultiplier = getWeightSpeedMultiplier({
    weightNormalized,
  })
  const surfaceMultiplier = getSurfaceSpeedMultiplier({
    surface: raceEnvironment.surface,
    weightNormalized,
  })
  const windMultiplier = getWindSpeedMultiplier({
    wind: raceEnvironment.wind,
    aerodynamics: horse.stats.aerodynamics,
  })
  const topSpeedTarget =
    horse.stats.topSpeed *
    horse.stats.dailyForm *
    roundMultiplier *
    finishDriveMultiplier *
    weightSpeedMultiplier *
    surfaceMultiplier *
    windMultiplier

  const normalizedTopSpeedTarget = Math.max(gameConfig.simulation.minRaceSpeed, topSpeedTarget)
  const exhaustedSpeedTarget = getExhaustedSpeedTarget({
    horse,
    weightNormalized,
  })
  const limpSpeedTarget = Math.max(
    gameConfig.simulation.minRaceSpeed,
    Math.max(
      normalizedTopSpeedTarget * gameConfig.simulation.limpSpeedRatio,
      exhaustedSpeedTarget,
    ),
  )
  const cruisingSpeedCap = Math.max(
    gameConfig.simulation.minRaceSpeed,
    normalizedTopSpeedTarget * gameConfig.simulation.cruisingSpeedRatio,
  )
  const exhausted = horseState.staminaReserve <= 0
  const activeKick = !exhausted && isKickPhase
  let allowedSpeedTarget = Math.min(normalizedTopSpeedTarget, cruisingSpeedCap)
  if (activeKick) {
    allowedSpeedTarget = normalizedTopSpeedTarget
  }
  if (exhausted) {
    allowedSpeedTarget = limpSpeedTarget
  }

  const gateAcceleration = horse.stats.gateJump * 0.4 + 0.15
  const accelerationNoise =
    accelerationRoll * gameConfig.simulation.accelerationWeight +
    accelerationRoll * gameConfig.simulation.accelerationVarianceWeight
  const weightAccelerationPenalty = weightNormalized * 0.12
  const accelerationRate = clampRatio(gateAcceleration + accelerationNoise * 0.12 - weightAccelerationPenalty)
  const nextSpeed = horseState.currentSpeed + (allowedSpeedTarget - horseState.currentSpeed) * accelerationRate
  const fatigueScale = exhausted ? 0.2 : 1
  const staminaFatiguePenalty =
    (1 - horseState.staminaReserve) * gameConfig.simulation.staminaFatigueWeight * fatigueScale
  const effectiveSpeed = Math.max(gameConfig.simulation.minRaceSpeed, nextSpeed - staminaFatiguePenalty)
  horseState.currentSpeed = effectiveSpeed
  return effectiveSpeed * horseState.injurySpeedPenaltyMultiplier
}

const applySprintInjuryRisk = ({
  horse,
  horseState,
  rng,
  sprintApplied,
  roundSprintCount,
}: {
  horse: HorseOption
  horseState: RaceStateEntry
  rng: DeterministicRng
  sprintApplied: boolean
  roundSprintCount: number
}): boolean => {
  if (!sprintApplied || horseState.hasSprintInjury) {
    return false
  }

  const normalizedSpeed = getNormalizedBaseSpeed(horse.stats.topSpeed)
  const sprintIntent = 0.45 + horse.stats.sprintControl * 0.55
  const speedRisk = 0.2 + normalizedSpeed * 0.8
  const repeatSprintRisk = Math.min(0.4, roundSprintCount * 0.12)
  const injuryChance = Math.min(0.95, speedRisk * sprintIntent + repeatSprintRisk)
  const injuryRoll = rng.randomFloat(0, 1)

  if (injuryRoll < injuryChance) {
    horseState.hasSprintInjury = true
    horseState.injurySpeedPenaltyMultiplier = gameConfig.simulation.sprintInjurySpeedPenaltyMultiplier
    horseState.injuryPenaltyTicksRemaining = gameConfig.simulation.sprintInjuryPenaltyTicks
    horseState.staminaReserve = Math.min(horseState.staminaReserve, gameConfig.simulation.sprintInjuryStaminaCap)
    return true
  }

  return false
}

const updateBurstState = ({
  horse,
  horseState,
  rng,
  burstRoll,
}: {
  horse: HorseOption
  horseState: RaceStateEntry
  rng: DeterministicRng
  burstRoll: number
}): void => {
  if (horseState.burstTicksRemaining > 0) {
    horseState.burstTicksRemaining -= 1
    return
  }

  const burstChance = gameConfig.simulation.burstChance * horse.stats.sprintControl
  if (burstRoll < burstChance) {
    horseState.burstTicksRemaining = rng.randomInt(gameConfig.simulation.burstDurationTicksMin, gameConfig.simulation.burstDurationTicksMax)
    horseState.activeBurstMultiplier = rng.randomFloat(gameConfig.simulation.burstMultiplierMin, gameConfig.simulation.burstMultiplierMax)
    return
  }

  horseState.activeBurstMultiplier = 1
}

const applyActiveSprint = ({
  horse,
  horseState,
  rng,
  tickDistance,
  staminaDrain,
}: {
  horse: HorseOption
  horseState: RaceStateEntry
  rng: DeterministicRng
  tickDistance: number
  staminaDrain: number
}): { distance: number; sprintApplied: boolean } => {
  horseState.sprintTicksRemaining -= 1
  const sprintDistance = tickDistance + rng.randomFloat(gameConfig.simulation.sprintBonusMin, gameConfig.simulation.sprintBonusMax)
  const weightNormalized = getWeightNormalized({ horse, horseState })
  const efficiencyPenalty = 1.35 - horse.stats.efficiency * 0.5
  const kickBurn = gameConfig.simulation.kickBurnMultiplier
  horseState.staminaReserve = Math.max(0, horseState.staminaReserve - staminaDrain * efficiencyPenalty * kickBurn * (1 + weightNormalized * 0.4))
  return {
    distance: sprintDistance,
    sprintApplied: false,
  }
}

const applyInactiveSprint = ({
  horse,
  horseState,
  rng,
  tickDistance,
  sprintRoll,
  staminaDrain,
  roundSprintCount,
}: {
  horse: HorseOption
  horseState: RaceStateEntry
  rng: DeterministicRng
  tickDistance: number
  sprintRoll: number
  staminaDrain: number
  roundSprintCount: number
}): { distance: number; sprintApplied: boolean } => {
  const canStartSprint = roundSprintCount < 3
  const normalizedTopSpeed = getNormalizedBaseSpeed(horse.stats.topSpeed)
  const speedIntent = 0.35 + normalizedTopSpeed * 0.65
  const sprintApplied = canStartSprint && sprintRoll < gameConfig.simulation.sprintChance * horse.stats.sprintControl * speedIntent

  if (!sprintApplied) {
    const weightNormalized = getWeightNormalized({ horse, horseState })
    const cruiseDrain = staminaDrain * (0.3 + (1 - horse.stats.efficiency) * 0.45 + weightNormalized * 0.2)
    horseState.staminaReserve = Math.max(0, horseState.staminaReserve - cruiseDrain)
    return {
      distance: tickDistance,
      sprintApplied: false,
    }
  }

  horseState.sprintTicksRemaining = gameConfig.simulation.sprintDurationTicks - 1
  const sprintDistance = tickDistance + rng.randomFloat(gameConfig.simulation.sprintBonusMin, gameConfig.simulation.sprintBonusMax)
  const weightNormalized = getWeightNormalized({ horse, horseState })
  const kickBurn = gameConfig.simulation.kickBurnMultiplier
  const efficiencyPenalty = 1.4 - horse.stats.efficiency * 0.55
  horseState.staminaReserve = Math.max(0, horseState.staminaReserve - staminaDrain * efficiencyPenalty * kickBurn * (1 + weightNormalized * 0.35))
  return {
    distance: sprintDistance,
    sprintApplied: true,
  }
}

const calculateTickDistance = ({
  horse,
  horseState,
  rng,
  roundMultiplier,
  roundSprintCount,
  finishDistance,
  raceEnvironment,
}: {
  horse: HorseOption
  horseState: RaceStateEntry
  rng: DeterministicRng
  roundMultiplier: number
  roundSprintCount: number
  finishDistance: number
  raceEnvironment: RaceEnvironment
}): { distance: number; sprintApplied: boolean } => {
  const rolls = createTickRolls(rng)
  const isKickPhase = horseState.sprintTicksRemaining > 0
  const coreDistance = calculateBaseTickDistance({
    horse,
    horseState,
    roundMultiplier,
    accelerationRoll: rolls.acceleration,
    finishDistance,
    raceEnvironment,
    isKickPhase,
  })
  updateBurstState({
    horse,
    horseState,
    rng,
    burstRoll: rolls.burst,
  })
  const burstDistance = coreDistance * horseState.activeBurstMultiplier

  if (horseState.sprintTicksRemaining > 0) {
    return applyActiveSprint({
      horse,
      horseState,
      rng,
      tickDistance: burstDistance,
      staminaDrain: rolls.staminaDrain,
    })
  }

  return applyInactiveSprint({
    horse,
    horseState,
    rng,
    tickDistance: burstDistance,
    sprintRoll: rolls.sprint,
    staminaDrain: rolls.staminaDrain,
    roundSprintCount,
  })
}

const createRaceSnapshot = (racingState: RaceStateEntry[]): RaceResult['raceSnapshots'][number] =>
  {return racingState.map((horseState) => {return {
    id: horseState.id,
    distance: horseState.distance,
  }})}

const createRoundSummary = ({
  horses,
  racingState,
  previousDistanceByHorseId,
  sprintCountByHorseId,
  roundNumber,
  seedText,
  startTick,
  endTick,
}: {
  horses: HorseOption[]
  racingState: RaceStateEntry[]
  previousDistanceByHorseId: Map<string, number>
  sprintCountByHorseId: Map<string, number>
  roundNumber: number
  seedText: string
  startTick: number
  endTick: number
}): RaceResult['roundSummaries'][number] => {
  const roundTickCount = Math.max(1, endTick - startTick + 1)
  const horseStateById = new Map(racingState.map((entry) => {return [entry.id, entry]}))
  const horseResults = horses.map((horse) => {
    const totalDistance = horseStateById.get(horse.id)?.distance ?? 0
    const previousDistance = previousDistanceByHorseId.get(horse.id) ?? 0
    const roundDistance = totalDistance - previousDistance
    return {
      id: horse.id,
      name: horse.name,
      laneNumber: horse.laneNumber,
      roundDistance,
      totalDistance,
      finishedAtTick: horseStateById.get(horse.id)?.finishedAtTick ?? null,
      averageTickSpeed: roundDistance / roundTickCount,
      sprintCount: sprintCountByHorseId.get(horse.id) ?? 0,
    }
  })

  horseResults.sort((left, right) => {
    if (right.roundDistance !== left.roundDistance) {
      return right.roundDistance - left.roundDistance
    }

    const leftFinishedAtTick = horseStateById.get(left.id)?.finishedAtTick ?? Number.POSITIVE_INFINITY
    const rightFinishedAtTick = horseStateById.get(right.id)?.finishedAtTick ?? Number.POSITIVE_INFINITY
    if (leftFinishedAtTick !== rightFinishedAtTick) {
      return leftFinishedAtTick - rightFinishedAtTick
    }

    return left.laneNumber - right.laneNumber
  })

  return {
    roundNumber,
    seedText,
    startTick,
    endTick,
    horseResults,
  }
}

const createRoundSeedText = ({
  baseSeedText,
  roundNumber,
}: {
  baseSeedText: string
  roundNumber: number
}): string => {
  return `${baseSeedText}:round-${roundNumber}`
}

const pickWinnerId = ({
  racingState,
  horses,
}: {
  racingState: RaceStateEntry[]
  horses: HorseOption[]
}): string | null => {
  const byHorseId = new Map(horses.map((horse) => {return [horse.id, horse]}))

  const sorted = [...racingState].sort((left, right) => {
    if (right.distance !== left.distance) {
      return right.distance - left.distance
    }

    const rightFinished = right.finishedAtTick ?? Number.POSITIVE_INFINITY
    const leftFinished = left.finishedAtTick ?? Number.POSITIVE_INFINITY
    if (leftFinished !== rightFinished) {
      return leftFinished - rightFinished
    }

    const leftLane = byHorseId.get(left.id)?.laneNumber ?? Number.MAX_SAFE_INTEGER
    const rightLane = byHorseId.get(right.id)?.laneNumber ?? Number.MAX_SAFE_INTEGER
    return leftLane - rightLane
  })
  const winner = sorted.find((horseState) => {
    return (horseState.finishedAtTick ?? Number.POSITIVE_INFINITY) < gameConfig.simulation.maxTicks
  })

  return winner?.id ?? null
}

const createMetadataByHorseId = (racingState: RaceStateEntry[]): RaceResult['metadataByHorseId'] => {
  const metadataByHorseId: RaceResult['metadataByHorseId'] = {}

  for (const horseState of racingState) {
    const averageTickSpeed =
      horseState.tickSpeedSamples.length === 0? 0: horseState.tickSpeedSamples.reduce((total, speed) => {return total + speed}, 0) / horseState.tickSpeedSamples.length

    metadataByHorseId[horseState.id] = {
      raceTicksCompleted: horseState.tickSpeedSamples.length,
      finalDistance: horseState.distance,
      finishedAtTick: horseState.finishedAtTick,
      sprintCount: horseState.sprintCount,
      averageTickSpeed,
    }
  }

  return metadataByHorseId
}

const processHorseRoundTick = ({
  horseState,
  horseById,
  rng,
  roundMultiplier,
  finishDistance,
  sprintCountByHorseId,
  raceEnvironment,
}: {
  horseState: RaceStateEntry
  horseById: Map<string, HorseOption>
  rng: DeterministicRng
  roundMultiplier: number
  finishDistance: number
  sprintCountByHorseId: Map<string, number>
  raceEnvironment: RaceEnvironment
}): void => {
  if (horseState.injuryPenaltyTicksRemaining > 0) {
    horseState.injuryPenaltyTicksRemaining -= 1
  }

  if (horseState.injuryPenaltyTicksRemaining === 0 && horseState.injurySpeedPenaltyMultiplier < 1) {
    horseState.injurySpeedPenaltyMultiplier = 1
    horseState.hasSprintInjury = false
  }

  if (horseState.finishedAtTick !== null) {
    return
  }

  const horse = horseById.get(horseState.id)
  if (!horse) {
    return
  }

  const roundSprintCount = sprintCountByHorseId.get(horse.id) ?? 0
  const tickResult = calculateTickDistance({
    horse,
    horseState,
    rng,
    roundMultiplier,
    roundSprintCount,
    finishDistance,
    raceEnvironment,
  })
  const injuryTriggered = applySprintInjuryRisk({
    horse,
    horseState,
    rng,
    sprintApplied: tickResult.sprintApplied,
    roundSprintCount,
  })

  if (injuryTriggered) {
    tickResult.distance *= gameConfig.simulation.sprintInjurySpeedPenaltyMultiplier
  }

  if (tickResult.sprintApplied) {
    horseState.sprintCount += 1
    sprintCountByHorseId.set(horse.id, roundSprintCount + 1)
  }

  horseState.distance += tickResult.distance
  horseState.tickSpeedSamples.push(tickResult.distance)
  if (horseState.distance >= finishDistance) {
    horseState.distance = finishDistance
    horseState.finishedAtTick = -1
  }
}

const stampFinishedTickForRound = ({
  racingState,
  roundTick,
}: {
  racingState: RaceStateEntry[]
  roundTick: number
}): void => {
  for (const horseState of racingState) {
    if (horseState.finishedAtTick === -1) {
      horseState.finishedAtTick = roundTick
    }
  }
}

const executeRoundTicks = ({
  racingState,
  horseById,
  rng,
  roundMultiplier,
  finishDistance,
  sprintCountByHorseId,
  raceSnapshots,
  raceEnvironment,
  roundNumber,
  debugTickInterval,
}: {
  racingState: RaceStateEntry[]
  horseById: Map<string, HorseOption>
  rng: DeterministicRng
  roundMultiplier: number
  finishDistance: number
  sprintCountByHorseId: Map<string, number>
  raceSnapshots: RaceResult['raceSnapshots']
  raceEnvironment: RaceEnvironment
  roundNumber: number
  debugTickInterval: number
}): void => {
  for (let roundTick = 0; roundTick < gameConfig.simulation.maxTicks; roundTick += 1) {
    for (const horseState of racingState) {
      processHorseRoundTick({
        horseState,
        horseById,
        rng,
        roundMultiplier,
        finishDistance,
        sprintCountByHorseId,
        raceEnvironment,
      })
    }

    stampFinishedTickForRound({ racingState, roundTick })

    if (isRaceDebugLoggingEnabled() && roundTick % debugTickInterval === 0) {
      debugRoundStateSamples({
        roundNumber,
        raceEnvironment,
        racingState,
        horses: [...horseById.values()],
        roundTick,
      })
    }

    raceSnapshots.push(createRaceSnapshot(racingState))
    const allFinished = racingState.every((horseState) => {return horseState.finishedAtTick !== null})
    if (allFinished) {
      return
    }
  }
}

const settleUnfinishedHorses = ({
  racingState,
  raceSnapshots,
}: {
  racingState: RaceStateEntry[]
  raceSnapshots: RaceResult['raceSnapshots']
}): void => {
  const anyUnfinished = racingState.some((horseState) => {return horseState.finishedAtTick === null})
  if (!anyUnfinished) {
    return
  }

  for (const horseState of racingState) {
    if (horseState.finishedAtTick !== null) {
      continue
    }
    horseState.finishedAtTick = gameConfig.simulation.maxTicks
  }

  raceSnapshots.push(createRaceSnapshot(racingState))
}

const runRaceRound = ({
  horses,
  horseById,
  carryOverState,
  rng,
  roundNumber,
  raceSnapshots,
  raceEnvironment,
}: {
  horses: HorseOption[]
  horseById: Map<string, HorseOption>
  carryOverState: Map<string, RaceStateEntry>
  rng: DeterministicRng
  roundNumber: number
  raceSnapshots: RaceResult['raceSnapshots']
  raceEnvironment: RaceEnvironment
}): RoundExecution => {
  const finishDistance = getRoundTrackDistance(roundNumber)
  const roundMultiplier = getRoundSpeedMultiplier(roundNumber)
  const racingState = createInitialRaceState({ horses, carryOverState, rng })
  const sprintCountByHorseId = new Map(horses.map((horse) => {return [horse.id, 0]}))
  const previousDistanceByHorseId = new Map(horses.map((horse) => {return [horse.id, 0]}))
  const startTick = raceSnapshots.length
  const debugTickInterval = 25

  executeRoundTicks({
    racingState,
    horseById,
    rng,
    roundMultiplier,
    finishDistance,
    sprintCountByHorseId,
    raceSnapshots,
    raceEnvironment,
    roundNumber,
    debugTickInterval,
  })
  settleUnfinishedHorses({ racingState, raceSnapshots })

  const summary = createRoundSummary({
    horses,
    racingState,
    previousDistanceByHorseId,
    sprintCountByHorseId,
    roundNumber,
    seedText: rng.seedText,
    startTick,
    endTick: raceSnapshots.length - 1,
  })
  debugRoundFinishSummary({
    roundNumber,
    summary,
    horses,
  })

  return {
    finishDistance,
    racingState,
    summary,
    winnerId: summary.horseResults[0]?.id ?? null,
  }
}

/**
 * Why: produce a deterministic horse pool with balanced odds so every session can be replayed and audited.
 */
export const createHorseOptions = (rng: DeterministicRng): HorseOption[] => {
  const options: HorseOption[] = []
  const horseNames = [...styleNamePool]

  for (let index = 0; index < horseAssetConfig.totalHorseOptions; index += 1) {
    const laneNumber = index + 1
    const rawStats = createHorseBaseStats(rng)
    const styledStats = applyStyleProfile(rawStats)
    const stats = normalizeLegacyStats(styledStats)

    options.push({
      id: `horse-${laneNumber}`,
      laneNumber,
      name: buildHorseName(rng, horseNames),
      colors: createHorseColors(rng),
      stats,
      odds: {
        probability: 0,
        numerator: 1,
        denominator: 1,
        label: '1/1',
      },
      frameSequence: createWalkFrameSequence(rng),
      metadata: {
        selectedByUser: false,
        raceTicksCompleted: 0,
        finalDistance: 0,
        finishedAtTick: null,
        sprintCount: 0,
        averageTickSpeed: 0,
      },
    })
  }

  return assignHorseOdds({ horses: options })
}

/**
 * Why: keep lane geometry deterministic and derived from config so rendering and simulation remain aligned.
 */
export const createTrackLanes = (): TrackLane[] => {
  const lanes: TrackLane[] = []
  const laneHeight = Math.floor((gameConfig.track.height - gameConfig.track.laneStartY - 15) / gameConfig.raceHorseCount)

  for (let index = 0; index < gameConfig.raceHorseCount; index += 1) {
    lanes.push({
      laneNumber: index + 1,
      y: gameConfig.track.laneStartY + index * laneHeight,
      height: laneHeight,
    })
  }

  return lanes
}

/**
 * Why: run the full deterministic race simulation and return reproducible snapshots, summaries, and winner metadata.
 */
export const runDeterministicRace = ({ horses, rng }: { horses: HorseOption[]; rng: DeterministicRng }): RaceResult => {
  const raceSnapshots: RaceResult['raceSnapshots'] = []
  const roundSummaries: RaceResult['roundSummaries'] = []
  const horseById = new Map(horses.map((horse) => {return [horse.id, horse]}))
  let finishDistance = getRoundTrackDistance(gameConfig.rounds.count)
  let carryOverState = new Map<string, RaceStateEntry>()
  let lastRoundRacingState = createInitialRaceState({ horses, carryOverState, rng })
  let lastRoundWinnerId: string | null = null

  for (let roundNumber = 1; roundNumber <= gameConfig.rounds.count; roundNumber += 1) {
    const roundSeedText = createRoundSeedText({
      baseSeedText: rng.seedText,
      roundNumber,
    })
    const roundRng = createDeterministicRng(roundSeedText)
    const raceEnvironment = createRaceEnvironment(roundRng)
    const roundExecution = runRaceRound({
      horses,
      horseById,
      carryOverState,
      rng: roundRng,
      roundNumber,
      raceSnapshots,
      raceEnvironment,
    })
    finishDistance = roundExecution.finishDistance
    roundSummaries.push(roundExecution.summary)
    lastRoundRacingState = roundExecution.racingState
    carryOverState = new Map(roundExecution.racingState.map((horseState) => {
      const winnerRoundCount =
        horseState.roundWins + (roundExecution.winnerId === horseState.id ? 1 : 0)
      const winnerStaminaTax = roundExecution.winnerId === horseState.id ? 0.1 : 0
      return [
        horseState.id,
        {
          ...horseState,
          staminaReserve: Math.max(0, horseState.staminaReserve - winnerStaminaTax),
          roundWins: winnerRoundCount,
          handicapWeightKg:
            winnerRoundCount * gameConfig.simulation.handicapWeightPerWinKg,
        },
      ]
    }))
    lastRoundWinnerId = pickWinnerId({ racingState: roundExecution.racingState, horses })
  }

  return {
    winnerId: lastRoundWinnerId,
    finishDistance,
    raceSnapshots,
    roundSummaries,
    metadataByHorseId: createMetadataByHorseId(lastRoundRacingState),
  }
}

/**
 * Why: expose canonical mask colors used by sprite recoloring so rendering stays consistent across app/game layers.
 */
export const getMaskSourceColors = (): HorseColorMap => {return horseMaskColorTokens}
