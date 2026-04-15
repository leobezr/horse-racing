export type HorseColorSlot = 'primary' | 'secondary' | 'tertiary' | 'saddle'

export type HorseColorMap = Record<HorseColorSlot, string>

export type HorseOdds = {
  probability: number
  numerator: number
  denominator: number
  label: string
}

export type HorseStats = {
  baseSpeed: number
  accelerationBias: number
  stamina: number
  sprintControl: number
}

export type HorseRuntimeMetadata = {
  selectedByUser: boolean
  raceTicksCompleted: number
  finalDistance: number
  finishedAtTick: number | null
  sprintCount: number
  averageTickSpeed: number
}

export type RoundHorseResult = {
  id: string
  name: string
  laneNumber: number
  roundDistance: number
  totalDistance: number
  averageTickSpeed: number
  sprintCount: number
}

export type RaceRoundSummary = {
  roundNumber: number
  startTick: number
  endTick: number
  horseResults: RoundHorseResult[]
}

export type LiveHorseProgress = {
  id: string
  name: string
  laneNumber: number
  distance: number
  distanceToFinish: number
  estimatedSecondsToFinish: number | null
}

export type HorseOption = {
  id: string
  laneNumber: number
  name: string
  colors: HorseColorMap
  stats: HorseStats
  odds: HorseOdds
  frameSequence: number[]
  metadata: HorseRuntimeMetadata
}

export type TrackLane = {
  laneNumber: number
  y: number
  height: number
}

export type RaceSnapshot = {
  id: string
  distance: number
}[]

export type RaceStateEntry = {
  id: string
  distance: number
  tickSpeedSamples: number[]
  finishedAtTick: number | null
  sprintCount: number
  sprintTicksRemaining: number
}

export type RaceResult = {
  winnerId: string | null
  finishDistance: number
  raceSnapshots: RaceSnapshot[]
  roundSummaries: RaceRoundSummary[]
  metadataByHorseId: Record<string, Omit<HorseRuntimeMetadata, 'selectedByUser'>>
}

export type LiveRaceRound = {
  roundNumber: number
  roundSecondsRemaining: number
}

export type HorseFramePair = {
  spritePath: string
  maskPath: string
}

export type LoadedHorseFramePair = {
  spriteImage: HTMLImageElement
  maskImage: HTMLImageElement
}

export type HorseRenderSheets = Record<string, HTMLCanvasElement[]>
export type HorsePool = HorseOption[]

export type RaceSession = {
  seedText: string
  horses: HorseOption[]
  lanes: TrackLane[]
  race: RaceResult
  selectedHorseId: string
  renderSheets: HorseRenderSheets
}

export type RacePoolPreview = {
  seedText: string
  horses: HorseOption[]
  renderSheets: HorseRenderSheets
}
