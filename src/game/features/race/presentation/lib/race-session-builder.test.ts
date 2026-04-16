import { createRaceSessionBuilder } from './race-session-builder'
import type { BuildRaceSessionInput } from '../../types/race-session-builder'
import type { HorseOption } from '../../types/horse-race'

jest.mock('../../application/race-session-service', () => {
  return {
    createRaceSession: jest.fn(async ({ seedInput, selectedHorseId }) => {
      return {
        seedText: String(seedInput ?? ''),
        selectedHorseId: selectedHorseId ?? 'horse-1',
        horses: [],
        lanes: [],
        renderSheets: {},
        race: {
          winnerId: null,
          finishDistance: 1200,
          raceSnapshots: [],
          roundSummaries: [],
          metadataByHorseId: {},
        },
      }
    }),
  }
})

const createInput = (): BuildRaceSessionInput => {
  const horsePool: HorseOption[] = [
    {
      id: 'horse-1',
      laneNumber: 1,
      name: 'Horse 1',
      colors: {
        primary: '#111111',
        secondary: '#111111',
        tertiary: '#111111',
        saddle: '#111111',
      },
      stats: {
        baseSpeed: 8.2,
        accelerationBias: 0.6,
        stamina: 0.7,
        sprintControl: 0.5,
        gateJump: 0.6,
        topSpeed: 8.2,
        staminaReservoir: 0.7,
        efficiency: 0.7,
        finishDrive: 1.1,
        aerodynamics: 0.7,
        weightKg: 500,
        style: 'grinder',
        dailyForm: 1,
      },
      odds: { probability: 0.5, numerator: 1, denominator: 1, label: '1/1' },
      frameSequence: [0],
      metadata: {
        selectedByUser: false,
        raceTicksCompleted: 0,
        finalDistance: 0,
        finishedAtTick: null,
        sprintCount: 0,
        averageTickSpeed: 0,
      },
    },
    {
      id: 'horse-2',
      laneNumber: 2,
      name: 'Horse 2',
      colors: {
        primary: '#222222',
        secondary: '#222222',
        tertiary: '#222222',
        saddle: '#222222',
      },
      stats: {
        baseSpeed: 8.3,
        accelerationBias: 0.6,
        stamina: 0.7,
        sprintControl: 0.5,
        gateJump: 0.6,
        topSpeed: 8.3,
        staminaReservoir: 0.7,
        efficiency: 0.7,
        finishDrive: 1.1,
        aerodynamics: 0.7,
        weightKg: 500,
        style: 'grinder',
        dailyForm: 1,
      },
      odds: { probability: 0.5, numerator: 1, denominator: 1, label: '1/1' },
      frameSequence: [0],
      metadata: {
        selectedByUser: false,
        raceTicksCompleted: 0,
        finalDistance: 0,
        finishedAtTick: null,
        sprintCount: 0,
        averageTickSpeed: 0,
      },
    },
  ]

  return {
    selectedHorseIdsOverride: ['horse-2'],
    selectedHorseIdOverride: 'horse-2',
    selectedHorseId: 'horse-1',
    selectedHorseIds: ['horse-1', 'horse-2'],
    stakeAmount: 500,
    canPlaceBetAmount: () => {
      return true
    },
    poolSeed: 'fixed-preview-seed',
    poolHorseIds: ['horse-1', 'horse-2'],
    horsePool,
    previousRaceHorseIds: [],
    consumeReplayRequest: () => {
      return null
    },
  }
}

describe('createRaceSessionBuilder', () => {
  it('reuses pool seed when no replay is requested', async () => {
    const builder = createRaceSessionBuilder()

    const firstResult = await builder.buildRaceSession(createInput())
    const secondResult = await builder.buildRaceSession(createInput())

    expect(firstResult).not.toBeNull()
    expect(secondResult).not.toBeNull()
    expect(firstResult?.raceSession.seedText).toBe('fixed-preview-seed')
    expect(secondResult?.raceSession.seedText).toBe('fixed-preview-seed')
  })
})
