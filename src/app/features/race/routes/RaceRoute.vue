<template>
  <section class="route route--race" data-test="app-route-race">
    <h2 class="route__title" data-test="app-route-race-title">Race</h2>
    <HorseRaceCanvas />
  </section>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useRaceReplayStore } from '../../../../shared/pinia/race-replay-store'
import type { ReplayQuery } from '../types/replay-query'
import { HorseRaceCanvas } from '../components/HorseRace'

const route = useRoute()
const raceReplayStore = useRaceReplayStore()

watch(
  () => route.query,
  (query) => {
    const replayQuery: ReplayQuery = {
      replaySeed: typeof query.replaySeed === 'string' ? query.replaySeed : null,
      replayHorse: typeof query.replayHorse === 'string' ? query.replayHorse : null,
    }

    const { replaySeed, replayHorse } = replayQuery

    if (replaySeed && replayHorse) {
      raceReplayStore.setReplayRequest({
        seedText: replaySeed,
        selectedHorseId: replayHorse,
      })
    }
  },
  { immediate: true },
)
</script>

<style scoped lang="scss" src="./RaceRoute.scss"></style>
