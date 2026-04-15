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
  baseSpeed: rng.randomFloat(gameConfig.simulation.baseSpeedMin, gameConfig.simulation.baseSpeedMax),
  accelerationBias: rng.randomFloat(0.1, 1),
  stamina: rng.randomFloat(0.2, 1),
  sprintControl: rng.randomFloat(0, 1),
}}

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
  {return stats.baseSpeed * 0.48 + stats.accelerationBias * 5.3 + stats.stamina * 4.1 + stats.sprintControl * 4.9}

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
}: {
  horse: HorseOption
  horseState: RaceStateEntry
  roundMultiplier: number
  accelerationRoll: number
}): number => {
  const normalizedBaseSpeed = getNormalizedBaseSpeed(horse.stats.baseSpeed)
  const baseSpeed = gameConfig.simulation.baseSpeedMin + normalizedBaseSpeed * (gameConfig.simulation.baseSpeedMax - gameConfig.simulation.baseSpeedMin)
  const accelerationBonus =
    horse.stats.accelerationBias * accelerationRoll * gameConfig.simulation.accelerationWeight +
    accelerationRoll * gameConfig.simulation.accelerationVarianceWeight
  const staminaPerformance = horse.stats.stamina * horseState.staminaReserve
  const staminaFatiguePenalty = (1 - horseState.staminaReserve) * gameConfig.simulation.staminaFatigueWeight
  return (baseSpeed + accelerationBonus + staminaPerformance - staminaFatiguePenalty) * roundMultiplier
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
  horseState,
  rng,
  tickDistance,
  staminaDrain,
}: {
  horseState: RaceStateEntry
  rng: DeterministicRng
  tickDistance: number
  staminaDrain: number
}): { distance: number; sprintApplied: boolean } => {
  horseState.sprintTicksRemaining -= 1
  const sprintDistance = tickDistance + rng.randomFloat(gameConfig.simulation.sprintBonusMin, gameConfig.simulation.sprintBonusMax)
  horseState.staminaReserve = Math.max(0, horseState.staminaReserve - staminaDrain * 1.25)
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
  const sprintApplied = canStartSprint && sprintRoll < gameConfig.simulation.sprintChance * horse.stats.sprintControl

  if (!sprintApplied) {
    horseState.staminaReserve = Math.max(0, horseState.staminaReserve - staminaDrain)
    return {
      distance: tickDistance,
      sprintApplied: false,
    }
  }

  horseState.sprintTicksRemaining = gameConfig.simulation.sprintDurationTicks - 1
  const sprintDistance = tickDistance + rng.randomFloat(gameConfig.simulation.sprintBonusMin, gameConfig.simulation.sprintBonusMax)
  horseState.staminaReserve = Math.max(0, horseState.staminaReserve - staminaDrain * 1.4)
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
}: {
  horse: HorseOption
  horseState: RaceStateEntry
  rng: DeterministicRng
  roundMultiplier: number
  roundSprintCount: number
}): { distance: number; sprintApplied: boolean } => {
  const rolls = createTickRolls(rng)
  const coreDistance = calculateBaseTickDistance({
    horse,
    horseState,
    roundMultiplier,
    accelerationRoll: rolls.acceleration,
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
  startTick,
  endTick,
}: {
  horses: HorseOption[]
  racingState: RaceStateEntry[]
  previousDistanceByHorseId: Map<string, number>
  sprintCountByHorseId: Map<string, number>
  roundNumber: number
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
      averageTickSpeed: roundDistance / roundTickCount,
      sprintCount: sprintCountByHorseId.get(horse.id) ?? 0,
    }
  })

  horseResults.sort((left, right) => {return right.roundDistance - left.roundDistance})

  return {
    roundNumber,
    startTick,
    endTick,
    horseResults,
  }
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

  return sorted[0]?.id ?? null
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

const executeRoundTicks = ({
  racingState,
  horseById,
  rng,
  roundMultiplier,
  finishDistance,
  sprintCountByHorseId,
  raceSnapshots,
}: {
  racingState: RaceStateEntry[]
  horseById: Map<string, HorseOption>
  rng: DeterministicRng
  roundMultiplier: number
  finishDistance: number
  sprintCountByHorseId: Map<string, number>
  raceSnapshots: RaceResult['raceSnapshots']
}): void => {
  for (let roundTick = 0; roundTick < gameConfig.simulation.maxTicks; roundTick += 1) {
    for (const horseState of racingState) {
      if (horseState.finishedAtTick !== null) {
        continue
      }

      const horse = horseById.get(horseState.id)
      if (!horse) {
        continue
      }

      const roundSprintCount = sprintCountByHorseId.get(horse.id) ?? 0
      const tickResult = calculateTickDistance({ horse, horseState, rng, roundMultiplier, roundSprintCount })

      if (tickResult.sprintApplied) {
        horseState.sprintCount += 1
        sprintCountByHorseId.set(horse.id, roundSprintCount + 1)
      }

      horseState.distance += tickResult.distance
      horseState.tickSpeedSamples.push(tickResult.distance)
      if (horseState.distance >= finishDistance) {
        horseState.distance = finishDistance
        horseState.finishedAtTick = roundTick
      }
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
  finishDistance,
  raceSnapshots,
}: {
  racingState: RaceStateEntry[]
  finishDistance: number
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
    horseState.distance = finishDistance
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
}: {
  horses: HorseOption[]
  horseById: Map<string, HorseOption>
  carryOverState: Map<string, RaceStateEntry>
  rng: DeterministicRng
  roundNumber: number
  raceSnapshots: RaceResult['raceSnapshots']
}): RoundExecution => {
  const finishDistance = getRoundTrackDistance(roundNumber)
  const roundMultiplier = getRoundSpeedMultiplier(roundNumber)
  const racingState = createInitialRaceState({ horses, carryOverState, rng })
  const sprintCountByHorseId = new Map(horses.map((horse) => {return [horse.id, 0]}))
  const previousDistanceByHorseId = new Map(horses.map((horse) => {return [horse.id, 0]}))
  const startTick = raceSnapshots.length

  executeRoundTicks({ racingState, horseById, rng, roundMultiplier, finishDistance, sprintCountByHorseId, raceSnapshots })
  settleUnfinishedHorses({ racingState, finishDistance, raceSnapshots })

  const summary = createRoundSummary({
    horses,
    racingState,
    previousDistanceByHorseId,
    sprintCountByHorseId,
    roundNumber,
    startTick,
    endTick: raceSnapshots.length - 1,
  })

  return {
    finishDistance,
    racingState,
    summary,
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
    const stats = createHorseBaseStats(rng)

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
    const roundExecution = runRaceRound({
      horses,
      horseById,
      carryOverState,
      rng,
      roundNumber,
      raceSnapshots,
    })
    finishDistance = roundExecution.finishDistance
    roundSummaries.push(roundExecution.summary)
    lastRoundRacingState = roundExecution.racingState
    carryOverState = new Map(roundExecution.racingState.map((horseState) => {return [horseState.id, horseState]}))
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
