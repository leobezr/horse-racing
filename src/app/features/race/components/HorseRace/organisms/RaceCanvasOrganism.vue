<template>
  <v-card
    class="game__canvas-wrap"
    data-test="app-race-canvas-wrap"
    variant="outlined"
  >
    <div
      v-if="showPreRaceCountdown"
      class="game__countdown"
      data-test="app-race-countdown"
    >
      <p class="game__countdown-value" data-test="app-race-countdown-value">
        {{ preRaceCountdownValue }}
      </p>
      <p class="game__countdown-label" data-test="app-race-countdown-label">
        {{ preRaceCountdownLabel }}
      </p>
    </div>

    <canvas
      class="game__canvas"
      data-test="app-race-canvas"
      :width="trackWidth"
      :height="trackHeight"
      :ref="onBindCanvas"
    />
  </v-card>
</template>

<script setup lang="ts">
import type { PropType } from "vue";

defineProps({
  showPreRaceCountdown: {
    type: Boolean,
    required: true,
  },
  preRaceCountdownValue: {
    type: Number,
    required: true,
  },
  preRaceCountdownLabel: {
    type: String,
    required: true,
  },
  trackWidth: {
    type: Number,
    required: true,
  },
  trackHeight: {
    type: Number,
    required: true,
  },
  onBindCanvas: {
    type: Function as PropType<(element: Element | null) => void>,
    required: true,
  },
});
</script>
