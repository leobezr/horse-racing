<template>
  <section class="game" data-test="app-race-section">
    <v-row class="game__layout" data-test="app-race-layout">
      <v-col cols="12" md="3">
        <HorsePoolOrganism
          :horse-options="horseOptions"
          :selected-horse-id="selectedHorseId"
          :bind-idle-canvas="bindIdleCanvas"
          :on-select-horse="selectAndShowHorseStatus"
        />
      </v-col>

      <v-col cols="12" md="6">
        <section class="game__center" data-test="app-race-center">
          <RaceControlPanelOrganism
            :is-loading="isLoading"
            :can-start-race="canStartRace"
            :available-credit="availableCredit"
            :chip-values="chipValues"
            :stake-amount="stakeAmount"
            :can-afford-chip="canAffordChip"
            :on-select-chip-amount="selectChipAmount"
            :on-open-race-setup="openRaceSetupModal"
            :rounds-count="gameConfig.rounds.count"
            :seconds-per-round="gameConfig.rounds.secondsPerRound"
            :status-message="statusMessage"
          />

          <RaceCanvasOrganism
            :show-pre-race-countdown="showPreRaceCountdown"
            :pre-race-countdown-value="preRaceCountdownValue"
            :pre-race-countdown-label="preRaceCountdownLabel"
            :track-width="gameConfig.track.width"
            :track-height="gameConfig.track.height"
            :on-bind-canvas="bindMainRaceCanvas"
          />
        </section>
      </v-col>

      <v-col cols="12" md="3">
        <RaceResultsOrganism
          :live-race-round="liveRaceRound"
          :live-horse-progress="liveHorseProgress"
          :selected-horse-ids="selectedHorseIds"
          :race-round-summaries="raceRoundSummaries"
          :resolve-round-track-size="resolveRoundTrackSize"
          :is-horse-selected-for-round="isHorseSelectedForRound"
          :format-round-race-time="formatRoundRaceTime"
        />
      </v-col>
    </v-row>

    <RaceSetupModalOrganism
      :is-race-setup-modal-open="isRaceSetupModalOpen"
      :on-race-setup-modal-model-update="onRaceSetupModalModelUpdate"
      :is-awaiting-between-rounds-bet="isAwaitingBetweenRoundsBet"
      :between-rounds-countdown-value="betweenRoundsCountdownValue"
      :horse-options="horseOptions"
      :pending-race-horse-ids="pendingRaceHorseIds"
      :is-setup-horse-disabled="isSetupHorseDisabled"
      :on-toggle-pending-race-horse="togglePendingRaceHorse"
      :pending-horse-preview="pendingHorsePreview"
      :on-close-race-setup="closeRaceSetupModal"
      :is-loading="isLoading"
      :on-start-race-with-pending-horse="startRaceWithPendingHorse"
    />

    <HorseStatusModalOrganism
      :active-horse-status="activeHorseStatus"
      :on-status-dialog-model-update="onStatusDialogModelUpdate"
      :on-close-horse-status="closeHorseStatus"
      :on-bind-status-canvas="bindStatusCanvas"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useHorseRaceCanvas } from "@/game/features/race/presentation/use-horse-race-canvas";
import type { HorseOption } from "@/game/features/race/types/horse-race";
import { useProfileBetsStore } from "@/shared/pinia/profile-bets-store";
import { useRaceHistoryStore } from "@/shared/pinia/race-history-store";
import { useRaceReplayStore } from "@/shared/pinia/race-replay-store";
import HorsePoolOrganism from "./organisms/HorsePoolOrganism.vue";
import RaceControlPanelOrganism from "./organisms/RaceControlPanelOrganism.vue";
import RaceCanvasOrganism from "./organisms/RaceCanvasOrganism.vue";
import RaceResultsOrganism from "./organisms/RaceResultsOrganism.vue";
import RaceSetupModalOrganism from "./organisms/RaceSetupModalOrganism.vue";
import HorseStatusModalOrganism from "./organisms/HorseStatusModalOrganism.vue";
import { useHorseIdlePreviewsService } from "./services/use-horse-idle-previews-service";
import { useHorseStatusModalService } from "./services/use-horse-status-modal-service";
import { useRaceSetupModalService } from "./services/use-race-setup-modal-service";

const profileBetsStore = useProfileBetsStore();
const raceHistoryStore = useRaceHistoryStore();
const raceReplayStore = useRaceReplayStore();

const {
  canvasRef,
  isLoading,
  selectedHorseId,
  selectedHorseIds,
  selectHorseIds,
  availableCredit,
  chipValues,
  stakeAmount,
  selectChipAmount,
  canAffordChip,
  canStartRace,
  horseOptions,
  statusMessage,
  buildSession,
  initializePool,
  renderEmptyTrack,
  gameConfig,
  renderSheets,
  raceRoundSummaries,
  roundBetHorseIdsByRound,
  liveRaceRound,
  liveHorseProgress,
  isAwaitingBetweenRoundsBet,
  betweenRoundsCountdownValue,
  submitBetweenRoundsSelection,
  showPreRaceCountdown,
  preRaceCountdownValue,
  preRaceCountdownLabel,
} = useHorseRaceCanvas({
  profileBetsStore,
  raceHistoryStore,
  raceReplayStore,
});

const {
  isRaceSetupModalOpen,
  pendingRaceHorseIds,
  openRaceSetupModal: openRaceSetup,
  closeRaceSetupModal,
  onRaceSetupModalModelUpdate,
  togglePendingRaceHorse,
  startRaceWithPendingHorses: startRaceWithSetupSelection,
} = useRaceSetupModalService();

const {
  statusCanvasRef,
  activeHorseStatus,
  openHorseStatus,
  closeHorseStatus,
  onStatusDialogModelUpdate,
} = useHorseStatusModalService({
  horseOptions,
  renderSheets,
});

const { bindIdleCanvas } = useHorseIdlePreviewsService({
  horseOptions,
  renderSheets,
});

const bindMainRaceCanvas = (element: Element | null): void => {
  canvasRef.value = element instanceof HTMLCanvasElement ? element : null;
};

const bindStatusCanvas = (element: Element | null): void => {
  statusCanvasRef.value = element instanceof HTMLCanvasElement ? element : null;
};

const pendingHorsePreview = computed<HorseOption | null>(() => {
  return (
    horseOptions.value.find((horse) => {
      return pendingRaceHorseIds.value.includes(horse.id);
    }) ?? null
  );
});

const resolveRoundTrackSize = (roundNumber: number): number => {
  return (
    gameConfig.rounds.trackDistances[roundNumber - 1] ??
    gameConfig.rounds.trackDistances[gameConfig.rounds.trackDistances.length - 1] ??
    0
  );
};

const formatRoundRaceTime = (finishedAtTick: number | null): string => {
  if (finishedAtTick === null || finishedAtTick >= gameConfig.simulation.maxTicks) {
    return "DNF";
  }

  const normalizedTick = Math.max(0, finishedAtTick);
  const raceTimeSeconds = Number.parseFloat(
    (((normalizedTick + 1) * gameConfig.animation.tickMs) / 1000).toFixed(2),
  );

  return `${raceTimeSeconds.toFixed(2)}s`;
};

const isHorseSelectedForRound = (
  roundNumber: number,
  horseId: string,
): boolean => {
  const selectedIdsForRound =
    roundBetHorseIdsByRound.value[roundNumber] ?? selectedHorseIds.value;
  return selectedIdsForRound.includes(horseId);
};

const isSetupHorseDisabled = (horseId: string): boolean => {
  if (pendingRaceHorseIds.value.includes(horseId)) {
    return false;
  }

  if (stakeAmount.value < 1) {
    return true;
  }

  const nextHorseCount = pendingRaceHorseIds.value.length + 1;
  const totalStake = stakeAmount.value * nextHorseCount;
  return totalStake > availableCredit.value;
};

const selectAndShowHorseStatus = async (horseId: string): Promise<void> => {
  await openHorseStatus(horseId);
};

const openRaceSetupModal = (): void => {
  openRaceSetup(selectedHorseIds.value);
};

const startRaceWithPendingHorse = async (): Promise<void> => {
  await startRaceWithSetupSelection({
    onStart: async (horseIds) => {
      selectHorseIds(horseIds);

      if (isAwaitingBetweenRoundsBet.value) {
        submitBetweenRoundsSelection({
          horseIds,
        });
        return;
      }

      await buildSession(horseIds);
    },
  });
};

watch(
  () => {
    return isAwaitingBetweenRoundsBet.value;
  },
  (isAwaiting) => {
    if (!isAwaiting) {
      closeRaceSetupModal();
      return;
    }

    openRaceSetup(selectedHorseIds.value);
  },
);

onMounted(async () => {
  await initializePool();
  renderEmptyTrack();
});
</script>

<style lang="scss" src="./HorseRaceCanvas.scss"></style>
