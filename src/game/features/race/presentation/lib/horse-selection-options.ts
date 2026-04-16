import type { HorseOption } from "../../types/horse-race";

const buildHorseIdSet = (horseOptions: HorseOption[]): Set<string> => {
  const horseIds = horseOptions.map((horse) => {
    return horse.id;
  });

  return new Set(horseIds);
};

export const getHorseSelectionOptions = ({
  previewHorses,
  activeRaceHorses,
  isRaceConcluded,
}: {
  previewHorses: HorseOption[];
  activeRaceHorses: HorseOption[];
  isRaceConcluded: boolean;
}): HorseOption[] => {
  if (activeRaceHorses.length === 0) {
    return previewHorses;
  }

  if (isRaceConcluded) {
    return previewHorses;
  }

  return activeRaceHorses;
};

export const filterHorseIdsToSelectionOptions = ({
  horseIds,
  horseOptions,
}: {
  horseIds: string[];
  horseOptions: HorseOption[];
}): string[] => {
  if (horseIds.length === 0 || horseOptions.length === 0) {
    return [];
  }

  const validHorseIds = buildHorseIdSet(horseOptions);
  const pickedHorseIdSet = new Set<string>();

  return horseIds.filter((horseId) => {
    if (!validHorseIds.has(horseId)) {
      return false;
    }

    if (pickedHorseIdSet.has(horseId)) {
      return false;
    }

    pickedHorseIdSet.add(horseId);
    return true;
  });
};
