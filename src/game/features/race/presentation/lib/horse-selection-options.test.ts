import {
  filterHorseIdsToSelectionOptions,
  getHorseSelectionOptions,
} from "./horse-selection-options";
import type { HorseOption } from "../../types/horse-race";

const createHorse = (id: string, laneNumber: number): HorseOption => {
  return {
    id,
    laneNumber,
    name: `Horse ${laneNumber}`,
    colors: {
      primary: "#111111",
      secondary: "#222222",
      tertiary: "#333333",
      saddle: "#444444",
    },
    stats: {
      baseSpeed: 8,
      accelerationBias: 0.5,
      stamina: 0.7,
      sprintControl: 0.6,
      gateJump: 0.6,
      topSpeed: 8,
      staminaReservoir: 0.7,
      efficiency: 0.7,
      finishDrive: 1.1,
      aerodynamics: 0.7,
      weightKg: 500,
      style: "grinder",
      dailyForm: 1,
    },
    odds: {
      probability: 0.2,
      numerator: 4,
      denominator: 1,
      label: "4/1",
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
  };
};

describe("getHorseSelectionOptions", () => {
  it("returns pool horses when no active race exists", () => {
    const previewHorses = [createHorse("horse-1", 1), createHorse("horse-2", 2)];

    const options = getHorseSelectionOptions({
      previewHorses,
      activeRaceHorses: [],
      isRaceConcluded: false,
    });

    expect(options).toEqual(previewHorses);
  });

  it("returns active race horses while race is running", () => {
    const previewHorses = [createHorse("horse-1", 1), createHorse("horse-2", 2)];
    const activeRaceHorses = [createHorse("horse-8", 1), createHorse("horse-9", 2)];

    const options = getHorseSelectionOptions({
      previewHorses,
      activeRaceHorses,
      isRaceConcluded: false,
    });

    expect(options).toEqual(activeRaceHorses);
  });

  it("returns pool horses after race is concluded", () => {
    const previewHorses = [createHorse("horse-1", 1), createHorse("horse-2", 2)];
    const activeRaceHorses = [createHorse("horse-8", 1), createHorse("horse-9", 2)];

    const options = getHorseSelectionOptions({
      previewHorses,
      activeRaceHorses,
      isRaceConcluded: true,
    });

    expect(options).toEqual(previewHorses);
  });
});

describe("filterHorseIdsToSelectionOptions", () => {
  it("filters out horse ids that are not in current options", () => {
    const horseOptions = [createHorse("horse-1", 1), createHorse("horse-2", 2)];

    const filteredHorseIds = filterHorseIdsToSelectionOptions({
      horseIds: ["horse-2", "horse-9"],
      horseOptions,
    });

    expect(filteredHorseIds).toEqual(["horse-2"]);
  });

  it("removes duplicated horse ids", () => {
    const horseOptions = [createHorse("horse-1", 1), createHorse("horse-2", 2)];

    const filteredHorseIds = filterHorseIdsToSelectionOptions({
      horseIds: ["horse-2", "horse-2", "horse-1"],
      horseOptions,
    });

    expect(filteredHorseIds).toEqual(["horse-2", "horse-1"]);
  });
});
