import { createTrackCanvasRenderer, getPodiumLaneMap } from "./track-canvas-renderer";
import type { RaceSession } from "../../types/horse-race";

const createSession = (): RaceSession => {
  return {
    seedText: "seed-1",
    selectedHorseId: "horse-1",
    renderSheets: {
      "horse-1": [],
      "horse-2": [],
      "horse-3": [],
    },
    lanes: [
      { laneNumber: 1, y: 0, height: 40 },
      { laneNumber: 2, y: 40, height: 40 },
      { laneNumber: 3, y: 80, height: 40 },
    ],
    horses: [
      {
        id: "horse-1",
        laneNumber: 1,
        name: "Horse One",
        colors: {
          primary: "#111111",
          secondary: "#222222",
          tertiary: "#333333",
          saddle: "#444444",
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
          style: "grinder",
          dailyForm: 1,
        },
        odds: {
          probability: 0.33,
          numerator: 2,
          denominator: 1,
          label: "2/1",
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
      },
      {
        id: "horse-2",
        laneNumber: 2,
        name: "Horse Two",
        colors: {
          primary: "#111111",
          secondary: "#222222",
          tertiary: "#333333",
          saddle: "#444444",
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
          style: "grinder",
          dailyForm: 1,
        },
        odds: {
          probability: 0.33,
          numerator: 2,
          denominator: 1,
          label: "2/1",
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
      },
      {
        id: "horse-3",
        laneNumber: 3,
        name: "Horse Three",
        colors: {
          primary: "#111111",
          secondary: "#222222",
          tertiary: "#333333",
          saddle: "#444444",
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
          style: "grinder",
          dailyForm: 1,
        },
        odds: {
          probability: 0.33,
          numerator: 2,
          denominator: 1,
          label: "2/1",
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
      },
    ],
    race: {
      winnerId: null,
      finishDistance: 1200,
      roundSummaries: [
        {
          roundNumber: 1,
          seedText: "seed-1:round-1",
          startTick: 0,
          endTick: 20,
          horseResults: [],
        },
      ],
      raceSnapshots: Array.from({ length: 21 }, (_, index) => {
        if (index < 8) {
          return [
            { id: "horse-1", distance: 900 },
            { id: "horse-2", distance: 900 },
            { id: "horse-3", distance: 880 },
          ];
        }

        if (index < 12) {
          return [
            { id: "horse-1", distance: 1200 },
            { id: "horse-2", distance: 1100 },
            { id: "horse-3", distance: 1050 },
          ];
        }

        return [
          { id: "horse-1", distance: 1200 },
          { id: "horse-2", distance: 1200 },
          { id: "horse-3", distance: 1190 },
        ];
      }),
      metadataByHorseId: {
        "horse-1": {
          raceTicksCompleted: 0,
          finalDistance: 0,
          finishedAtTick: null,
          sprintCount: 0,
          averageTickSpeed: 0,
        },
        "horse-2": {
          raceTicksCompleted: 0,
          finalDistance: 0,
          finishedAtTick: null,
          sprintCount: 0,
          averageTickSpeed: 0,
        },
        "horse-3": {
          raceTicksCompleted: 0,
          finalDistance: 0,
          finishedAtTick: null,
          sprintCount: 0,
          averageTickSpeed: 0,
        },
      },
    },
  };
};

describe("track-canvas-renderer", () => {
  it("builds podium lane map with finish-tick tiebreak", () => {
    const session = createSession();
    const podiumLaneMap = getPodiumLaneMap({
      session,
      tickIndex: 20,
      raceFinishDistance: 1200,
      snapshotByHorseId: new Map<string, number>([
        ["horse-1", 1200],
        ["horse-2", 1200],
        ["horse-3", 1190],
      ]),
    });

    expect(podiumLaneMap.get(1)).toBe(1);
    expect(podiumLaneMap.get(2)).toBe(2);
    expect(podiumLaneMap.get(3)).toBe(3);
  });

  it("clamps tick index into snapshot bounds", () => {
    const renderer = createTrackCanvasRenderer({
      getFrameVisibleBounds: () => {
        return { left: 0, top: 0, width: 1, height: 1 };
      },
      getFallbackFrameVisibleBounds: () => {
        return { left: 0, top: 0, width: 1, height: 1 };
      },
    });

    expect(renderer.getTickIndex(-100, 10)).toBe(0);
    expect(renderer.getTickIndex(999999, 10)).toBe(9);
  });
});
