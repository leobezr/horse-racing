<template>
  <v-card class="game__controls" data-test="app-race-controls" variant="outlined">
    <v-btn
      class="game__button"
      data-test="app-race-run-button"
      :disabled="isLoading || !canStartRace"
      color="primary"
      rounded="pill"
      @click="onOpenRaceSetup"
    >
      {{ isLoading ? "Building..." : "New Race" }}
    </v-btn>

    <p class="game__credit" data-test="app-race-credit">
      Credit: {{ NumberNormalizer(availableCredit) }}
    </p>

    <div class="game__chips" data-test="app-race-chip-list">
      <v-btn
        v-for="chip in chipValues"
        :key="`chip-${chip}`"
        class="game__chip"
        :data-selected="String(chip === stakeAmount)"
        data-test="app-race-chip"
        size="small"
        rounded="pill"
        :disabled="isLoading || !canAffordChip(chip)"
        @click="onSelectChipAmount(chip)"
      >
        {{ chip }}
      </v-btn>
    </div>

    <p class="game__rounds-label" data-test="app-race-rounds-label">
      {{ roundsCount }} rounds x {{ secondsPerRound }}s
    </p>

    <p class="game__status" data-test="app-race-status">{{ statusMessage }}</p>
  </v-card>
</template>

<script setup lang="ts">
import type { PropType } from "vue";
import { NumberNormalizer } from "@/app/utils/number-normalizer";

defineProps({
  isLoading: {
    type: Boolean,
    required: true,
  },
  canStartRace: {
    type: Boolean,
    required: true,
  },
  availableCredit: {
    type: Number,
    required: true,
  },
  chipValues: {
    type: Array as PropType<number[]>,
    required: true,
  },
  stakeAmount: {
    type: Number,
    required: true,
  },
  canAffordChip: {
    type: Function as PropType<(chip: number) => boolean>,
    required: true,
  },
  onSelectChipAmount: {
    type: Function as PropType<(chip: number) => void>,
    required: true,
  },
  onOpenRaceSetup: {
    type: Function as PropType<() => void>,
    required: true,
  },
  roundsCount: {
    type: Number,
    required: true,
  },
  secondsPerRound: {
    type: Number,
    required: true,
  },
  statusMessage: {
    type: String,
    required: true,
  },
});
</script>
