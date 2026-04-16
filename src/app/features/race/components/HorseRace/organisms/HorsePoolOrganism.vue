<template>
  <v-card class="game__pool" data-test="app-pool" variant="outlined">
    <header class="game__pool-header" data-test="app-pool-header">
      <h3 class="game__pool-title" data-test="app-pool-title">Horse Pool</h3>
      <p class="game__pool-subtitle" data-test="app-pool-subtitle">
        These are the available horses for betting
      </p>
    </header>

    <div class="game__pool-scroll" data-test="app-pool-scroll">
      <div class="game__pool-grid" data-test="app-pool-grid">
        <v-btn
          v-for="horse in horseOptions"
          :key="horse.id"
          class="game__horse-card"
          :data-selected="String(horse.id === selectedHorseId)"
          data-test="app-horse-card"
          variant="text"
          @click="onSelectHorse(horse.id)"
        >
          <div class="game__horse-container">
            <canvas
              class="game__horse-idle-canvas"
              data-test="app-horse-idle-canvas"
              :ref="(node) => bindIdleCanvas(node as Element | null, horse.id)"
            />

            <span class="game__horse-card-name" data-test="app-horse-card-name">
              {{ horse.name }}
            </span>
          </div>
        </v-btn>
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import type { PropType } from "vue";
import type { HorseOption } from "@/game/features/race/types/horse-race";

defineProps({
  horseOptions: {
    type: Array as PropType<HorseOption[]>,
    required: true,
  },
  selectedHorseId: {
    type: String,
    required: true,
  },
  bindIdleCanvas: {
    type: Function as PropType<(node: Element | null, horseId: string) => void>,
    required: true,
  },
  onSelectHorse: {
    type: Function as PropType<(horseId: string) => void>,
    required: true,
  },
});
</script>
