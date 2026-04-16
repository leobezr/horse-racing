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
  const selectionContext = createRaceSelectionContext({
    horses,
    selectedHorseId,
    selectedHorseIds,
  })
  if (selectionContext.preselectedHorses.length > gameConfig.raceHorseCount) {
    return []
  }

  return createFinalRaceHorseSelection({
    preselectedHorses: selectionContext.preselectedHorses,
    availableHorses: selectionContext.availableHorses,
    previousRaceHorseIds,
    rng,
  })
}

const createRaceSelectionContext = ({
  horses,
  selectedHorseId,
  selectedHorseIds,
}: {
  horses: HorseOption[]
  selectedHorseId?: string
  selectedHorseIds?: string[]
}): {
  preselectedHorses: HorseOption[]
  availableHorses: HorseOption[]
} => {
  const selectedHorseIdsInput = resolveSelectedHorseIdsInput({
    selectedHorseId,
    selectedHorseIds,
  })
  const preselectedHorses = resolvePreselectedHorses({
    horses,
    selectedHorseIdsInput,
  })
  const availableHorses = resolveAvailableHorses({
    horses,
    preselectedHorses,
  })

  return {
    preselectedHorses,
    availableHorses,
  }
}

const resolvePreselectedHorses = ({
  horses,
  selectedHorseIdsInput,
}: {
  horses: HorseOption[]
  selectedHorseIdsInput: string[]
}): HorseOption[] => {
  return selectedHorseIdsInput
    .map((selectedId) => {
      return horses.find((horse) => {
        return horse.id === selectedId
      })
    })
    .filter((horse): horse is HorseOption => {
      return Boolean(horse)
    })
}

const createFinalRaceHorseSelection = ({
  preselectedHorses,
  availableHorses,
  previousRaceHorseIds,
  rng,
}: {
  preselectedHorses: HorseOption[]
  availableHorses: HorseOption[]
  previousRaceHorseIds?: string[]
  rng: DeterministicRng
}): HorseOption[] => {
  const selectionStep = createSelectionStep({
    availableHorses,
    previousRaceHorseIds,
    preselectedHorseCount: preselectedHorses.length,
    rng,
  })

  const { nonPreviousPicked, remainingHorsesNeeded } = selectionStep
  if (remainingHorsesNeeded < 1) {
    return [...preselectedHorses, ...nonPreviousPicked]
  }

  const fallbackPicked = resolveFallbackPicked({
    availableHorses,
    nonPreviousPicked,
    remainingHorsesNeeded,
    rng,
  })

  return [...preselectedHorses, ...nonPreviousPicked, ...fallbackPicked]
}

const createSelectionStep = ({
  availableHorses,
  previousRaceHorseIds,
  preselectedHorseCount,
  rng,
}: {
  availableHorses: HorseOption[]
  previousRaceHorseIds?: string[]
  preselectedHorseCount: number
  rng: DeterministicRng
}): {
  nonPreviousPicked: HorseOption[]
  remainingHorsesNeeded: number
} => {
  const nonPreviousPicked = resolveNonPreviousPicked({
    availableHorses,
    previousRaceHorseIds,
    preselectedHorseCount,
    rng,
  })
  const remainingHorsesNeeded = resolveRemainingHorsesNeeded({
    preselectedHorseCount,
    nonPreviousPickedCount: nonPreviousPicked.length,
  })

  return {
    nonPreviousPicked,
    remainingHorsesNeeded,
  }
}

const resolveRemainingHorsesNeeded = ({
  preselectedHorseCount,
  nonPreviousPickedCount,
}: {
  preselectedHorseCount: number
  nonPreviousPickedCount: number
}): number => {
  return Math.max(
    0,
    gameConfig.raceHorseCount - preselectedHorseCount - nonPreviousPickedCount,
  )
}

const resolveNonPreviousPicked = ({
  availableHorses,
  previousRaceHorseIds,
  preselectedHorseCount,
  rng,
}: {
  availableHorses: HorseOption[]
  previousRaceHorseIds?: string[]
  preselectedHorseCount: number
  rng: DeterministicRng
}): HorseOption[] => {
  const previousHorseIdSet = new Set(previousRaceHorseIds ?? [])
  const nonPreviousHorses = availableHorses.filter((horse) => {
    return !previousHorseIdSet.has(horse.id)
  })
  const horsesNeeded = Math.max(0, gameConfig.raceHorseCount - preselectedHorseCount)

  return pickRandomHorseSubset({
    horses: nonPreviousHorses,
    rng,
    count: horsesNeeded,
  })
}

const resolveFallbackPicked = ({
  availableHorses,
  nonPreviousPicked,
  remainingHorsesNeeded,
  rng,
}: {
  availableHorses: HorseOption[]
  nonPreviousPicked: HorseOption[]
  remainingHorsesNeeded: number
  rng: DeterministicRng
}): HorseOption[] => {
  const fallbackHorses = availableHorses.filter((horse) => {
    return !nonPreviousPicked.some((pickedHorse) => {
      return pickedHorse.id === horse.id
    })
  })

  return pickRandomHorseSubset({
    horses: fallbackHorses,
    rng,
    count: remainingHorsesNeeded,
  })
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
  const raceSessionContext = await createRaceSessionContext({
    seedInput,
    selectedHorseId,
    selectedHorseIds,
    horsePool,
    previousRaceHorseIds,
  })
  return buildRaceSessionFromContext({
    raceSessionContext,
    selectedHorseId,
    selectedHorseIds,
  })
}

const buildRaceSessionFromContext = ({
  raceSessionContext,
  selectedHorseId,
  selectedHorseIds,
}: {
  raceSessionContext: {
    rng: DeterministicRng
    horses: HorseOption[]
    race: RaceSession['race']
    renderSheets: RaceSession['renderSheets']
  }
  selectedHorseId?: string
  selectedHorseIds?: string[]
}): RaceSession => {
  const sessionSelection = resolveSessionSelection({
    raceSessionContext,
    selectedHorseId,
    selectedHorseIds,
  })

  return createRaceSessionOutput({
    raceSessionContext,
    resolvedSelectedId: sessionSelection.resolvedSelectedId,
  })
}

const resolveSessionSelection = ({
  raceSessionContext,
  selectedHorseId,
  selectedHorseIds,
}: {
  raceSessionContext: {
    rng: DeterministicRng
    horses: HorseOption[]
    race: RaceSession['race']
    renderSheets: RaceSession['renderSheets']
  }
  selectedHorseId?: string
  selectedHorseIds?: string[]
}): {
  resolvedSelectedId: string
} => {
  const { horses, race } = raceSessionContext
  ensureRaceHorsesAvailable(horses)

  const resolvedSelectedId = resolveSelectedHorseId({
    horses,
    selectedHorseId,
    selectedHorseIds,
  })
  applyRaceMetadataToHorses({
    horses,
    race,
    resolvedSelectedId,
  })

  return { resolvedSelectedId }
}

const createRaceSessionOutput = ({
  raceSessionContext,
  resolvedSelectedId,
}: {
  raceSessionContext: {
    rng: DeterministicRng
    horses: HorseOption[]
    race: RaceSession['race']
    renderSheets: RaceSession['renderSheets']
  }
  resolvedSelectedId: string
}): RaceSession => {
  const { rng, horses, race, renderSheets } = raceSessionContext
  return {
    seedText: rng.seedText,
    horses,
    lanes: createTrackLanes(),
    race,
    selectedHorseId: resolvedSelectedId,
    renderSheets,
  }
}

const ensureRaceHorsesAvailable = (horses: HorseOption[]): void => {
  if (horses.length === 0) {
    throw new Error('No race horses available to start session.')
  }
}

const createRaceSessionContext = async ({
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
}): Promise<{
  rng: DeterministicRng
  horses: HorseOption[]
  race: RaceSession['race']
  renderSheets: RaceSession['renderSheets']
}> => {
  const rng = createRaceSessionRng(seedInput)
  const raceContext = await createRaceSessionRaceContextFromInput({
    horsePool,
    rng,
    selectedHorseId,
    selectedHorseIds,
    previousRaceHorseIds,
  })

  return createRaceSessionContextOutput({
    rng,
    raceContext,
  })
}

const createRaceSessionRaceContextFromInput = async ({
  horsePool,
  rng,
  selectedHorseId,
  selectedHorseIds,
  previousRaceHorseIds,
}: {
  horsePool?: HorseOption[]
  rng: DeterministicRng
  selectedHorseId?: string
  selectedHorseIds?: string[]
  previousRaceHorseIds?: string[]
}) => {
  return createRaceSessionRaceContext({
    horsePool,
    rng,
    selectedHorseId,
    selectedHorseIds,
    previousRaceHorseIds,
  })
}

const createRaceSessionRng = (seedInput?: string): DeterministicRng => {
  return createDeterministicRng(resolveSessionSeedInput(seedInput))
}

const createRaceSessionContextOutput = ({
  rng,
  raceContext,
}: {
  rng: DeterministicRng
  raceContext: {
    horses: HorseOption[]
    race: RaceSession['race']
    renderSheets: RaceSession['renderSheets']
  }
}): {
  rng: DeterministicRng
  horses: HorseOption[]
  race: RaceSession['race']
  renderSheets: RaceSession['renderSheets']
} => {
  return {
    rng,
    horses: raceContext.horses,
    race: raceContext.race,
    renderSheets: raceContext.renderSheets,
  }
}

const createRaceSessionRaceContext = async ({
  horsePool,
  rng,
  selectedHorseId,
  selectedHorseIds,
  previousRaceHorseIds,
}: {
  horsePool?: HorseOption[]
  rng: DeterministicRng
  selectedHorseId?: string
  selectedHorseIds?: string[]
  previousRaceHorseIds?: string[]
}): Promise<{
  horses: HorseOption[]
  race: RaceSession['race']
  renderSheets: RaceSession['renderSheets']
}> => {
  const horses = createRaceSessionHorses({
    horsePool,
    rng,
    selectedHorseId,
    selectedHorseIds,
    previousRaceHorseIds,
  })
  return createRaceSessionRenderedData({ horses, rng })
}

const createRaceSessionRenderedData = async ({
  horses,
  rng,
}: {
  horses: HorseOption[]
  rng: DeterministicRng
}): Promise<{
  horses: HorseOption[]
  race: RaceSession['race']
  renderSheets: RaceSession['renderSheets']
}> => {
  const race = runDeterministicRace({ horses, rng })
  const renderSheets = await createRenderSheets({ horses })

  return {
    horses,
    race,
    renderSheets,
  }
}

const createRaceSessionHorses = ({
  horsePool,
  rng,
  selectedHorseId,
  selectedHorseIds,
  previousRaceHorseIds,
}: {
  horsePool?: HorseOption[]
  rng: DeterministicRng
  selectedHorseId?: string
  selectedHorseIds?: string[]
  previousRaceHorseIds?: string[]
}): HorseOption[] => {
  const resolvedHorsePool = resolveHorsePool({ horsePool, rng })
  return assignRaceLanes(pickRaceHorses({
    horses: resolvedHorsePool,
    selectedHorseId,
    selectedHorseIds,
    previousRaceHorseIds,
    rng,
  }))
}

const createRenderSheets = async ({
  horses,
}: {
  horses: HorseOption[]
}): Promise<RaceSession['renderSheets']> => {
  const loadedFramePairs = await loadHorseFrameAssets()
  return buildHorseRenderSheets({
    horses,
    loadedFramePairs,
    maskSourceColors: getMaskSourceColors(),
  })
}

export const createRacePoolPreview = async ({ seedInput }: { seedInput?: string }): Promise<RacePoolPreview> => {
  const rng = createDeterministicRng(resolveSessionSeedInput(seedInput))
  const horses = createHorseOptions(rng)
  const renderSheets = await createRenderSheets({ horses })

  return {
    seedText: rng.seedText,
    horses,
    renderSheets,
  }
}
