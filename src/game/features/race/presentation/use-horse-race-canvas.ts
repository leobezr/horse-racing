/* eslint-disable max-lines-per-function */
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
  RaceReplayStorePort,
} from "../types/race-canvas-ports";

import {
  createLiveHorseProgress,
  createLiveRaceRound,
} from "./lib/live-race-metrics";
import {
  filterHorseIdsToSelectionOptions,
  getHorseSelectionOptions,
} from "./lib/horse-selection-options";
import { getFrameTransitionDecision } from "./lib/frame-transition-decision";
import {
  getRoundWinnerHorseId,
  getRoundBetTotalStake,
  resolveAutoBetHorseIds,
  resolveAutoStakeAmount,
} from "./lib/round-betting";
import { getRoundFinishDistanceForTick } from "./lib/round-distance";

const getStatusMessageBeforeSession = ({
  selectedHorseIds,
  stakeAmount,
  availableCredit,
  canPlaceTotalBetAmount,
}: {
  selectedHorseIds: string[];
  stakeAmount: number;
  availableCredit: number;
  canPlaceTotalBetAmount: (amount: number) => boolean;
}): string => {
  if (stakeAmount < 1) {
    return "Pick a chip amount before starting a race.";
  }

  if (selectedHorseIds.length === 0) {
    return "Click Generate Race Schedule and pick a horse to bet on.";
  }

  const totalStake = getRoundBetTotalStake({
    horseCount: selectedHorseIds.length,
    stakePerHorse: stakeAmount,
  });

  if (!canPlaceTotalBetAmount(totalStake)) {
    return `Not enough credit for this chip. Available: ${availableCredit}.`;
  }

  return "Ready to start. Click Generate Race Schedule.";
};

const getStatusMessageDuringSession = ({
  session,
  isRaceConcluded,
  showPreRaceCountdown,
  liveRaceRound,
  isAwaitingBetweenRoundsBet,
  betweenRoundsCountdownValue,
}: {
  session: RaceSession;
  isRaceConcluded: boolean;
  showPreRaceCountdown: boolean;
  liveRaceRound: LiveRaceRound | null;
  isAwaitingBetweenRoundsBet: boolean;
  betweenRoundsCountdownValue: number | null;
}): string => {
  if (showPreRaceCountdown) {
    return "Race countdown in progress.";
  }

  if (isAwaitingBetweenRoundsBet) {
    const countdown = betweenRoundsCountdownValue ?? 10;
    return `Round finished. Pick horse(s) and bet for next round (${countdown}s).`;
  }

  if (!isRaceConcluded) {
    const round = liveRaceRound?.roundNumber ?? 1;
    const resolvedTrackSize =
      gameConfig.rounds.trackDistances[round - 1] ??
      gameConfig.rounds.trackDistances[gameConfig.rounds.trackDistances.length - 1] ??
      0;
    return `Round ${round}/${gameConfig.rounds.count} ${resolvedTrackSize} meters.`;
  }

  const playedRounds = session.race.roundSummaries.length;
  if (playedRounds < gameConfig.rounds.count) {
    return `Race in progress: round ${playedRounds}/${gameConfig.rounds.count}.`;
  }

  const winner = session.horses.find((horse) => {
    return horse.id === session.race.winnerId;
  });
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
  raceHistoryStore: {
    addRaceEntry: (payload: {
      seedText: string;
      selectedHorseId: string;
      winnerHorseId: string | null;
    }) => { id: string };
  };
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
  const betweenRoundsCountdownValue = ref<number | null>(null);
  const betweenRoundsTimerId = ref<number | null>(null);
  const betweenRoundsTimerResolve = ref<(() => void) | null>(null);
  const betweenRoundsRunId = ref<number>(0);
  const isAwaitingBetweenRoundsBet = ref<boolean>(false);
  const isBetweenRoundsTransitioning = ref<boolean>(false);
  const resolvedRoundCount = ref<number>(0);
  const roundBetHorseIds = ref<string[]>([]);
  const roundBetHorseIdsByRound = ref<Record<number, string[]>>({});
  const roundBetStakeAmount = ref<number>(0);
  const reservedRoundStakeAmount = ref<number>(0);
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

  const { buildRaceSession: buildRaceSessionData } = createRaceSessionBuilder();

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

  const poolHorses = computed<HorseOption[]>(() => {
    return getHorseSelectionOptions({
      previewHorses: previewHorses.value,
      activeRaceHorses: raceSession.value?.horses ?? [],
      isRaceConcluded: isRaceConcluded.value,
    });
  });
  const renderSheets = computed(() => {
    return previewRenderSheets.value;
  });
  const showPreRaceCountdown = computed<boolean>(() => {
    return preRaceCountdownValue.value !== null;
  });
  const loggedRoundSummaries = computed(() => {
    const summaries = raceSession.value?.race.roundSummaries ?? [];
    let resolvedCount = resolvedRoundCount.value;
    if (isRaceConcluded.value) {
      resolvedCount = summaries.length;
    }

    return summaries.slice(0, resolvedCount).reverse();
  });

  const statusMessage = computed<string>(() => {
    if (!raceSession.value) {
      const selectedHorseIds = resolveAutoBetHorseIds({
        previousHorseIds: roundBetHorseIds.value,
        fallbackHorseId: selectedHorseId.value,
      });

      return getStatusMessageBeforeSession({
        selectedHorseIds,
        stakeAmount: stakeAmount.value,
        availableCredit: profileBetsStore.availableCredit,
        canPlaceTotalBetAmount: profileBetsStore.canPlaceBetAmount,
      });
    }

    return getStatusMessageDuringSession({
      session: raceSession.value,
      isRaceConcluded: isRaceConcluded.value,
      showPreRaceCountdown: showPreRaceCountdown.value,
      liveRaceRound: liveRaceRound.value,
      isAwaitingBetweenRoundsBet: isAwaitingBetweenRoundsBet.value,
      betweenRoundsCountdownValue: betweenRoundsCountdownValue.value,
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
    raceFinishDistance,
  }: {
    session: RaceSession;
    tickIndex: number;
    snapshotByHorseId: Map<string, number>;
    raceFinishDistance: number;
  }): void => {
    liveRaceRound.value = createLiveRaceRound({ tickIndex });
    liveHorseProgress.value = createLiveHorseProgress({
      horses: session.horses,
      snapshotByHorseId,
      finishDistance: raceFinishDistance,
      tickIndex,
      raceSnapshots: session.race.raceSnapshots,
      roundSummaries: session.race.roundSummaries,
    });
  };

  const shouldAnimateNextFrame = ({
    tickIndex,
    snapshotCount,
  }: {
    tickIndex: number;
    snapshotCount: number;
  }): boolean => {
    return tickIndex < snapshotCount - 1;
  };

  const queueNextAnimationFrame = (): void => {
    animationFrameId.value = window.requestAnimationFrame(renderCurrentFrame);
  };

  const stopBetweenRoundsCountdown = (): void => {
    betweenRoundsRunId.value += 1;
    if (betweenRoundsTimerId.value !== null) {
      window.clearTimeout(betweenRoundsTimerId.value);
      betweenRoundsTimerId.value = null;
    }
    if (betweenRoundsTimerResolve.value) {
      betweenRoundsTimerResolve.value();
      betweenRoundsTimerResolve.value = null;
    }
    betweenRoundsCountdownValue.value = null;
    isAwaitingBetweenRoundsBet.value = false;
  };

  const waitBetweenRoundsMs = async (ms: number): Promise<void> => {
    await new Promise<void>((resolve) => {
      betweenRoundsTimerResolve.value = resolve;
      betweenRoundsTimerId.value = window.setTimeout(() => {
        betweenRoundsTimerId.value = null;
        betweenRoundsTimerResolve.value = null;
        resolve();
      }, ms);
    });
  };

  const settleRoundBet = ({
    session,
    roundNumber,
  }: {
    session: RaceSession;
    roundNumber: number;
  }): void => {
    const roundSummary = session.race.roundSummaries[roundNumber - 1];
    const winnerHorseId = getRoundWinnerHorseId({ roundSummary });
    const selectedBetHorseIds = resolveAutoBetHorseIds({
      previousHorseIds: roundBetHorseIds.value,
      fallbackHorseId: selectedHorseId.value,
    });
    const selectedBetStakeAmount = roundBetStakeAmount.value;
    roundBetHorseIdsByRound.value = {
      ...roundBetHorseIdsByRound.value,
      [roundNumber]: [...selectedBetHorseIds],
    };

    if (selectedBetHorseIds.length === 0 || selectedBetStakeAmount < 1) {
      return;
    }

    const totalStake = getRoundBetTotalStake({
      horseCount: selectedBetHorseIds.length,
      stakePerHorse: selectedBetStakeAmount,
    });
    profileBetsStore.releaseReservedBetAmount(totalStake);

    for (const selectedBetHorseId of selectedBetHorseIds) {
      const selectedHorse = session.horses.find((horse) => {
        return horse.id === selectedBetHorseId;
      });
      if (!selectedHorse) {
        continue;
      }

      const raceEntry = raceHistoryStore.addRaceEntry({
        seedText: `${session.seedText}-r${roundNumber}`,
        selectedHorseId: selectedBetHorseId,
        winnerHorseId,
      });

      profileBetsStore.addResolvedBet({
        raceId: raceEntry.id,
        horseId: selectedBetHorseId,
        amount: Math.floor(selectedBetStakeAmount),
        oddsNumerator: selectedHorse.odds.numerator,
        oddsDenominator: selectedHorse.odds.denominator,
        oddsLabel: selectedHorse.odds.label,
        winnerHorseId,
      });
    }
  };

  const applyAutoBetFallback = (): void => {
    const carryHorseIds = resolveAutoBetHorseIds({
      previousHorseIds: roundBetHorseIds.value,
      fallbackHorseId: selectedHorseId.value,
    });
    if (carryHorseIds.length === 0) {
      return;
    }

    const resolvedStakeAmount = resolveAutoStakeAmount({
      previousStakeAmount: roundBetStakeAmount.value,
      horseCount: carryHorseIds.length,
      chipValues,
      canPlaceTotalBetAmount: profileBetsStore.canPlaceBetAmount,
    });

    if (resolvedStakeAmount < 1) {
      return;
    }

    selectedHorseId.value = carryHorseIds[0] ?? null;
    stakeAmount.value = resolvedStakeAmount;
    roundBetHorseIds.value = [...carryHorseIds];
    roundBetStakeAmount.value = resolvedStakeAmount;
  };

  const reserveCurrentRoundStake = (): boolean => {
    const selectedBetHorseIds = resolveAutoBetHorseIds({
      previousHorseIds: roundBetHorseIds.value,
      fallbackHorseId: selectedHorseId.value,
    });
    const totalStake = getRoundBetTotalStake({
      horseCount: selectedBetHorseIds.length,
      stakePerHorse: roundBetStakeAmount.value,
    });

    if (totalStake < 1) {
      return false;
    }

    const reserved = profileBetsStore.reserveBetAmount(totalStake);
    if (!reserved) {
      return false;
    }

    reservedRoundStakeAmount.value = totalStake;
    return true;
  };

  const runBetweenRoundsBetWindow = async (): Promise<void> => {
    stopBetweenRoundsCountdown();
    isAwaitingBetweenRoundsBet.value = true;
    const runId = betweenRoundsRunId.value;

    for (let value = 10; value >= 1; value -= 1) {
      if (runId !== betweenRoundsRunId.value) {
        return;
      }
      betweenRoundsCountdownValue.value = value;
      await waitBetweenRoundsMs(1000);
      if (!isAwaitingBetweenRoundsBet.value) {
        return;
      }
    }

    if (runId !== betweenRoundsRunId.value) {
      return;
    }

    applyAutoBetFallback();
    stopBetweenRoundsCountdown();
  };

  const submitBetweenRoundsSelection = ({
    horseIds,
  }: {
    horseIds: string[];
  }): void => {
    if (horseIds.length === 0) {
      return;
    }

    selectedHorseId.value = horseIds[0] ?? null;
    roundBetHorseIds.value = [...horseIds];
    roundBetStakeAmount.value = stakeAmount.value;
    stopBetweenRoundsCountdown();
  };

  const handleRoundBoundaryTransition = async ({
    session,
    tickIndex,
  }: {
    session: RaceSession;
    tickIndex: number;
  }): Promise<void> => {
    if (isBetweenRoundsTransitioning.value) {
      return;
    }

    const nextRoundNumber = resolvedRoundCount.value + 1;
    const nextRoundSummary = session.race.roundSummaries[nextRoundNumber - 1];
    if (!nextRoundSummary) {
      return;
    }

    if (tickIndex < nextRoundSummary.endTick) {
      return;
    }

    isBetweenRoundsTransitioning.value = true;
    stopAnimation();
    settleRoundBet({
      session,
      roundNumber: nextRoundNumber,
    });
    reservedRoundStakeAmount.value = 0;
    resolvedRoundCount.value = nextRoundNumber;

    const hasNextRound = nextRoundNumber < gameConfig.rounds.count;
    if (!hasNextRound) {
      isBetweenRoundsTransitioning.value = false;
      return;
    }

    if (hasNextRound) {
      const pauseStartMs = window.performance.now();
      await runBetweenRoundsBetWindow();
      const hasReservedNextRoundStake = reserveCurrentRoundStake();
      if (!hasReservedNextRoundStake) {
        applyAutoBetFallback();
        reserveCurrentRoundStake();
      }
      const pauseDurationMs = window.performance.now() - pauseStartMs;
      startEpochMs.value += pauseDurationMs;
    }

    isBetweenRoundsTransitioning.value = false;
    if (!isRaceConcluded.value) {
      queueNextAnimationFrame();
    }
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
      snapshot.map((entry) => {
        return [entry.id, entry.distance];
      }),
    );
    const raceFinishDistance = getRoundFinishDistanceForTick({
      tickIndex,
      roundSummaries: session.race.roundSummaries,
      configuredRoundTrackDistances: gameConfig.rounds.trackDistances,
      fallbackFinishDistance: session.race.finishDistance,
    });

    updateLiveRaceMetrics({
      session,
      tickIndex,
      snapshotByHorseId,
      raceFinishDistance,
    });

    const nextRoundNumber = resolvedRoundCount.value + 1;
    const nextRoundSummary = session.race.roundSummaries[nextRoundNumber - 1] ?? null;
    const transitionDecision = getFrameTransitionDecision({
      tickIndex,
      nextRoundEndTick: nextRoundSummary?.endTick ?? null,
      nextRoundNumber,
      roundCount: gameConfig.rounds.count,
      isBetweenRoundsTransitioning: isBetweenRoundsTransitioning.value,
      isAwaitingBetweenRoundsBet: isAwaitingBetweenRoundsBet.value,
    });

    renderSessionFrame({
      context,
      session,
      tickIndex,
      elapsedMs,
      snapshotByHorseId,
      raceFinishDistance,
      highlightedHorseIds: new Set(roundBetHorseIds.value),
    });

    if (transitionDecision === "render_and_pause") {
      void handleRoundBoundaryTransition({
        session,
        tickIndex,
      });
      return;
    }

    if (transitionDecision === "skip") {
      return;
    }

    const hasNextFrame = shouldAnimateNextFrame({
      tickIndex,
      snapshotCount: session.race.raceSnapshots.length,
    });
    if (!hasNextFrame) {
      const hasUnsettledRound =
        resolvedRoundCount.value < session.race.roundSummaries.length;
      if (hasUnsettledRound) {
        const roundNumber = resolvedRoundCount.value + 1;
        settleRoundBet({
          session,
          roundNumber,
        });
        resolvedRoundCount.value = roundNumber;
        reservedRoundStakeAmount.value = 0;
      }

      isRaceConcluded.value = true;
      return;
    }

    queueNextAnimationFrame();
  };

  const canBuildSession = ({
    selectedHorseIds,
  }: {
    selectedHorseIds: string[];
  }): boolean => {
    const resolvedHorseIds = filterHorseIdsToSelectionOptions({
      horseIds: selectedHorseIds,
      horseOptions: poolHorses.value,
    });

    if (resolvedHorseIds.length === 0) {
      return false;
    }

    if (stakeAmount.value < 1) {
      return false;
    }

    const totalStake = getRoundBetTotalStake({
      horseCount: resolvedHorseIds.length,
      stakePerHorse: stakeAmount.value,
    });

    return profileBetsStore.canPlaceBetAmount(totalStake);
  };

  const resetRaceRuntimeState = ({
    selectedHorseInput,
    selectedHorseIds,
  }: {
    selectedHorseInput: string;
    selectedHorseIds: string[];
  }): void => {
    stopAnimation();
    stopPreRaceCountdown();
    stopBetweenRoundsCountdown();
    if (reservedRoundStakeAmount.value > 0) {
      profileBetsStore.releaseReservedBetAmount(reservedRoundStakeAmount.value);
      reservedRoundStakeAmount.value = 0;
    }
    startEpochMs.value = 0;
    isRaceConcluded.value = false;
    isBetweenRoundsTransitioning.value = false;
    resolvedRoundCount.value = 0;
    roundBetHorseIds.value = [...selectedHorseIds];
    roundBetHorseIdsByRound.value = {};
    roundBetStakeAmount.value = stakeAmount.value;
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
    selectedHorseIdsOverride?: string[],
  ): Promise<void> => {
    let selectedHorseIds = resolveAutoBetHorseIds({
      previousHorseIds: roundBetHorseIds.value,
      fallbackHorseId: selectedHorseId.value,
    });
    if (selectedHorseIdsOverride && selectedHorseIdsOverride.length > 0) {
      selectedHorseIds = [...selectedHorseIdsOverride];
    }
    selectedHorseIds = filterHorseIdsToSelectionOptions({
      horseIds: selectedHorseIds,
      horseOptions: poolHorses.value,
    });
    const selectedHorseInput = selectedHorseIds[0] ?? null;

    if (!canBuildSession({ selectedHorseIds }) || selectedHorseInput === null) {
      return;
    }

    isLoading.value = true;
    resetRaceRuntimeState({ selectedHorseInput, selectedHorseIds });

    try {
      const buildResult = await buildRaceSessionData({
        selectedHorseIdsOverride: selectedHorseIds,
        selectedHorseIdOverride: selectedHorseInput,
        selectedHorseId: selectedHorseId.value,
        selectedHorseIds: roundBetHorseIds.value,
        stakeAmount: stakeAmount.value,
        canPlaceBetAmount: profileBetsStore.canPlaceBetAmount,
        poolSeed: poolSeed.value,
        poolHorseIds: previewHorses.value.map((horse) => {
          return horse.id;
        }),
        horsePool: previewHorses.value,
        previousRaceHorseIds: raceSession.value?.horses.map((horse) => {
          return horse.id;
        }) ?? [],
        consumeReplayRequest: raceReplayStore.consumeReplayRequest,
      });

      if (!buildResult) {
        return;
      }

      raceSession.value = buildResult.raceSession;
      selectedHorseId.value = buildResult.selectedHorseId;
      previewLoaded.value = true;
      reserveCurrentRoundStake();
      await beginRaceAnimation();
    } finally {
      isLoading.value = false;
    }
  };

  onBeforeUnmount(() => {
    stopAnimation();
    stopPreRaceCountdown();
    stopBetweenRoundsCountdown();
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
    selectedHorseIds: roundBetHorseIds,
    selectHorse: (horseId: string): void => {
      selectedHorseId.value = horseId;
    },
    selectHorseIds: (horseIds: string[]): void => {
      const selectedIds = filterHorseIdsToSelectionOptions({
        horseIds,
        horseOptions: poolHorses.value,
      });
      roundBetHorseIds.value = selectedIds;
      selectedHorseId.value = selectedIds[0] ?? null;
    },
    availableCredit: computed(() => {
      return profileBetsStore.availableCredit;
    }),
    stakeAmount,
    chipValues,
    selectChipAmount: (amount: number): void => {
      stakeAmount.value = amount;
    },
    canAffordChip: (amount: number): boolean => {
      return profileBetsStore.canPlaceBetAmount(
        getRoundBetTotalStake({
          horseCount: Math.max(1, roundBetHorseIds.value.length),
          stakePerHorse: amount,
        }),
      );
    },
    canStartRace: computed(() => {
      return (
        poolHorses.value.length > 0 &&
        stakeAmount.value >= 1 &&
        profileBetsStore.canPlaceBetAmount(stakeAmount.value)
      );
    }),
    horseOptions: poolHorses,
    renderSheets,
    raceRoundSummaries: loggedRoundSummaries,
    roundBetHorseIdsByRound,
    liveRaceRound,
    liveHorseProgress,
    isAwaitingBetweenRoundsBet,
    betweenRoundsCountdownValue,
    submitBetweenRoundsSelection,
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
