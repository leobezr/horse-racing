import { computed, nextTick, onBeforeUnmount, ref } from "vue";
import { gameConfig } from "../../../../config/game.config";
import type { ReplayRequest } from "../../../../shared/types/replay-request";
import { createRacePoolPreview } from "../application/race-session-service";
import { createPreRaceCountdownController } from "./lib/pre-race-countdown";
import { createRaceSessionBuilder } from "./lib/race-session-builder";
import { createTrackCanvasRenderer } from "./lib/track-canvas-renderer";

import type {
  HorseOption,
  LiveHorseProgress,
  LiveRaceRound,
  RaceSession,
} from "../types/horse-race";

import {
  createFrameVisibleBoundsReader,
  getFallbackFrameVisibleBounds,
} from "./lib/frame-visible-bounds-cache";

import type {
  ProfileBetsStorePort,
  RaceHistoryStorePort,
  RaceReplayStorePort,
} from "../types/race-canvas-ports";

import {
  createLiveHorseProgress,
  createLiveRaceRound,
} from "./lib/live-race-metrics";

const getStatusMessageBeforeSession = ({
  selectedHorseId,
  stakeAmount,
  availableCredit,
  canPlaceBetAmount,
}: {
  selectedHorseId: string | null;
  stakeAmount: number;
  availableCredit: number;
  canPlaceBetAmount: (amount: number) => boolean;
}): string => {
  if (selectedHorseId === null) {
    return "Click New Race and pick a horse from the modal.";
  }

  if (stakeAmount < 1) {
    return "Pick a chip amount before starting a race.";
  }

  if (!canPlaceBetAmount(stakeAmount)) {
    return `Not enough credit for this chip. Available: ${availableCredit}.`;
  }

  return "Ready to start. Click New Race.";
};

const getStatusMessageDuringSession = ({
  session,
  isRaceConcluded,
  showPreRaceCountdown,
  liveRaceRound,
}: {
  session: RaceSession;
  isRaceConcluded: boolean;
  showPreRaceCountdown: boolean;
  liveRaceRound: LiveRaceRound | null;
}): string => {
  if (showPreRaceCountdown) {
    return "Race countdown in progress.";
  }

  if (!isRaceConcluded) {
    const round = liveRaceRound?.roundNumber ?? 1;
    const secondsRemaining =
      liveRaceRound?.roundSecondsRemaining ?? gameConfig.rounds.secondsPerRound;
    return `Round ${round}/${gameConfig.rounds.count} in progress (${secondsRemaining}s left).`;
  }

  const playedRounds = session.race.roundSummaries.length;
  if (playedRounds < gameConfig.rounds.count) {
    return `Race in progress: round ${playedRounds}/${gameConfig.rounds.count}.`;
  }

  const winner = session.horses.find(
    (horse) => horse.id === session.race.winnerId,
  );
  if (!winner) {
    return "Race completed with no winner.";
  }

  return `Winner is ${winner.name} after ${gameConfig.rounds.count} rounds.`;
};

/**
 * Provides the race-canvas presentation API used by the race UI.
 *
 * This composable coordinates preview loading, session creation, pre-race countdown,
 * frame rendering, and live race metrics while delegating domain operations to
 * application services and store ports.
 */
export const useHorseRaceCanvas = ({
  profileBetsStore,
  raceHistoryStore,
  raceReplayStore,
}: {
  profileBetsStore: ProfileBetsStorePort;
  raceHistoryStore: RaceHistoryStorePort;
  raceReplayStore: RaceReplayStorePort;
}) => {
  const canvasRef = ref<HTMLCanvasElement | null>(null);
  const isLoading = ref<boolean>(false);
  const selectedHorseId = ref<string | null>(null);
  const stakeAmount = ref<number>(0);
  const raceSession = ref<RaceSession | null>(null);
  const poolSeed = ref<string>("");
  const previewLoaded = ref<boolean>(false);
  const animationFrameId = ref<number | null>(null);
  const startEpochMs = ref<number>(0);
  const isRaceConcluded = ref<boolean>(false);
  const preRaceCountdownValue = ref<number | null>(null);
  const preRaceCountdownLabel = ref<string>("");
  const preRaceCountdownTimerId = ref<number | null>(null);
  const countdownRunId = ref<number>(0);
  const liveRaceRound = ref<LiveRaceRound | null>(null);
  const liveHorseProgress = ref<LiveHorseProgress[]>([]);
  const { getFrameVisibleBounds } = createFrameVisibleBoundsReader();

  const { stopPreRaceCountdown, playPreRaceCountdown } =
    createPreRaceCountdownController({
      preRaceCountdownValue,
      preRaceCountdownLabel,
      preRaceCountdownTimerId,
      countdownRunId,
    });

  const { buildRaceSession: buildRaceSessionData } = createRaceSessionBuilder({
    profileBetsStore,
    raceHistoryStore,
  });

  const {
    renderEmptyTrack: renderEmptyTrackCanvas,
    getTickIndex,
    renderSessionFrame,
  } = createTrackCanvasRenderer({
    getFrameVisibleBounds,
    getFallbackFrameVisibleBounds,
  });

  const previewHorses = ref<HorseOption[]>([]);
  const previewRenderSheets = ref<Record<string, HTMLCanvasElement[]>>({});
  const chipValues = gameConfig.betting.chipValues;

  const poolHorses = computed<HorseOption[]>(() =>
    previewHorses.value.slice(0, gameConfig.raceHorseCount),
  );
  const renderSheets = computed(() => previewRenderSheets.value);
  const showPreRaceCountdown = computed<boolean>(
    () => preRaceCountdownValue.value !== null,
  );

  const statusMessage = computed<string>(() => {
    if (!raceSession.value) {
      return getStatusMessageBeforeSession({
        selectedHorseId: selectedHorseId.value,
        stakeAmount: stakeAmount.value,
        availableCredit: profileBetsStore.availableCredit,
        canPlaceBetAmount: profileBetsStore.canPlaceBetAmount,
      });
    }

    return getStatusMessageDuringSession({
      session: raceSession.value,
      isRaceConcluded: isRaceConcluded.value,
      showPreRaceCountdown: showPreRaceCountdown.value,
      liveRaceRound: liveRaceRound.value,
    });
  });

  const stopAnimation = (): void => {
    if (animationFrameId.value !== null) {
      window.cancelAnimationFrame(animationFrameId.value);
      animationFrameId.value = null;
    }
  };

  const renderEmptyTrack = (): void => {
    renderEmptyTrackCanvas(canvasRef.value);
  };

  const getCanvasRenderingContext = (): CanvasRenderingContext2D | null => {
    if (!canvasRef.value) {
      return null;
    }

    const context = canvasRef.value.getContext("2d");
    if (!context) {
      return null;
    }

    return context;
  };

  const ensureAnimationStartEpoch = (timestampMs: number): void => {
    if (startEpochMs.value === 0) {
      startEpochMs.value = timestampMs;
    }
  };

  const updateLiveRaceMetrics = ({
    session,
    tickIndex,
    snapshotByHorseId,
    finishDistance,
  }: {
    session: RaceSession;
    tickIndex: number;
    snapshotByHorseId: Map<string, number>;
    finishDistance: number;
  }): void => {
    liveRaceRound.value = createLiveRaceRound({ tickIndex });
    liveHorseProgress.value = createLiveHorseProgress({
      horses: session.horses,
      snapshotByHorseId,
      finishDistance,
      tickIndex,
    });
  };

  const shouldAnimateNextFrame = ({
    tickIndex,
    snapshotCount,
  }: {
    tickIndex: number;
    snapshotCount: number;
  }): boolean => tickIndex < snapshotCount - 1;

  const queueNextAnimationFrame = (): void => {
    animationFrameId.value = window.requestAnimationFrame(renderCurrentFrame);
  };

  const renderCurrentFrame = (timestampMs: number): void => {
    const session = raceSession.value;
    if (!session) {
      return;
    }

    const context = getCanvasRenderingContext();
    if (!context) {
      return;
    }

    ensureAnimationStartEpoch(timestampMs);

    const elapsedMs = timestampMs - startEpochMs.value;
    const tickIndex = getTickIndex(
      elapsedMs,
      session.race.raceSnapshots.length,
    );
    const snapshot = session.race.raceSnapshots[tickIndex] ?? [];
    const snapshotByHorseId = new Map(
      snapshot.map((entry) => [entry.id, entry.distance]),
    );
    const finishDistance =
      gameConfig.track.width - gameConfig.track.finishLineOffset;

    updateLiveRaceMetrics({
      session,
      tickIndex,
      snapshotByHorseId,
      finishDistance,
    });

    renderSessionFrame({
      context,
      session,
      tickIndex,
      elapsedMs,
      snapshotByHorseId,
      finishDistance,
    });

    const hasNextFrame = shouldAnimateNextFrame({
      tickIndex,
      snapshotCount: session.race.raceSnapshots.length,
    });
    if (!hasNextFrame) {
      isRaceConcluded.value = true;
      return;
    }

    queueNextAnimationFrame();
  };

  const canBuildSession = ({
    selectedHorseInput,
  }: {
    selectedHorseInput: string | null;
  }): boolean => {
    if (selectedHorseInput === null) {
      return false;
    }

    if (stakeAmount.value < 1) {
      return false;
    }

    return profileBetsStore.canPlaceBetAmount(stakeAmount.value);
  };

  const resetRaceRuntimeState = ({
    selectedHorseInput,
  }: {
    selectedHorseInput: string;
  }): void => {
    stopAnimation();
    stopPreRaceCountdown();
    startEpochMs.value = 0;
    isRaceConcluded.value = false;
    selectedHorseId.value = selectedHorseInput;
    liveRaceRound.value = null;
    liveHorseProgress.value = [];
  };

  const beginRaceAnimation = async (): Promise<void> => {
    await nextTick();
    renderEmptyTrack();
    await playPreRaceCountdown();
    queueNextAnimationFrame();
  };

  const buildSession = async (
    selectedHorseIdOverride?: string,
  ): Promise<void> => {
    const selectedHorseInput = selectedHorseIdOverride ?? selectedHorseId.value;
    if (!canBuildSession({ selectedHorseInput })) {
      return;
    }

    isLoading.value = true;
    resetRaceRuntimeState({ selectedHorseInput });

    try {
      const buildResult = await buildRaceSessionData({
        selectedHorseIdOverride,
        selectedHorseId: selectedHorseId.value,
        stakeAmount: stakeAmount.value,
        canPlaceBetAmount: profileBetsStore.canPlaceBetAmount,
        poolSeed: poolSeed.value,
        poolHorseIds: poolHorses.value.map((horse) => horse.id),
        consumeReplayRequest: raceReplayStore.consumeReplayRequest,
      });

      if (!buildResult) {
        return;
      }

      raceSession.value = buildResult.raceSession;
      selectedHorseId.value = buildResult.selectedHorseId;
      previewLoaded.value = true;
      await beginRaceAnimation();
    } finally {
      isLoading.value = false;
    }
  };

  onBeforeUnmount(() => {
    stopAnimation();
    stopPreRaceCountdown();
  });

  const initializePool = async (): Promise<void> => {
    if (previewLoaded.value) {
      return;
    }

    const replayRequest: ReplayRequest | null =
      raceReplayStore.consumeReplayRequest();
    if (replayRequest) {
      poolSeed.value = replayRequest.seedText;
      selectedHorseId.value = replayRequest.selectedHorseId;
      raceReplayStore.setReplayRequest(replayRequest);
    }

    const preview = await createRacePoolPreview({ seedInput: poolSeed.value });
    poolSeed.value = preview.seedText;
    previewHorses.value = preview.horses;
    previewRenderSheets.value = preview.renderSheets;
    previewLoaded.value = true;
  };

  return {
    canvasRef,
    isLoading,
    selectedHorseId,
    selectHorse: (horseId: string): void => {
      selectedHorseId.value = horseId;
    },
    availableCredit: profileBetsStore.availableCredit,
    stakeAmount,
    chipValues,
    selectChipAmount: (amount: number): void => {
      stakeAmount.value = amount;
    },
    canAffordChip: (amount: number): boolean =>
      profileBetsStore.canPlaceBetAmount(amount),
    canStartRace: computed(
      () =>
        poolHorses.value.length > 0 &&
        stakeAmount.value >= 1 &&
        profileBetsStore.canPlaceBetAmount(stakeAmount.value),
    ),
    horseOptions: poolHorses,
    renderSheets,
    raceRoundSummaries: computed(() =>
      isRaceConcluded.value
        ? (raceSession.value?.race.roundSummaries ?? [])
        : [],
    ),
    liveRaceRound,
    liveHorseProgress,
    showPreRaceCountdown,
    preRaceCountdownValue,
    preRaceCountdownLabel,
    statusMessage,
    buildSession,
    initializePool,
    renderEmptyTrack,
    gameConfig,
  };
};
