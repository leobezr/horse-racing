import { ref } from 'vue'

export const useRaceSetupModal = () => {
  const isRaceSetupModalOpen = ref<boolean>(false)
  const pendingRaceHorseIds = ref<string[]>([])

  const openRaceSetupModal = (selectedHorseIds: string[]): void => {
    pendingRaceHorseIds.value = [...selectedHorseIds]
    isRaceSetupModalOpen.value = true
  }

  const closeRaceSetupModal = (): void => {
    isRaceSetupModalOpen.value = false
    pendingRaceHorseIds.value = []
  }

  const onRaceSetupModalModelUpdate = (isOpen: boolean): void => {
    if (!isOpen) {
      closeRaceSetupModal()
    }
  }

  const togglePendingRaceHorse = (horseId: string): void => {
    const horseIndex = pendingRaceHorseIds.value.findIndex((id) => id === horseId)
    if (horseIndex >= 0) {
      pendingRaceHorseIds.value = pendingRaceHorseIds.value.filter((id) => id !== horseId)
      return
    }

    pendingRaceHorseIds.value = [...pendingRaceHorseIds.value, horseId]
  }

  const startRaceWithPendingHorses = async ({
    onStart,
  }: {
    onStart: (horseIds: string[]) => Promise<void>
  }): Promise<void> => {
    if (pendingRaceHorseIds.value.length === 0) {
      return
    }

    const selectedHorseIds = [...pendingRaceHorseIds.value]
    closeRaceSetupModal()
    await onStart(selectedHorseIds)
  }

  return {
    isRaceSetupModalOpen,
    pendingRaceHorseIds,
    openRaceSetupModal,
    closeRaceSetupModal,
    onRaceSetupModalModelUpdate,
    togglePendingRaceHorse,
    startRaceWithPendingHorses,
  }
}
