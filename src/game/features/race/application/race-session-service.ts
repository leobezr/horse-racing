import { gameConfig } from '../../../../config/game.config'
import type { HorseOption, RacePoolPreview, RaceSession } from '../types/horse-race'
import type { DeterministicRng } from '../types/rng'
import { createHorseOptions, createTrackLanes, getMaskSourceColors, runDeterministicRace } from '../domain/horse-race-domain'
import { createDeterministicRng } from '../infrastructure/deterministic-rng'
import { buildHorseRenderSheets, loadHorseFrameAssets } from '../infrastructure/horse-asset-loader'
import { createHiddenSeed } from './race-seed-service'

const resolveSessionSeedInput = (seedInput?: string): string => {
  if (typeof seedInput === 'string' && seedInput.trim().length > 0) {
    return seedInput.trim()
  }

  return createHiddenSeed()
}

const pickRandomHorseSubset = ({
  horses,
  rng,
  count,
}: {
  horses: HorseOption[]
  rng: DeterministicRng
  count: number
}): HorseOption[] => {
  const remaining = [...horses]
  const picked: HorseOption[] = []

  while (remaining.length > 0 && picked.length < count) {
    const index = rng.randomInt(0, remaining.length - 1)
    const horse = remaining.splice(index, 1)[0]
    if (horse) {
      picked.push(horse)
    }
  }

  return picked
}

const pickRaceHorses = ({
  horses,
  selectedHorseId,
  selectedHorseIds,
  previousRaceHorseIds,
  rng,
}: {
  horses: HorseOption[]
  selectedHorseId?: string
  selectedHorseIds?: string[]
  previousRaceHorseIds?: string[]
  rng: DeterministicRng
}): HorseOption[] => {
  const selectedHorseIdsInput = resolveSelectedHorseIdsInput({
    selectedHorseId,
    selectedHorseIds,
  })

  const preselectedHorses = selectedHorseIdsInput.map((selectedId) => {
    return horses.find((horse) => {return horse.id === selectedId})
  }).filter((horse): horse is HorseOption => {
    return Boolean(horse)
  })

  if (preselectedHorses.length > gameConfig.raceHorseCount) {
    return []
  }

  const availableHorses = resolveAvailableHorses({
    horses,
    preselectedHorses,
  })
  const previousHorseIdSet = new Set(previousRaceHorseIds ?? [])
  const nonPreviousHorses = availableHorses.filter((horse) => {
    return !previousHorseIdSet.has(horse.id)
  })
  const horsesNeeded = Math.max(0, gameConfig.raceHorseCount - preselectedHorses.length)
  const nonPreviousPicked = pickRandomHorseSubset({
    horses: nonPreviousHorses,
    rng,
    count: horsesNeeded,
  })

  const remainingHorsesNeeded = Math.max(0, horsesNeeded - nonPreviousPicked.length)
  if (remainingHorsesNeeded < 1) {
    return [...preselectedHorses, ...nonPreviousPicked]
  }

  const fallbackHorses = availableHorses.filter((horse) => {
    return !nonPreviousPicked.some((pickedHorse) => {
      return pickedHorse.id === horse.id
    })
  })
  const fallbackPicked = pickRandomHorseSubset({
    horses: fallbackHorses,
    rng,
    count: remainingHorsesNeeded,
  })

  return [...preselectedHorses, ...nonPreviousPicked, ...fallbackPicked]
}

const resolveSelectedHorseIdsInput = ({
  selectedHorseId,
  selectedHorseIds,
}: {
  selectedHorseId?: string
  selectedHorseIds?: string[]
}): string[] => {
  if (selectedHorseIds && selectedHorseIds.length > 0) {
    return selectedHorseIds
  }

  if (selectedHorseId) {
    return [selectedHorseId]
  }

  return []
}

const resolveAvailableHorses = ({
  horses,
  preselectedHorses,
}: {
  horses: HorseOption[]
  preselectedHorses: HorseOption[]
}): HorseOption[] => {
  return horses.filter((horse) => {
    return !preselectedHorses.some((selectedHorse) => {
      return selectedHorse.id === horse.id
    })
  })
}

const resolveHorsePool = ({
  horsePool,
  rng,
}: {
  horsePool?: HorseOption[]
  rng: DeterministicRng
}): HorseOption[] => {
  if (horsePool && horsePool.length > 0) {
    return horsePool
  }

  return createHorseOptions(rng)
}

const applyRaceMetadataToHorses = ({
  horses,
  race,
  resolvedSelectedId,
}: {
  horses: HorseOption[]
  race: RaceSession['race']
  resolvedSelectedId: string
}): void => {
  for (const horse of horses) {
    horse.metadata.selectedByUser = horse.id === resolvedSelectedId
    const raceMetadata = race.metadataByHorseId[horse.id]
    horse.metadata.raceTicksCompleted = raceMetadata.raceTicksCompleted
    horse.metadata.finalDistance = raceMetadata.finalDistance
    horse.metadata.finishedAtTick = raceMetadata.finishedAtTick
    horse.metadata.sprintCount = raceMetadata.sprintCount
    horse.metadata.averageTickSpeed = raceMetadata.averageTickSpeed
  }
}

const resolveSelectedHorseId = ({
  horses,
  selectedHorseId,
  selectedHorseIds,
}: {
  horses: HorseOption[]
  selectedHorseId?: string
  selectedHorseIds?: string[]
}): string => {
  const selectedId = selectedHorseIds?.[0] ?? selectedHorseId ?? horses[0]?.id ?? ''
  const selectedHorseExists = horses.some((horse) => {
    return horse.id === selectedId
  })

  if (selectedHorseExists) {
    return selectedId
  }

  return horses[0].id
}

const assignRaceLanes = (horses: HorseOption[]): HorseOption[] => {
  return horses.map((horse, index) => {
    return {
      ...horse,
      laneNumber: index + 1,
    }
  })
}

export const createRaceSession = async ({
  seedInput,
  selectedHorseId,
  selectedHorseIds,
  horsePool,
  previousRaceHorseIds,
}: {
  seedInput?: string
  selectedHorseId?: string
  selectedHorseIds?: string[]
  horsePool?: HorseOption[]
  previousRaceHorseIds?: string[]
}): Promise<RaceSession> => {
  const rng = createDeterministicRng(resolveSessionSeedInput(seedInput))
  const resolvedHorsePool = resolveHorsePool({ horsePool, rng })
  const horses = assignRaceLanes(pickRaceHorses({
    horses: resolvedHorsePool,
    selectedHorseId,
    selectedHorseIds,
    previousRaceHorseIds,
    rng,
  }))

  if (horses.length === 0) {
    throw new Error('No race horses available to start session.')
  }

  const resolvedSelectedId = resolveSelectedHorseId({
    horses,
    selectedHorseId,
    selectedHorseIds,
  })

  const race = runDeterministicRace({ horses, rng })
  applyRaceMetadataToHorses({
    horses,
    race,
    resolvedSelectedId,
  })

  const lanes = createTrackLanes()
  const loadedFramePairs = await loadHorseFrameAssets()
  const renderSheets = buildHorseRenderSheets({
    horses,
    loadedFramePairs,
    maskSourceColors: getMaskSourceColors(),
  })

  return {
    seedText: rng.seedText,
    horses,
    lanes,
    race,
    selectedHorseId: resolvedSelectedId,
    renderSheets,
  }
}

export const createRacePoolPreview = async ({ seedInput }: { seedInput?: string }): Promise<RacePoolPreview> => {
  const rng = createDeterministicRng(resolveSessionSeedInput(seedInput))
  const horses = createHorseOptions(rng)
  const loadedFramePairs = await loadHorseFrameAssets()

  const renderSheets = buildHorseRenderSheets({
    horses,
    loadedFramePairs,
    maskSourceColors: getMaskSourceColors(),
  })

  return {
    seedText: rng.seedText,
    horses,
    renderSheets,
  }
}
