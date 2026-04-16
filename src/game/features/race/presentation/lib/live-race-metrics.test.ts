import { gameConfig } from '../../../../../config/game.config'
import { createLiveHorseProgress } from './live-race-metrics'
import type { HorseOption } from '../../types/horse-race'

const createHorse = ({ id, laneNumber }: { id: string; laneNumber: number }): HorseOption => {
  return {
    id,
    laneNumber,
    name: id,
    colors: {
      primary: '#111111',
      secondary: '#222222',
      tertiary: '#333333',
      saddle: '#444444',
    },
    stats: {
      baseSpeed: 8.5,
      accelerationBias: 0.6,
      stamina: 0.7,
      sprintControl: 0.5,
      gateJump: 0.6,
      topSpeed: 8.5,
      staminaReservoir: 0.7,
      efficiency: 0.7,
      finishDrive: 1.1,
      aerodynamics: 0.6,
      weightKg: 500,
      style: 'grinder',
      dailyForm: 1,
    },
    odds: {
      probability: 0.5,
      numerator: 1,
      denominator: 1,
      label: '1/1',
    },
    frameSequence: [0],
    metadata: {
      selectedByUser: false,
      raceTicksCompleted: 0,
      finalDistance: 0,
      finishedAtTick: null,
      sprintCount: 0,
      averageTickSpeed: 0,
    },
  }
}

describe('createLiveHorseProgress', () => {
  it('freezes race time as soon as horse reaches finish distance', () => {
    const horses = [
      {
        ...createHorse({ id: 'horse-1', laneNumber: 1 }),
        metadata: {
          selectedByUser: false,
          raceTicksCompleted: 0,
          finalDistance: 1200,
          finishedAtTick: null,
          sprintCount: 0,
          averageTickSpeed: 8,
        },
      },
    ]

    const tickIndex = 40
    const progress = createLiveHorseProgress({
      horses,
      snapshotByHorseId: new Map([
        ['horse-1', 1200],
      ]),
      finishDistance: 1200,
      tickIndex,
      raceSnapshots: Array.from({ length: tickIndex + 1 }, (_, index) => {
        if (index < 8) {
          return [{ id: 'horse-1', distance: 800 }]
        }

        return [{ id: 'horse-1', distance: 1200 }]
      }),
      roundSummaries: [{
        roundNumber: 1,
        seedText: 'round-1-seed',
        startTick: 0,
        endTick: 200,
        horseResults: [],
      }],
    })

    const finishedHorse = progress[0]
    const expectedFinishTimeSeconds = Number.parseFloat(
      (((8 + 1) * gameConfig.animation.tickMs) / 1000).toFixed(2),
    )

    expect(finishedHorse).toBeDefined()
    expect(finishedHorse?.raceTimeSeconds).toBe(expectedFinishTimeSeconds)
  })

  it('does not clamp finished horse race time to round duration', () => {
    const horses = [
      {
        ...createHorse({ id: 'horse-1', laneNumber: 1 }),
        metadata: {
          selectedByUser: false,
          raceTicksCompleted: 0,
          finalDistance: 1200,
          finishedAtTick: null,
          sprintCount: 0,
          averageTickSpeed: 8,
        },
      },
    ]

    const roundTickLength = Math.floor(
      (gameConfig.rounds.secondsPerRound * 1000) / gameConfig.animation.tickMs,
    )
    const finishTick = roundTickLength + 25
    const progress = createLiveHorseProgress({
      horses,
      snapshotByHorseId: new Map([
        ['horse-1', 1200],
      ]),
      finishDistance: 1200,
      tickIndex: finishTick + 10,
      raceSnapshots: Array.from({ length: finishTick + 20 }, (_, index) => {
        if (index < finishTick) {
          return [{ id: 'horse-1', distance: 1100 }]
        }

        return [{ id: 'horse-1', distance: 1200 }]
      }),
      roundSummaries: [{
        roundNumber: 1,
        seedText: 'round-1-seed',
        startTick: 0,
        endTick: finishTick + 10,
        horseResults: [],
      }],
    })

    const finishedHorse = progress[0]
    const expectedFinishTimeSeconds = Number.parseFloat(
      (((finishTick + 1) * gameConfig.animation.tickMs) / 1000).toFixed(2),
    )

    expect(finishedHorse).toBeDefined()
    expect(finishedHorse?.raceTimeSeconds).toBe(expectedFinishTimeSeconds)
    expect(finishedHorse?.raceTimeSeconds).toBeGreaterThan(gameConfig.rounds.secondsPerRound)
  })

  it('uses per-horse finish time and not a shared race tick time', () => {
    const horses = [
      {
        ...createHorse({ id: 'horse-1', laneNumber: 1 }),
        metadata: {
          selectedByUser: false,
          raceTicksCompleted: 0,
          finalDistance: 1200,
          finishedAtTick: 90,
          sprintCount: 0,
          averageTickSpeed: 8,
        },
      },
      {
        ...createHorse({ id: 'horse-2', laneNumber: 2 }),
        metadata: {
          selectedByUser: false,
          raceTicksCompleted: 0,
          finalDistance: 1200,
          finishedAtTick: 120,
          sprintCount: 0,
          averageTickSpeed: 8,
        },
      },
    ]

    const progress = createLiveHorseProgress({
      horses,
      snapshotByHorseId: new Map([
        ['horse-1', 1200],
        ['horse-2', 1200],
      ]),
      finishDistance: 1200,
      tickIndex: 150,
      raceSnapshots: [
        [{ id: 'horse-1', distance: 0 }, { id: 'horse-2', distance: 0 }],
        [{ id: 'horse-1', distance: 1200 }, { id: 'horse-2', distance: 0 }],
        [{ id: 'horse-1', distance: 1200 }, { id: 'horse-2', distance: 1200 }],
      ],
      roundSummaries: [{
        roundNumber: 1,
        seedText: 'round-1-seed',
        startTick: 0,
        endTick: 200,
        horseResults: [],
      }],
    })

    const firstHorse = progress.find((horse) => {return horse.id === 'horse-1'})
    const secondHorse = progress.find((horse) => {return horse.id === 'horse-2'})

    expect(firstHorse).toBeDefined()
    expect(secondHorse).toBeDefined()
    expect(firstHorse?.raceTimeSeconds).toBeLessThan(secondHorse?.raceTimeSeconds ?? Number.MAX_VALUE)
  })

  it('resets race time at each round start', () => {
    const horses = [
      {
        ...createHorse({ id: 'horse-1', laneNumber: 1 }),
        metadata: {
          selectedByUser: false,
          raceTicksCompleted: 0,
          finalDistance: 1200,
          finishedAtTick: null,
          sprintCount: 0,
          averageTickSpeed: 8,
        },
      },
    ]

    const roundTickLength = Math.floor(
      (gameConfig.rounds.secondsPerRound * 1000) / gameConfig.animation.tickMs,
    )
    const roundTwoStartTick = roundTickLength
    const roundTwoProgress = createLiveHorseProgress({
      horses,
      snapshotByHorseId: new Map([
        ['horse-1', 20],
      ]),
      finishDistance: 1300,
      tickIndex: roundTwoStartTick,
      raceSnapshots: Array.from({ length: roundTwoStartTick + 2 }, () => {
        return [{ id: 'horse-1', distance: 20 }]
      }),
      roundSummaries: [
        {
          roundNumber: 1,
          seedText: 'round-1-seed',
          startTick: 0,
          endTick: roundTwoStartTick - 1,
          horseResults: [],
        },
        {
          roundNumber: 2,
          seedText: 'round-2-seed',
          startTick: roundTwoStartTick,
          endTick: roundTwoStartTick + 100,
          horseResults: [],
        },
      ],
    })

    const firstHorse = roundTwoProgress[0]

    expect(firstHorse).toBeDefined()
    expect(firstHorse?.raceTimeSeconds).toBeLessThan(1)
  })

  it('keeps first finisher ahead when multiple horses hit finish distance', () => {
    const horses = [
      {
        ...createHorse({ id: 'horse-1', laneNumber: 2 }),
        metadata: {
          selectedByUser: false,
          raceTicksCompleted: 0,
          finalDistance: 1200,
          finishedAtTick: null,
          sprintCount: 0,
          averageTickSpeed: 8,
        },
      },
      {
        ...createHorse({ id: 'horse-2', laneNumber: 1 }),
        metadata: {
          selectedByUser: false,
          raceTicksCompleted: 0,
          finalDistance: 1200,
          finishedAtTick: null,
          sprintCount: 0,
          averageTickSpeed: 8,
        },
      },
    ]

    const progress = createLiveHorseProgress({
      horses,
      snapshotByHorseId: new Map([
        ['horse-1', 1200],
        ['horse-2', 1200],
      ]),
      finishDistance: 1200,
      tickIndex: 20,
      raceSnapshots: Array.from({ length: 21 }, (_, index) => {
        if (index < 8) {
          return [
            { id: 'horse-1', distance: 900 },
            { id: 'horse-2', distance: 900 },
          ]
        }

        if (index < 12) {
          return [
            { id: 'horse-1', distance: 1200 },
            { id: 'horse-2', distance: 1100 },
          ]
        }

        return [
          { id: 'horse-1', distance: 1200 },
          { id: 'horse-2', distance: 1200 },
        ]
      }),
      roundSummaries: [
        {
          roundNumber: 1,
          seedText: 'round-1-seed',
          startTick: 0,
          endTick: 40,
          horseResults: [],
        },
      ],
    })

    expect(progress[0]?.id).toBe('horse-1')
    expect(progress[1]?.id).toBe('horse-2')
  })
})
