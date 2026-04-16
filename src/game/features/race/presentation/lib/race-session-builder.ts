import { createRaceSession } from "../../application/race-session-service";

import type {
  BuildRaceSessionInput,
  BuildRaceSessionOutput,
} from "../../types/race-session-builder";

const getSelectedHorseInput = (input: BuildRaceSessionInput): string | null =>
  {return input.selectedHorseIdOverride ?? input.selectedHorseId};

const getSelectedHorseIdsInput = (input: BuildRaceSessionInput): string[] => {
  if (input.selectedHorseIdsOverride && input.selectedHorseIdsOverride.length > 0) {
    return [...input.selectedHorseIdsOverride]
  }

  if (input.selectedHorseIds.length > 0) {
    return [...input.selectedHorseIds]
  }

  if (input.selectedHorseId) {
    return [input.selectedHorseId]
  }

  return []
}

const canBuildRaceSession = (input: BuildRaceSessionInput): boolean => {
  const selectedHorseIdsInput = getSelectedHorseIdsInput(input)
  if (selectedHorseIdsInput.length === 0) {
    return false
  }

  if (input.stakeAmount < 1) {
    return false;
  }

  return input.canPlaceBetAmount(input.stakeAmount * selectedHorseIdsInput.length);
};

const getSelectedHorseForRace = ({
  input,
  selectedHorseIdsInput,
  replaySelectedHorseId,
}: {
  input: BuildRaceSessionInput;
  selectedHorseIdsInput: string[];
  replaySelectedHorseId: string | null | undefined;
}): string | null => {
  const fallbackHorseId = selectedHorseIdsInput[0] ?? input.poolHorseIds[0] ?? null;
  return (
    selectedHorseIdsInput[0] ??
    replaySelectedHorseId ??
    input.selectedHorseIdOverride ??
    input.selectedHorseId ??
    fallbackHorseId
  );
};

const buildRaceSession = async (
  input: BuildRaceSessionInput,
): Promise<BuildRaceSessionOutput | null> => {
  const selectedHorseIdsInput = getSelectedHorseIdsInput(input)
  const selectedHorseInput = getSelectedHorseInput(input);
  if (selectedHorseInput === null || selectedHorseIdsInput.length === 0) {
    return null;
  }

  if (!canBuildRaceSession(input)) {
    return null;
  }

  const replayRequest = input.consumeReplayRequest();
  const currentSeed = replayRequest?.seedText ?? input.poolSeed;
  const selectedHorseForRace = getSelectedHorseForRace({
    input,
    selectedHorseIdsInput,
    replaySelectedHorseId: replayRequest?.selectedHorseId,
  });

  if (!selectedHorseForRace) {
    return null;
  }

  const nextSession = await createRaceSession({
    seedInput: currentSeed,
    selectedHorseId: selectedHorseForRace,
    selectedHorseIds: selectedHorseIdsInput,
    horsePool: input.horsePool,
    previousRaceHorseIds: input.previousRaceHorseIds,
  });

  return {
    selectedHorseId: nextSession.selectedHorseId,
    raceSession: nextSession,
  };
};

/**
 * Creates an adapter that builds race sessions and records resulting bet history.
 *
 * This helper validates input constraints, resolves replay/seed selection,
 * generates the race session, and persists race plus bet outcomes.
 */
export const createRaceSessionBuilder = (): {
  buildRaceSession: (
    input: BuildRaceSessionInput,
  ) => Promise<BuildRaceSessionOutput | null>;
} => {
  return {
    buildRaceSession,
  };
};
