import { createRaceSession } from './race-session-service'
import { createDeterministicRng } from '../infrastructure/deterministic-rng'
import { createHorseOptions, runDeterministicRace } from '../domain/horse-race-domain'

jest.mock('../infrastructure/horse-asset-loader', () => {
  return {
    loadHorseFrameAssets: jest.fn(async () => {
      return []
    }),
    buildHorseRenderSheets: jest.fn(() => {
      return {}
    }),
  }
})

describe('createRaceSession', () => {
  it('keeps deterministic 10-horse subset for the same seed', async () => {
    const firstSession = await createRaceSession({
      seedInput: 'deterministic-subset-seed',
      selectedHorseId: 'horse-1',
    })
    const secondSession = await createRaceSession({
      seedInput: 'deterministic-subset-seed',
      selectedHorseId: 'horse-1',
    })

    expect(firstSession.horses.map((horse) => {return horse.id})).toEqual(
      secondSession.horses.map((horse) => {return horse.id}),
    )
  })

  it('changes 10-horse subset when seed changes', async () => {
    const firstSession = await createRaceSession({
      seedInput: 'subset-seed-a',
      selectedHorseId: 'horse-1',
    })
    const secondSession = await createRaceSession({
      seedInput: 'subset-seed-b',
      selectedHorseId: 'horse-1',
    })

    expect(firstSession.horses.map((horse) => {return horse.id})).not.toEqual(
      secondSession.horses.map((horse) => {return horse.id}),
    )
  })

  it('keeps the same 10 horses across all 6 rounds', async () => {
    const session = await createRaceSession({
      seedInput: 'fixed-race-day-seed',
      selectedHorseId: 'horse-1',
    })

    const sessionHorseIds = session.horses.map((horse) => {return horse.id}).sort()

    for (const roundSummary of session.race.roundSummaries) {
      const roundHorseIds = roundSummary.horseResults.map((horseResult) => {return horseResult.id}).sort()
      expect(roundHorseIds).toEqual(sessionHorseIds)
    }
  })

  it('generates different seeds for preview when no seed input is provided', async () => {
    const { createRacePoolPreview } = await import('./race-session-service')

    const firstPreview = await createRacePoolPreview({})
    const secondPreview = await createRacePoolPreview({})

    expect(firstPreview.seedText).not.toBe(secondPreview.seedText)
  })

  it('uses provided 20-horse pool and races only a 10-horse subset', async () => {
    const bootRng = createDeterministicRng('boot-seed')
    const horsePool = createHorseOptions(bootRng)
    const session = await createRaceSession({
      seedInput: 'race-seed-from-pool',
      selectedHorseId: horsePool[0]?.id,
      horsePool,
    })

    expect(horsePool).toHaveLength(20)
    expect(session.horses).toHaveLength(10)
    expect(session.horses.every((horse) => {return horsePool.some((poolHorse) => {return poolHorse.id === horse.id})})).toBe(true)
  })

  it('keeps all selected horses inside the race subset', async () => {
    const bootRng = createDeterministicRng('selected-horses-seed')
    const horsePool = createHorseOptions(bootRng)
    const selectedHorseIds = horsePool.slice(0, 4).map((horse) => {
      return horse.id
    })

    const session = await createRaceSession({
      seedInput: 'selected-horses-race-seed',
      selectedHorseId: selectedHorseIds[0],
      selectedHorseIds,
      horsePool,
    })

    const sessionHorseIds = session.horses.map((horse) => {
      return horse.id
    })

    for (const selectedHorseId of selectedHorseIds) {
      expect(sessionHorseIds).toContain(selectedHorseId)
    }
  })

  it('runs 20 races with same horses and different winners across seeds', async () => {
    const bootRng = createDeterministicRng('stable-race-field-seed')
    const stableHorseField = createHorseOptions(bootRng)
      .slice(0, 10)
      .map((horse, index) => {
        return {
          ...horse,
          laneNumber: index + 1,
        }
      })
    const expectedHorseIds = stableHorseField.map((horse) => {return horse.id}).sort()
    const winners = new Set<string>()

    for (let raceIndex = 1; raceIndex <= 20; raceIndex += 1) {
      const raceResult = runDeterministicRace({
        horses: stableHorseField,
        rng: createDeterministicRng(`race-seed-${raceIndex}`),
      })

      const raceHorseIds = stableHorseField.map((horse) => {return horse.id}).sort()
      expect(raceHorseIds).toEqual(expectedHorseIds)

      if (raceResult.winnerId) {
        winners.add(raceResult.winnerId)
      }
    }

    expect(winners.size).toBeGreaterThan(3)
  })

  it('picks a different 10-horse field from same 20-horse pool for next race', async () => {
    const bootRng = createDeterministicRng('pool-rotation-seed')
    const horsePool = createHorseOptions(bootRng)
    const firstSession = await createRaceSession({
      seedInput: 'rotation-race-one',
      selectedHorseId: horsePool[0]?.id,
      horsePool,
    })

    const secondSession = await createRaceSession({
      seedInput: 'rotation-race-two',
      selectedHorseId: horsePool[1]?.id,
      horsePool,
      previousRaceHorseIds: firstSession.horses.map((horse) => {
        return horse.id
      }),
    })

    const firstIds = firstSession.horses.map((horse) => {
      return horse.id
    }).sort()
    const secondIds = secondSession.horses.map((horse) => {
      return horse.id
    }).sort()

    expect(firstIds).not.toEqual(secondIds)
    expect(secondSession.horses).toHaveLength(10)
    expect(secondSession.horses.every((horse) => {
      return horsePool.some((poolHorse) => {
        return poolHorse.id === horse.id
      })
    })).toBe(true)
  })
})
