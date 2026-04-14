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
            <label class="game__field" data-test="app-bet-field">
              <span class="game__label">Bet amount</span>
              <v-text-field
                v-model.number="stakeAmount"
                class="game__input"
                data-test="app-bet-amount-input"
                type="number"
                density="comfortable"
                variant="outlined"
                min="1"
                max="100000"
                step="1"
              />
            </label>

            <v-btn
              class="game__button"
              data-test="app-race-run-button"
              :disabled="isLoading || !canStartRace"
              color="primary"
              rounded="pill"
              @click="buildSession"
            >
              {{ isLoading ? 'Building...' : 'Run deterministic race' }}
            </v-btn>

            <p class="game__status" data-test="app-race-status">
              {{ statusMessage }}
            </p>
          </v-card>

          <v-card class="game__canvas-wrap" data-test="app-race-canvas-wrap" variant="outlined">
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
            <p class="game__results-subtitle" data-test="app-race-results-subtitle">Metadata per horse</p>
          </header>

          <div class="game__results-scroll" data-test="app-race-results-scroll">
            <v-list class="game__results-list" data-test="app-race-results-list" lines="three" bg-color="transparent">
              <v-list-item
                v-for="horse in horseOptions"
                :key="`meta-${horse.id}`"
                class="game__results-item"
                :data-selected="String(horse.id === selectedHorseId)"
                data-test="app-horse-meta-card"
              >
                <p class="game__results-line" data-test="app-horse-meta-line">{{ horse.name }}</p>
                <p class="game__results-line" data-test="app-horse-meta-line">Lane: {{ horse.laneNumber }}</p>
                <p class="game__results-line" data-test="app-horse-meta-line">Distance: {{ horse.metadata.finalDistance.toFixed(1) }}</p>
                <p class="game__results-line" data-test="app-horse-meta-line">Finish: {{ horse.metadata.finishedAtTick ?? 'DNF' }}</p>
                <p class="game__results-line" data-test="app-horse-meta-line">Bursts: {{ horse.metadata.burstCount }}</p>
              </v-list-item>
            </v-list>
          </div>
        </v-card>
      </v-col>
    </v-row>

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
            Burst control: {{ activeHorseStatus.stats.burstControl.toFixed(2) }}
          </p>
        </div>
      </v-card>
    </v-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useHorseRaceCanvas } from '../../../../game/features/race/presentation/use-horse-race-canvas'
import type { HorseOption } from '../../../../game/features/race/types/horse-race'

const {
  canvasRef,
  isLoading,
  selectedHorseId,
  stakeAmount,
  canStartRace,
  horseOptions,
  statusMessage,
  buildSession,
  initializePool,
  gameConfig,
  renderSheets,
} = useHorseRaceCanvas()

const statusCanvasRef = ref<HTMLCanvasElement | null>(null)
const activeHorseStatusId = ref<string | null>(null)
const idleCanvasMap = new Map<string, HTMLCanvasElement>()
const statusFrameIndex = ref<number>(0)
const statusFrameTimerId = ref<number | null>(null)
const statusFrameIntervalMs = 120

const activeHorseStatus = computed<HorseOption | null>(
  () => horseOptions.value.find((horse) => horse.id === activeHorseStatusId.value) ?? null,
)

const selectHorse = (horseId: string): void => {
  selectedHorseId.value = horseId
}

const selectAndShowHorseStatus = (horseId: string): void => {
  selectHorse(horseId)
  void openHorseStatus(horseId)
}

const drawIdleFrame = (horse: HorseOption, targetCanvas: HTMLCanvasElement): void => {
  const context = targetCanvas.getContext('2d')
  const idleFrame = renderSheets.value[horse.id]?.[0]
  if (!context || !idleFrame) {
    return
  }

  targetCanvas.width = idleFrame.width
  targetCanvas.height = idleFrame.height
  context.clearRect(0, 0, targetCanvas.width, targetCanvas.height)
  context.drawImage(idleFrame, 0, 0)
}

const bindIdleCanvas = (node: Element | null, horseId: string): void => {
  if (node instanceof HTMLCanvasElement) {
    idleCanvasMap.set(horseId, node)
    const horse = horseOptions.value.find((entry) => entry.id === horseId)
    if (horse) {
      drawIdleFrame(horse, node)
    }
    return
  }
  idleCanvasMap.delete(horseId)
}

const drawStatusFrame = (frameIndexOverride?: number): void => {
  const horse = activeHorseStatus.value
  const canvas = statusCanvasRef.value
  if (!horse || !canvas) {
    return
  }

  const context = canvas.getContext('2d')
  if (!context) {
    return
  }

  const frameSequence = horse.frameSequence.length > 0 ? horse.frameSequence : [0]
  const frameIndex = frameIndexOverride ?? statusFrameIndex.value
  const frameId = frameSequence[frameIndex % frameSequence.length]
  const frame = renderSheets.value[horse.id]?.[frameId]
  if (!frame) {
    return
  }

  canvas.width = frame.width
  canvas.height = frame.height
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.drawImage(frame, 0, 0)
}

const stopStatusAnimation = (): void => {
  if (statusFrameTimerId.value !== null) {
    window.clearInterval(statusFrameTimerId.value)
    statusFrameTimerId.value = null
  }
}

const startStatusAnimation = (): void => {
  stopStatusAnimation()
  statusFrameIndex.value = 0
  drawStatusFrame(0)
  statusFrameTimerId.value = window.setInterval(() => {
    statusFrameIndex.value += 1
    drawStatusFrame()
  }, statusFrameIntervalMs)
}

const openHorseStatus = async (horseId: string): Promise<void> => {
  activeHorseStatusId.value = horseId
  await nextTick()
  startStatusAnimation()
}

const closeHorseStatus = (): void => {
  activeHorseStatusId.value = null
  stopStatusAnimation()
}

const onStatusDialogModelUpdate = (isOpen: boolean): void => {
  if (!isOpen) {
    closeHorseStatus()
  }
}

void initializePool()

watch(
  horseOptions,
  (horses) => {
    for (const horse of horses) {
      const canvas = idleCanvasMap.get(horse.id)
      if (canvas) {
        drawIdleFrame(horse, canvas)
      }
    }
  },
  { deep: true },
)

onBeforeUnmount(() => {
  stopStatusAnimation()
})
</script>

<style scoped lang="scss" src="./HorseRaceCanvas.scss"></style>
