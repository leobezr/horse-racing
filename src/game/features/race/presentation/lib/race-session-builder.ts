import { createRaceSession } from "../../application/race-session-service";

import type {
  BuildRaceSessionInput,
  BuildRaceSessionOutput,
} from "../../types/race-session-builder";

const getSelectedHorseInput = (input: BuildRaceSessionInput): string | null =>
  input.selectedHorseIdOverride ?? input.selectedHorseId;

const canBuildRaceSession = (input: BuildRaceSessionInput): boolean => {
  if (input.stakeAmount < 1) {
    return false;
  }

  return input.canPlaceBetAmount(input.stakeAmount);
};

const getSelectedHorseForRace = ({
  input,
  replaySelectedHorseId,
}: {
  input: BuildRaceSessionInput;
  replaySelectedHorseId: string | null | undefined;
}): string | null => {
  const fallbackHorseId = input.poolHorseIds[0] ?? null;
  return (
    input.selectedHorseIdOverride ??
    replaySelectedHorseId ??
    input.selectedHorseId ??
    fallbackHorseId
  );
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
  const buildRaceSession = async (
    input: BuildRaceSessionInput,
  ): Promise<BuildRaceSessionOutput | null> => {
    const selectedHorseInput = getSelectedHorseInput(input);
    if (selectedHorseInput === null) {
      return null;
    }

    if (!canBuildRaceSession(input)) {
      return null;
    }

    const replayRequest = input.consumeReplayRequest();
    const currentSeed = replayRequest?.seedText ?? input.poolSeed;
    const selectedHorseForRace = getSelectedHorseForRace({
      input,
      replaySelectedHorseId: replayRequest?.selectedHorseId,
    });

    if (!selectedHorseForRace) {
      return null;
    }

    const nextSession = await createRaceSession({
      seedInput: currentSeed,
      selectedHorseId: selectedHorseForRace,
    });

    return {
      selectedHorseId: nextSession.selectedHorseId,
      raceSession: nextSession,
    };
  };

  return {
    buildRaceSession,
  };
};
