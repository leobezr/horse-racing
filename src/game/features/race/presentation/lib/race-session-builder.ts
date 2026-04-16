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
  const selection = createBuildRaceSelection(input)
  if (!canBuildRaceSessionFromInput({ input, selection })) {
    return null;
  }

  const replaySelection = resolveReplaySelection(input)
  const selectedHorseForRace = resolveSelectedHorseForRace({
    input,
    selectedHorseIdsInput: selection.selectedHorseIdsInput,
    replaySelection,
  })

  if (!selectedHorseForRace) {
    return null;
  }

  const nextSession = await createRaceSessionWithInput({
    input,
    selectedHorseForRace,
    selectedHorseIdsInput: selection.selectedHorseIdsInput,
    currentSeed: replaySelection.currentSeed,
  })

  return createBuildRaceSessionOutput(nextSession)
};

const createBuildRaceSessionOutput = (
  raceSession: BuildRaceSessionOutput['raceSession'],
): BuildRaceSessionOutput => {
  return {
    selectedHorseId: raceSession.selectedHorseId,
    raceSession,
  }
}

const createBuildRaceSelection = (input: BuildRaceSessionInput): {
  selectedHorseInput: string | null
  selectedHorseIdsInput: string[]
} => {
  return {
    selectedHorseInput: getSelectedHorseInput(input),
    selectedHorseIdsInput: getSelectedHorseIdsInput(input),
  }
}

const canBuildRaceSessionFromInput = ({
  input,
  selection,
}: {
  input: BuildRaceSessionInput
  selection: {
    selectedHorseInput: string | null
    selectedHorseIdsInput: string[]
  }
}): boolean => {
  if (!isRaceSessionInputValid(selection)) {
    return false
  }

  return canBuildRaceSession(input)
}

const resolveSelectedHorseForRace = ({
  input,
  selectedHorseIdsInput,
  replaySelection,
}: {
  input: BuildRaceSessionInput
  selectedHorseIdsInput: string[]
  replaySelection: {
    replaySelectedHorseId: string | null | undefined
    currentSeed: string
  }
}): string | null => {
  return getSelectedHorseForRace({
    input,
    selectedHorseIdsInput,
    replaySelectedHorseId: replaySelection.replaySelectedHorseId,
  })
}

const isRaceSessionInputValid = ({
  selectedHorseInput,
  selectedHorseIdsInput,
}: {
  selectedHorseInput: string | null
  selectedHorseIdsInput: string[]
}): boolean => {
  if (selectedHorseInput === null) {
    return false
  }

  return selectedHorseIdsInput.length > 0
}

const resolveReplaySelection = (
  input: BuildRaceSessionInput,
): {
  replaySelectedHorseId: string | null | undefined
  currentSeed: string
} => {
  const replayRequest = input.consumeReplayRequest();
  return {
    replaySelectedHorseId: replayRequest?.selectedHorseId,
    currentSeed: replayRequest?.seedText ?? input.poolSeed,
  }
}

const createRaceSessionWithInput = async ({
  input,
  selectedHorseForRace,
  selectedHorseIdsInput,
  currentSeed,
}: {
  input: BuildRaceSessionInput
  selectedHorseForRace: string
  selectedHorseIdsInput: string[]
  currentSeed: string
}): Promise<BuildRaceSessionOutput['raceSession']> => {
  return createRaceSession({
    seedInput: currentSeed,
    selectedHorseId: selectedHorseForRace,
    selectedHorseIds: selectedHorseIdsInput,
    horsePool: input.horsePool,
    previousRaceHorseIds: input.previousRaceHorseIds,
  });
}

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
