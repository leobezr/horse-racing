<template>
  <v-card class="game__results" data-test="app-race-results" variant="outlined">
    <header class="game__results-header" data-test="app-race-results-header">
      <h3 class="game__results-title" data-test="app-race-results-title">
        Race Results
      </h3>
      <p class="game__results-subtitle" data-test="app-race-results-subtitle">
        {{
          liveRaceRound
            ? `Live round ${liveRaceRound.roundNumber} (${liveRaceRound.roundSecondsRemaining}s)`
            : "Round tables per match"
        }}
      </p>
    </header>

    <div class="game__results-scroll" data-test="app-race-results-scroll">
      <section
        v-if="liveHorseProgress.length > 0"
        class="game__round"
        data-test="app-race-live-card"
      >
        <h4 class="game__round-title" data-test="app-race-live-title">
          Live Standings
        </h4>
        <v-table
          class="game__round-table"
          data-test="app-race-live-table"
          density="compact"
        >
          <thead>
            <tr>
              <th class="game__round-heading" data-test="app-race-live-head">Lane</th>
              <th class="game__round-heading" data-test="app-race-live-head">Name</th>
              <th class="game__round-heading" data-test="app-race-live-head">
                Position
              </th>
              <th class="game__round-heading" data-test="app-race-live-head">
                Race Time
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="horse in liveHorseProgress"
              :key="`live-${horse.id}`"
              class="game__round-row"
              :data-selected="String(selectedHorseIds.includes(horse.id))"
              data-test="app-race-live-row"
            >
              <td class="game__round-cell" data-test="app-race-live-cell">
                {{ horse.laneNumber }}
              </td>
              <td class="game__round-cell" data-test="app-race-live-cell">
                {{ horse.name }}
              </td>
              <td class="game__round-cell" data-test="app-race-live-cell">
                {{ horse.position }}
              </td>
              <td class="game__round-cell" data-test="app-race-live-cell">
                {{ `${horse.raceTimeSeconds.toFixed(2)}s` }}
              </td>
            </tr>
          </tbody>
        </v-table>
      </section>

      <section
        v-for="round in raceRoundSummaries"
        :key="`round-${round.roundNumber}`"
        class="game__round"
        data-test="app-race-round-card"
      >
        <h4 class="game__round-title" data-test="app-race-round-title">
          Round {{ round.roundNumber }} -
          {{ resolveRoundTrackSize(round.roundNumber) }} meters
        </h4>

        <v-table
          class="game__round-table"
          data-test="app-race-round-table"
          density="compact"
        >
          <thead>
            <tr>
              <th class="game__round-heading" data-test="app-race-round-head">Lane</th>
              <th class="game__round-heading" data-test="app-race-round-head">Name</th>
              <th class="game__round-heading" data-test="app-race-round-head">
                Position
              </th>
              <th class="game__round-heading" data-test="app-race-round-head">
                Race Time
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(horse, index) in round.horseResults"
              :key="`round-${round.roundNumber}-${horse.id}`"
              class="game__round-row"
              :data-selected="String(isHorseSelectedForRound(round.roundNumber, horse.id))"
              data-test="app-race-round-row"
            >
              <td class="game__round-cell" data-test="app-race-round-cell">
                {{ horse.laneNumber }}
              </td>
              <td class="game__round-cell" data-test="app-race-round-cell">
                {{ horse.name }}
              </td>
              <td class="game__round-cell" data-test="app-race-round-cell">
                {{ index + 1 }}
              </td>
              <td class="game__round-cell" data-test="app-race-round-cell">
                {{ formatRoundRaceTime(horse.finishedAtTick) }}
              </td>
            </tr>
          </tbody>
        </v-table>
      </section>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import type { PropType } from "vue";
import type {
  LiveHorseProgress,
  LiveRaceRound,
  RaceRoundSummary,
} from "@/game/features/race/types/horse-race";

defineProps({
  liveRaceRound: {
    type: Object as PropType<LiveRaceRound | null>,
    required: true,
  },
  liveHorseProgress: {
    type: Array as PropType<LiveHorseProgress[]>,
    required: true,
  },
  selectedHorseIds: {
    type: Array as PropType<string[]>,
    required: true,
  },
  raceRoundSummaries: {
    type: Array as PropType<RaceRoundSummary[]>,
    required: true,
  },
  resolveRoundTrackSize: {
    type: Function as PropType<(roundNumber: number) => number>,
    required: true,
  },
  isHorseSelectedForRound: {
    type: Function as PropType<(roundNumber: number, horseId: string) => boolean>,
    required: true,
  },
  formatRoundRaceTime: {
    type: Function as PropType<(finishedAtTick: number | null) => string>,
    required: true,
  },
});
</script>
