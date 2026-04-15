<template>
  <v-card class="history" data-test="app-route-history" variant="outlined">
    <h2 class="history__title" data-test="app-route-history-title">Race history</h2>

    <p class="history__text" data-test="app-route-history-text">All generated games are listed below. Click replay to run the same seed.</p>

    <v-list class="history__list" data-test="app-history-list" lines="two" bg-color="transparent">
      <v-list-item v-for="entry in orderedEntries" :key="entry.id" class="history__item" data-test="app-history-item">
        <div class="history__item-content" data-test="app-history-item-content">
          <p class="history__line" data-test="app-history-item-date">{{ formatTimestamp(entry.createdAtIso) }}</p>
          <p class="history__line" data-test="app-history-item-seed">Seed: {{ entry.seedText }}</p>
          <p class="history__line" data-test="app-history-item-pick">Picked: {{ entry.selectedHorseId }}</p>
          <p class="history__line" data-test="app-history-item-winner">Winner: {{ entry.winnerHorseId ?? 'none' }}</p>
        </div>

        <template #append>
          <v-btn
            class="history__replay-button"
            data-test="app-history-replay-button"
            color="primary"
            variant="tonal"
            rounded="pill"
            @click="replayRace(entry.seedText, entry.selectedHorseId)"
          >
            Replay
          </v-btn>
        </template>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useRaceHistoryStore } from '../../../../shared/pinia/race-history-store'
import type { RaceHistoryEntry } from '../types/race-history'

const router = useRouter()
const raceHistoryStore = useRaceHistoryStore()
const orderedEntries = raceHistoryStore.orderedEntries

const formatTimestamp = (iso: string): string => {return new Date(iso).toLocaleString()}

const replayRace = (seedText: RaceHistoryEntry['seedText'], selectedHorseId: RaceHistoryEntry['selectedHorseId']): void => {
  void router.push({
    name: 'race',
    query: {
      replaySeed: seedText,
      replayHorse: selectedHorseId,
    },
  })
}
</script>

<style scoped lang="scss" src="./RaceHistoryRoute.scss"></style>
