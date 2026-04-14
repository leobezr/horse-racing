import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import type { Ref } from 'vue'
import type { HorseOption } from '../../../../../../game/features/race/types/horse-race'

export const useHorseStatusModal = ({
  horseOptions,
  renderSheets,
}: {
  horseOptions: Ref<HorseOption[]>
  renderSheets: Ref<Record<string, HTMLCanvasElement[]>>
}) => {
  const statusCanvasRef = ref<HTMLCanvasElement | null>(null)
  const activeHorseStatusId = ref<string | null>(null)
  const statusFrameIndex = ref<number>(0)
  const statusFrameTimerId = ref<number | null>(null)
  const statusFrameIntervalMs = 120

  const activeHorseStatus = computed<HorseOption | null>(
    () => horseOptions.value.find((horse) => horse.id === activeHorseStatusId.value) ?? null,
  )

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

  onBeforeUnmount(() => {
    stopStatusAnimation()
  })

  return {
    statusCanvasRef,
    activeHorseStatus,
    openHorseStatus,
    closeHorseStatus,
    onStatusDialogModelUpdate,
  }
}
