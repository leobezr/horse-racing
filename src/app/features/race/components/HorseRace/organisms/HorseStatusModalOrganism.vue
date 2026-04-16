<template>
  <v-dialog
    v-if="activeHorseStatus"
    :model-value="Boolean(activeHorseStatus)"
    class="game__modal-backdrop"
    data-test="app-horse-status-modal-backdrop"
    max-width="480"
    @update:model-value="onStatusDialogModelUpdate"
  >
    <v-card class="game__modal" data-test="app-horse-status-modal" variant="outlined">
      <header class="game__modal-header" data-test="app-horse-status-modal-header">
        <h3 class="game__modal-title" data-test="app-horse-status-modal-title">
          {{ activeHorseStatus.name }}
        </h3>
        <v-btn
          class="game__modal-close"
          data-test="app-horse-status-modal-close"
          variant="text"
          rounded="pill"
          @click="onCloseHorseStatus"
        >
          Close
        </v-btn>
      </header>

      <canvas
        class="game__modal-canvas"
        data-test="app-horse-status-modal-canvas"
        :ref="onBindStatusCanvas"
      ></canvas>

      <div class="game__modal-stats" data-test="app-horse-status-modal-stats">
        <p class="game__modal-line" data-test="app-horse-status-modal-line">
          ID: {{ activeHorseStatus.id }}
        </p>
        <p class="game__modal-line" data-test="app-horse-status-modal-line">
          Lane: {{ activeHorseStatus.laneNumber }}
        </p>
        <p class="game__modal-line" data-test="app-horse-status-modal-line">
          Base speed: {{ activeHorseStatus.stats.baseSpeed.toFixed(2) }}
        </p>
        <p class="game__modal-line" data-test="app-horse-status-modal-line">
          Sprint control: {{ activeHorseStatus.stats.sprintControl.toFixed(2) }}
        </p>
        <p class="game__modal-line" data-test="app-horse-status-modal-line">
          Win chance: {{ (activeHorseStatus.odds.probability * 100).toFixed(1) }}%
        </p>
        <p class="game__modal-line" data-test="app-horse-status-modal-line">
          Odds: {{ activeHorseStatus.odds.label }}
        </p>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { PropType } from "vue";
import type { HorseOption } from "@/game/features/race/types/horse-race";

defineProps({
  activeHorseStatus: {
    type: Object as PropType<HorseOption | null>,
    required: true,
  },
  onStatusDialogModelUpdate: {
    type: Function as PropType<(isOpen: boolean) => void>,
    required: true,
  },
  onCloseHorseStatus: {
    type: Function as PropType<() => void>,
    required: true,
  },
  onBindStatusCanvas: {
    type: Function as PropType<(element: Element | null) => void>,
    required: true,
  },
});
</script>
