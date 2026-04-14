<template>
  <section class="game" data-test="app-race-section">
    <v-row class="game__layout" data-test="app-race-layout">
      <v-col cols="12" md="3">
        <v-card class="game__pool" data-test="app-pool" variant="outlined">
          <header class="game__pool-header" data-test="app-pool-header">
            <h3 class="game__pool-title" data-test="app-pool-title">Horse Pool</h3>
            <p class="game__pool-subtitle" data-test="app-pool-subtitle">Pick one horse to bet and inspect</p>
          </header>

          <div class="game__pool-scroll" data-test="app-pool-scroll">
            <div class="game__pool-grid" data-test="app-pool-grid">
              <v-btn
                v-for="horse in horseOptions"
                :key="horse.id"
                class="game__horse-card"
                :data-selected="String(horse.id === selectedHorseId)"
                data-test="app-horse-card"
                variant="tonal"
                @click="selectAndShowHorseStatus(horse.id)"
              >
                <canvas
                  class="game__horse-idle-canvas"
                  data-test="app-horse-idle-canvas"
                  :ref="(node) => bindIdleCanvas(node as Element | null, horse.id)"
                ></canvas>
                <span class="game__horse-card-name" data-test="app-horse-card-name">{{ horse.name }}</span>
              </v-btn>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <section class="game__center" data-test="app-race-center">
          <v-card class="game__controls" data-test="app-race-controls" variant="outlined">
            <v-btn
              class="game__button"
              data-test="app-race-run-button"
              :disabled="isLoading || !canStartRace"
              color="primary"
              rounded="pill"
              @click="openRaceSetupModal"
            >
              {{ isLoading ? 'Building...' : 'New Race' }}
            </v-btn>

            <p class="game__credit" data-test="app-race-credit">Credit: {{ availableCredit }}</p>

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
                @click="selectChipAmount(chip)"
              >
                {{ chip }}
              </v-btn>
            </div>

            <p class="game__rounds-label" data-test="app-race-rounds-label">
              {{ gameConfig.rounds.count }} rounds x {{ gameConfig.rounds.secondsPerRound }}s
            </p>

            <p class="game__status" data-test="app-race-status">
              {{ statusMessage }}
            </p>
          </v-card>

          <v-card class="game__canvas-wrap" data-test="app-race-canvas-wrap" variant="outlined">
            <div v-if="showPreRaceCountdown" class="game__countdown" data-test="app-race-countdown">
              <p class="game__countdown-value" data-test="app-race-countdown-value">{{ preRaceCountdownValue }}</p>
              <p class="game__countdown-label" data-test="app-race-countdown-label">{{ preRaceCountdownLabel }}</p>
            </div>
            <canvas
              ref="canvasRef"
              class="game__canvas"
              data-test="app-race-canvas"
              :width="gameConfig.track.width"
              :height="gameConfig.track.height"
            />
          </v-card>
        </section>
      </v-col>

      <v-col cols="12" md="3">
        <v-card class="game__results" data-test="app-race-results" variant="outlined">
          <header class="game__results-header" data-test="app-race-results-header">
            <h3 class="game__results-title" data-test="app-race-results-title">Race Results</h3>
            <p class="game__results-subtitle" data-test="app-race-results-subtitle">
              {{ liveRaceRound ? `Live round ${liveRaceRound.roundNumber} (${liveRaceRound.roundSecondsRemaining}s)` : 'Round tables per match' }}
            </p>
          </header>

          <div class="game__results-scroll" data-test="app-race-results-scroll">
            <section v-if="liveHorseProgress.length > 0" class="game__round" data-test="app-race-live-card">
              <h4 class="game__round-title" data-test="app-race-live-title">Live Standings</h4>
              <v-table class="game__round-table" data-test="app-race-live-table" density="compact">
                <thead>
                  <tr>
                    <th class="game__round-heading" data-test="app-race-live-head">Horse</th>
                    <th class="game__round-heading" data-test="app-race-live-head">Lane</th>
                    <th class="game__round-heading" data-test="app-race-live-head">Distance</th>
                    <th class="game__round-heading" data-test="app-race-live-head">To Finish</th>
                    <th class="game__round-heading" data-test="app-race-live-head">ETA</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="horse in liveHorseProgress"
                    :key="`live-${horse.id}`"
                    class="game__round-row"
                    :data-selected="String(horse.id === selectedHorseId)"
                    data-test="app-race-live-row"
                  >
                    <td class="game__round-cell" data-test="app-race-live-cell">{{ horse.name }}</td>
                    <td class="game__round-cell" data-test="app-race-live-cell">{{ horse.laneNumber }}</td>
                    <td class="game__round-cell" data-test="app-race-live-cell">{{ horse.distance.toFixed(1) }}</td>
                    <td class="game__round-cell" data-test="app-race-live-cell">{{ horse.distanceToFinish.toFixed(1) }}</td>
                    <td class="game__round-cell" data-test="app-race-live-cell">
                      {{ horse.estimatedSecondsToFinish === null ? 'Finished' : `${horse.estimatedSecondsToFinish.toFixed(2)}s` }}
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
              <h4 class="game__round-title" data-test="app-race-round-title">Round {{ round.roundNumber }}</h4>

              <v-table class="game__round-table" data-test="app-race-round-table" density="compact">
                <thead>
                  <tr>
                    <th class="game__round-heading" data-test="app-race-round-head">Horse</th>
                    <th class="game__round-heading" data-test="app-race-round-head">Lane</th>
                    <th class="game__round-heading" data-test="app-race-round-head">Round Dist</th>
                    <th class="game__round-heading" data-test="app-race-round-head">Total Dist</th>
                    <th class="game__round-heading" data-test="app-race-round-head">Avg Speed</th>
                    <th class="game__round-heading" data-test="app-race-round-head">Sprints</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="horse in round.horseResults"
                    :key="`round-${round.roundNumber}-${horse.id}`"
                    class="game__round-row"
                    :data-selected="String(horse.id === selectedHorseId)"
                    data-test="app-race-round-row"
                  >
                    <td class="game__round-cell" data-test="app-race-round-cell">{{ horse.name }}</td>
                    <td class="game__round-cell" data-test="app-race-round-cell">{{ horse.laneNumber }}</td>
                    <td class="game__round-cell" data-test="app-race-round-cell">{{ horse.roundDistance.toFixed(1) }}</td>
                    <td class="game__round-cell" data-test="app-race-round-cell">{{ horse.totalDistance.toFixed(1) }}</td>
                    <td class="game__round-cell" data-test="app-race-round-cell">{{ horse.averageTickSpeed.toFixed(2) }}</td>
                    <td class="game__round-cell" data-test="app-race-round-cell">{{ horse.sprintCount }}/3</td>
                  </tr>
                </tbody>
              </v-table>
            </section>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog
      :model-value="isRaceSetupModalOpen"
      class="game__modal-backdrop"
      data-test="app-race-setup-modal-backdrop"
      max-width="640"
      @update:model-value="onRaceSetupModalModelUpdate"
    >
      <v-card class="game__setup" data-test="app-race-setup-modal" variant="outlined">
        <header class="game__setup-header" data-test="app-race-setup-modal-header">
          <h3 class="game__setup-title" data-test="app-race-setup-modal-title">Pick Horse</h3>
          <p class="game__setup-subtitle" data-test="app-race-setup-modal-subtitle">Select 1 horse from 20 before race start</p>
        </header>

        <div class="game__setup-body" data-test="app-race-setup-body">
          <div class="game__setup-grid" data-test="app-race-setup-horse-grid">
            <v-btn
              v-for="horse in horseOptions"
              :key="`setup-${horse.id}`"
              class="game__setup-horse"
              :data-selected="String(horse.id === pendingRaceHorseId)"
              data-test="app-race-setup-horse"
              rounded="pill"
              @click="selectPendingRaceHorse(horse.id)"
            >
              {{ horse.laneNumber }} - {{ horse.name }} - {{ (horse.odds.probability * 100).toFixed(1) }}%
            </v-btn>
          </div>

          <section v-if="pendingHorsePreview" class="game__setup-meta" data-test="app-race-setup-horse-meta">
            <p class="game__setup-meta-line" data-test="app-race-setup-horse-meta-line">Horse: {{ pendingHorsePreview.name }}</p>
            <p class="game__setup-meta-line" data-test="app-race-setup-horse-meta-line">Lane: {{ pendingHorsePreview.laneNumber }}</p>
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
          </section>

          <section v-else class="game__setup-meta game__setup-meta--empty" data-test="app-race-setup-horse-meta-empty">
            <p class="game__setup-meta-line" data-test="app-race-setup-horse-meta-line">Select a horse to preview details.</p>
          </section>
        </div>

        <footer class="game__setup-controls" data-test="app-race-setup-controls">
          <v-btn
            class="game__setup-action"
            data-test="app-race-setup-cancel"
            variant="text"
            rounded="pill"
            @click="closeRaceSetupModal"
          >
            Cancel
          </v-btn>
          <v-btn
            class="game__setup-action game__setup-action--next"
            data-test="app-race-setup-next"
            :disabled="pendingRaceHorseId === null || isLoading"
            rounded="pill"
            @click="startRaceWithPendingHorse"
          >
            Next
          </v-btn>
        </footer>
      </v-card>
    </v-dialog>

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
          <h3 class="game__modal-title" data-test="app-horse-status-modal-title">{{ activeHorseStatus.name }}</h3>
          <v-btn
            class="game__modal-close"
            data-test="app-horse-status-modal-close"
            variant="text"
            rounded="pill"
            @click="closeHorseStatus"
          >
            Close
          </v-btn>
        </header>

        <canvas ref="statusCanvasRef" class="game__modal-canvas" data-test="app-horse-status-modal-canvas"></canvas>

        <div class="game__modal-stats" data-test="app-horse-status-modal-stats">
          <p class="game__modal-line" data-test="app-horse-status-modal-line">ID: {{ activeHorseStatus.id }}</p>
          <p class="game__modal-line" data-test="app-horse-status-modal-line">Lane: {{ activeHorseStatus.laneNumber }}</p>
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
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useHorseRaceCanvas } from '../../../../../game/features/race/presentation/use-horse-race-canvas'
import type { HorseOption } from '../../../../../game/features/race/types/horse-race'
import { useProfileBetsStore } from '../../../../../shared/pinia/profile-bets-store'
import { useRaceHistoryStore } from '../../../../../shared/pinia/race-history-store'
import { useRaceReplayStore } from '../../../../../shared/pinia/race-replay-store'
import { useHorseIdlePreviews } from './lib/use-horse-idle-previews'
import { useHorseStatusModal } from './lib/use-horse-status-modal'
import { useRaceSetupModal } from './lib/use-race-setup-modal'

const profileBetsStore = useProfileBetsStore()
const raceHistoryStore = useRaceHistoryStore()
const raceReplayStore = useRaceReplayStore()

const {
  canvasRef,
  isLoading,
  selectedHorseId,
  selectHorse,
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
  liveRaceRound,
  liveHorseProgress,
  showPreRaceCountdown,
  preRaceCountdownValue,
  preRaceCountdownLabel,
} = useHorseRaceCanvas({
  profileBetsStore,
  raceHistoryStore,
  raceReplayStore,
})

const {
  isRaceSetupModalOpen,
  pendingRaceHorseId,
  openRaceSetupModal: openRaceSetup,
  closeRaceSetupModal,
  onRaceSetupModalModelUpdate,
  selectPendingRaceHorse,
  startRaceWithPendingHorse: startRaceWithSetupSelection,
} = useRaceSetupModal()

const {
  statusCanvasRef,
  activeHorseStatus,
  openHorseStatus,
  closeHorseStatus,
  onStatusDialogModelUpdate,
} = useHorseStatusModal({
  horseOptions,
  renderSheets,
})

const { bindIdleCanvas } = useHorseIdlePreviews({
  horseOptions,
  renderSheets,
})

const pendingHorsePreview = computed<HorseOption | null>(
  () => horseOptions.value.find((horse) => horse.id === pendingRaceHorseId.value) ?? null,
)

const selectAndShowHorseStatus = async (horseId: string): Promise<void> => {
  await openHorseStatus(horseId)
}

const openRaceSetupModal = (): void => {
  openRaceSetup(selectedHorseId.value)
}

const startRaceWithPendingHorse = async (): Promise<void> => {
  await startRaceWithSetupSelection({
    onStart: async (horseId) => {
      selectHorse(horseId)
      await buildSession(horseId)
    },
  })
}

onMounted(async () => {
  await initializePool()
  renderEmptyTrack()
})
</script>

<style scoped lang="scss" src="./HorseRaceCanvas.scss"></style>
