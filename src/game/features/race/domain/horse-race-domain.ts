import { gameConfig } from '../../../../config/game.config'
import type { HorseColorMap, HorseOption, HorseOdds, RaceResult, RaceStateEntry, TrackLane } from '../types/horse-race'
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

const clampColorChannel = (value: number): number => Math.max(0, Math.min(255, value))

const toHexColor = (color: { red: number; green: number; blue: number }): string =>
  `#${[color.red, color.green, color.blue]
    .map((channel) => clampColorChannel(channel).toString(16).padStart(2, '0'))
    .join('')}`

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

const createHorseBaseStats = (rng: DeterministicRng): HorseOption['stats'] => ({
  baseSpeed: rng.randomFloat(gameConfig.simulation.baseSpeedMin, gameConfig.simulation.baseSpeedMax),
  accelerationBias: rng.randomFloat(0.1, 1),
  stamina: rng.randomFloat(0.2, 1),
  sprintControl: rng.randomFloat(0, 1),
})

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
  stats.baseSpeed * 0.48 + stats.accelerationBias * 5.3 + stats.stamina * 4.1 + stats.sprintControl * 4.9

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

  const scores = horses.map((horse) => createTrueProbabilityScore(horse.stats))
  const scoreSum = scores.reduce((sum, score) => sum + score, 0)
  const normalizedProbabilities =
    scoreSum > 0 ? scores.map((score) => score / scoreSum) : horses.map(() => 1 / horses.length)

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

  return horses.map((horse) => ({
    ...horse,
    odds: oddsByHorseId.get(horse.id) ?? {
      probability: 1 / horses.length,
      numerator: 1,
      denominator: 1,
      label: '1/1',
    },
  }))
}

const createWalkFrameSequence = (rng: DeterministicRng): number[] => {
  const rotatedStart = rng.randomInt(0, horseWalkFrameIndices.length - 1)
  const ordered: number[] = []

  for (let index = 0; index < horseWalkFrameIndices.length; index += 1) {
    ordered.push(horseWalkFrameIndices[(rotatedStart + index) % horseWalkFrameIndices.length])
  }

  return ordered
}

const createInitialRaceState = (horses: HorseOption[]): RaceStateEntry[] =>
  horses.map((horse) => ({
    id: horse.id,
    distance: 0,
    tickSpeedSamples: [],
    finishedAtTick: null,
    sprintCount: 0,
    sprintTicksRemaining: 0,
  }))

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

const calculateTickDistance = ({
  horse,
  horseState,
  rng,
  roundMultiplier,
  roundSprintCount,
  roundTick,
  ticksPerRound,
  roundFinishDistance,
}: {
  horse: HorseOption
  horseState: RaceStateEntry
  rng: DeterministicRng
  roundMultiplier: number
  roundSprintCount: number
  roundTick: number
  ticksPerRound: number
  roundFinishDistance: number
}): { distance: number; sprintApplied: boolean } => {
  const accelerationRoll = rng.randomFloat(0, 1)
  const sprintRoll = rng.randomFloat(0, 1)

  const remainingTicks = Math.max(1, ticksPerRound - roundTick)
  const remainingDistance = Math.max(0, roundFinishDistance - horseState.distance)
  const durationPace = remainingDistance / remainingTicks
  const normalizedBaseSpeed = getNormalizedBaseSpeed(horse.stats.baseSpeed)

  const baseSpeedFactor = 0.9 + normalizedBaseSpeed * 0.2
  const accelerationFactor = 0.9 + horse.stats.accelerationBias * accelerationRoll * 0.2
  const staminaFactor = 0.9 + horse.stats.stamina * 0.15

  let tickDistance = durationPace * baseSpeedFactor * accelerationFactor * staminaFactor * roundMultiplier

  const hasActiveSprint = horseState.sprintTicksRemaining > 0
  if (hasActiveSprint) {
    horseState.sprintTicksRemaining -= 1
    const sprintPercentBoost = rng.randomFloat(gameConfig.simulation.sprintBonusMin, gameConfig.simulation.sprintBonusMax) / 100
    tickDistance *= 1 + sprintPercentBoost
    return {
      distance: tickDistance,
      sprintApplied: false,
    }
  }

  const canStartSprint = roundSprintCount < 3
  const sprintApplied = canStartSprint && sprintRoll < gameConfig.simulation.sprintChance * horse.stats.sprintControl

  if (sprintApplied) {
    horseState.sprintTicksRemaining = gameConfig.simulation.sprintDurationTicks - 1
    const sprintPercentBoost = rng.randomFloat(gameConfig.simulation.sprintBonusMin, gameConfig.simulation.sprintBonusMax) / 100
    tickDistance *= 1 + sprintPercentBoost
  }

  return {
    distance: tickDistance,
    sprintApplied,
  }
}

const createRaceSnapshot = (racingState: RaceStateEntry[]): RaceResult['raceSnapshots'][number] =>
  racingState.map((horseState) => ({
    id: horseState.id,
    distance: horseState.distance,
  }))

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
  const horseResults = horses.map((horse) => {
    const horseState = racingState.find((entry) => entry.id === horse.id)
    const totalDistance = horseState?.distance ?? 0
    const previousDistance = previousDistanceByHorseId.get(horse.id) ?? 0
    const roundDistance = totalDistance - previousDistance
    const roundTickCount = Math.max(1, endTick - startTick + 1)
    const averageTickSpeed = roundDistance / roundTickCount

    return {
      id: horse.id,
      name: horse.name,
      laneNumber: horse.laneNumber,
      roundDistance,
      totalDistance,
      averageTickSpeed,
      sprintCount: sprintCountByHorseId.get(horse.id) ?? 0,
    }
  })

  horseResults.sort((left, right) => right.roundDistance - left.roundDistance)

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
  const byHorseId = new Map(horses.map((horse) => [horse.id, horse]))

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
      horseState.tickSpeedSamples.length === 0
        ? 0
        : horseState.tickSpeedSamples.reduce((total, speed) => total + speed, 0) / horseState.tickSpeedSamples.length

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

export const runDeterministicRace = ({ horses, rng }: { horses: HorseOption[]; rng: DeterministicRng }): RaceResult => {
  const raceSnapshots: RaceResult['raceSnapshots'] = []
  const roundSummaries: RaceResult['roundSummaries'] = []
  const horseById = new Map(horses.map((horse) => [horse.id, horse]))

  const ticksPerRound = Math.floor((gameConfig.rounds.secondsPerRound * 1000) / gameConfig.animation.tickMs)
  let finishDistance = getRoundTrackDistance(gameConfig.rounds.count)

  let roundStartTick = 0
  let lastRoundRacingState = createInitialRaceState(horses)
  let lastRoundWinnerId: string | null = null

  for (let roundNumber = 1; roundNumber <= gameConfig.rounds.count; roundNumber += 1) {
    finishDistance = getRoundTrackDistance(roundNumber)
    const roundMultiplier = getRoundSpeedMultiplier(roundNumber)
    const racingState = createInitialRaceState(horses)
    const previousDistanceByHorseId = new Map(horses.map((horse) => [horse.id, 0]))
    const sprintCountByHorseId = new Map(horses.map((horse) => [horse.id, 0]))
    const currentRoundStartTick = raceSnapshots.length

    for (let roundTick = 0; roundTick < ticksPerRound; roundTick += 1) {
      for (const horseState of racingState) {
        if (horseState.finishedAtTick !== null) {
          continue
        }

        const horse = horseById.get(horseState.id)
        if (!horse) {
          continue
        }

        const roundSprintCount = sprintCountByHorseId.get(horse.id) ?? 0
        const tickResult = calculateTickDistance({
          horse,
          horseState,
          rng,
          roundMultiplier,
          roundSprintCount,
          roundTick,
          ticksPerRound,
          roundFinishDistance: finishDistance,
        })

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

      const allFinished = racingState.every((horseState) => horseState.finishedAtTick !== null)
      if (allFinished) {
        break
      }
    }

    const roundEndTick = raceSnapshots.length - 1
    roundSummaries.push(
      createRoundSummary({
        horses,
        racingState,
        previousDistanceByHorseId,
        sprintCountByHorseId,
        roundNumber,
        startTick: currentRoundStartTick,
        endTick: roundEndTick,
      }),
    )

    roundStartTick = roundEndTick + 1
    lastRoundRacingState = racingState
    lastRoundWinnerId = pickWinnerId({ racingState, horses })
  }

  return {
    winnerId: lastRoundWinnerId,
    finishDistance,
    raceSnapshots,
    roundSummaries,
    metadataByHorseId: createMetadataByHorseId(lastRoundRacingState),
  }
}

export const getMaskSourceColors = (): HorseColorMap => horseMaskColorTokens
