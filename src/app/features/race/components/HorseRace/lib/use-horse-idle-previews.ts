import { watch } from 'vue'
import type { Ref } from 'vue'
import type { HorseOption } from '../../../../../../game/features/race/types/horse-race'

export const useHorseIdlePreviews = ({
  horseOptions,
  renderSheets,
}: {
  horseOptions: Ref<HorseOption[]>
  renderSheets: Ref<Record<string, HTMLCanvasElement[]>>
}) => {
  const idleCanvasMap = new Map<string, HTMLCanvasElement>()

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
      const horse = horseOptions.value.find((entry) => {return entry.id === horseId})
      if (horse) {
        drawIdleFrame(horse, node)
      }
      return
    }

    idleCanvasMap.delete(horseId)
  }

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

  return {
    bindIdleCanvas,
  }
}
