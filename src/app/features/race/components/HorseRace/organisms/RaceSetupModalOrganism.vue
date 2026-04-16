<template>
  <v-dialog
    :model-value="isRaceSetupModalOpen"
    class="game__modal-backdrop"
    data-test="app-race-setup-modal-backdrop"
    max-width="640"
    @update:model-value="onRaceSetupModalModelUpdate"
  >
    <v-card class="game__setup" data-test="app-race-setup-modal" variant="outlined">
      <header class="game__setup-header" data-test="app-race-setup-modal-header">
        <h3 class="game__setup-title" data-test="app-race-setup-modal-title">
          Pick Horse
        </h3>
        <p class="game__setup-subtitle" data-test="app-race-setup-modal-subtitle">
          <template v-if="isAwaitingBetweenRoundsBet">
            Halftime: pick one or more horses. Next round starts in
            {{ betweenRoundsCountdownValue ?? 0 }}s.
          </template>
          <template v-else>Select one or more horses before race start</template>
        </p>
      </header>

      <div class="game__setup-body" data-test="app-race-setup-body">
        <div class="game__setup-grid" data-test="app-race-setup-horse-grid">
          <v-btn
            v-for="horse in horseOptions"
            :key="`setup-${horse.id}`"
            class="game__setup-horse"
            :data-selected="String(pendingRaceHorseIds.includes(horse.id))"
            :data-disabled="String(isSetupHorseDisabled(horse.id))"
            data-test="app-race-setup-horse"
            :disabled="isSetupHorseDisabled(horse.id)"
            rounded="pill"
            @click="onTogglePendingRaceHorse(horse.id)"
          >
            {{ horse.laneNumber }} - {{ horse.name }} -
            {{ (horse.odds.probability * 100).toFixed(1) }}%
          </v-btn>
        </div>

        <section
          v-if="pendingHorsePreview"
          class="game__setup-meta"
          data-test="app-race-setup-horse-meta"
        >
          <p class="game__setup-meta-line" data-test="app-race-setup-horse-meta-line">
            Horse: {{ pendingHorsePreview.name }}
          </p>
          <p class="game__setup-meta-line" data-test="app-race-setup-horse-meta-line">
            Lane: {{ pendingHorsePreview.laneNumber }}
          </p>
          <p class="game__setup-meta-line" data-test="app-race-setup-horse-meta-line">
            Base speed: {{ pendingHorsePreview.stats.baseSpeed.toFixed(2) }}
          </p>
          <p class="game__setup-meta-line" data-test="app-race-setup-horse-meta-line">
            Sprint control: {{ pendingHorsePreview.stats.sprintControl.toFixed(2) }}
          </p>
          <p class="game__setup-meta-line" data-test="app-race-setup-horse-meta-line">
            Win chance: {{ (pendingHorsePreview.odds.probability * 100).toFixed(1) }}%
          </p>
          <p class="game__setup-meta-line" data-test="app-race-setup-horse-meta-line">
            Odds: {{ pendingHorsePreview.odds.label }}
          </p>
          <p class="game__setup-meta-line" data-test="app-race-setup-horse-meta-line">
            Selected horses: {{ pendingRaceHorseIds.length }}
          </p>
        </section>

        <section
          v-else
          class="game__setup-meta game__setup-meta--empty"
          data-test="app-race-setup-horse-meta-empty"
        >
          <p class="game__setup-meta-line" data-test="app-race-setup-horse-meta-line">
            Select one or more horses to preview details.
          </p>
        </section>
      </div>

      <footer class="game__setup-controls" data-test="app-race-setup-controls">
        <v-btn
          class="game__setup-action"
          data-test="app-race-setup-cancel"
          variant="text"
          rounded="pill"
          @click="onCloseRaceSetup"
        >
          Cancel
        </v-btn>
        <v-btn
          class="game__setup-action game__setup-action--next"
          data-test="app-race-setup-next"
          :disabled="pendingRaceHorseIds.length === 0 || isLoading"
          rounded="pill"
          @click="onStartRaceWithPendingHorse"
        >
          <template v-if="isAwaitingBetweenRoundsBet">
            Start - {{ betweenRoundsCountdownValue ?? 0 }}
          </template>
          <template v-else>Start</template>
        </v-btn>
      </footer>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { PropType } from "vue";
import type { HorseOption } from "@/game/features/race/types/horse-race";

defineProps({
  isRaceSetupModalOpen: {
    type: Boolean,
    required: true,
  },
  onRaceSetupModalModelUpdate: {
    type: Function as PropType<(isOpen: boolean) => void>,
    required: true,
  },
  isAwaitingBetweenRoundsBet: {
    type: Boolean,
    required: true,
  },
  betweenRoundsCountdownValue: {
    type: Number as PropType<number | null>,
    required: true,
  },
  horseOptions: {
    type: Array as PropType<HorseOption[]>,
    required: true,
  },
  pendingRaceHorseIds: {
    type: Array as PropType<string[]>,
    required: true,
  },
  isSetupHorseDisabled: {
    type: Function as PropType<(horseId: string) => boolean>,
    required: true,
  },
  onTogglePendingRaceHorse: {
    type: Function as PropType<(horseId: string) => void>,
    required: true,
  },
  pendingHorsePreview: {
    type: Object as PropType<HorseOption | null>,
    required: true,
  },
  onCloseRaceSetup: {
    type: Function as PropType<() => void>,
    required: true,
  },
  isLoading: {
    type: Boolean,
    required: true,
  },
  onStartRaceWithPendingHorse: {
    type: Function as PropType<() => void>,
    required: true,
  },
});
</script>
