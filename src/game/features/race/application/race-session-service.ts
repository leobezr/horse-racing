import { gameConfig } from '../../../../config/game.config'
import type { HorseOption, RacePoolPreview, RaceSession } from '../types/horse-race'
import { createHorseOptions, createTrackLanes, getMaskSourceColors, runDeterministicRace } from '../domain/horse-race-domain'
import { createDeterministicRng } from '../infrastructure/deterministic-rng'
import { buildHorseRenderSheets, loadHorseFrameAssets } from '../infrastructure/horse-asset-loader'

const pickRaceHorses = ({
  horses,
  selectedHorseId,
}: {
  horses: HorseOption[]
  selectedHorseId?: string
}): HorseOption[] => {
  const picked = horses.slice(0, gameConfig.raceHorseCount)
  if (!selectedHorseId) {
    return picked
  }

  const selectedHorse = horses.find((horse) => horse.id === selectedHorseId)
  if (!selectedHorse) {
    return picked
  }

  const alreadyPicked = picked.some((horse) => horse.id === selectedHorse.id)
  if (alreadyPicked) {
    return picked
  }

  if (picked.length === 0) {
    return [selectedHorse]
  }

  return [...picked.slice(0, picked.length - 1), selectedHorse]
}

const assignRaceLanes = (horses: HorseOption[]): HorseOption[] =>
  horses.map((horse, index) => ({
    ...horse,
    laneNumber: index + 1,
  }))

export const createRaceSession = async ({
  seedInput,
  selectedHorseId,
}: {
  seedInput?: string
  selectedHorseId?: string
}): Promise<RaceSession> => {
  const rng = createDeterministicRng(seedInput ?? gameConfig.defaultRaceSeed)
  const horsePool = createHorseOptions(rng)
  const horses = assignRaceLanes(pickRaceHorses({ horses: horsePool, selectedHorseId }))
  const selectedId = selectedHorseId ?? horses[0]?.id ?? ''

  if (horses.length === 0) {
    throw new Error('No race horses available to start session.')
  }

  const selectedHorseExists = horses.some((horse) => horse.id === selectedId)
  const resolvedSelectedId = selectedHorseExists ? selectedId : horses[0].id

  for (const horse of horses) {
    horse.metadata.selectedByUser = horse.id === resolvedSelectedId
  }

  const race = runDeterministicRace({ horses, rng })
  for (const horse of horses) {
    const raceMetadata = race.metadataByHorseId[horse.id]
    horse.metadata.raceTicksCompleted = raceMetadata.raceTicksCompleted
    horse.metadata.finalDistance = raceMetadata.finalDistance
    horse.metadata.finishedAtTick = raceMetadata.finishedAtTick
    horse.metadata.sprintCount = raceMetadata.sprintCount
    horse.metadata.averageTickSpeed = raceMetadata.averageTickSpeed
  }

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
  const rng = createDeterministicRng(seedInput ?? gameConfig.defaultRaceSeed)
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
