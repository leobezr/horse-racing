import { ref } from 'vue'

export const useRaceSetupModal = () => {
  const isRaceSetupModalOpen = ref<boolean>(false)
  const pendingRaceHorseId = ref<string | null>(null)

  const openRaceSetupModal = (selectedHorseId: string | null): void => {
    pendingRaceHorseId.value = selectedHorseId
    isRaceSetupModalOpen.value = true
  }

  const closeRaceSetupModal = (): void => {
    isRaceSetupModalOpen.value = false
    pendingRaceHorseId.value = null
  }

  const onRaceSetupModalModelUpdate = (isOpen: boolean): void => {
    if (!isOpen) {
      closeRaceSetupModal()
    }
  }

  const selectPendingRaceHorse = (horseId: string): void => {
    pendingRaceHorseId.value = horseId
  }

  const startRaceWithPendingHorse = async ({
    onStart,
  }: {
    onStart: (horseId: string) => Promise<void>
  }): Promise<void> => {
    const horseId = pendingRaceHorseId.value
    if (!horseId) {
      return
    }

    closeRaceSetupModal()
    await onStart(horseId)
  }

  return {
    isRaceSetupModalOpen,
    pendingRaceHorseId,
    openRaceSetupModal,
    closeRaceSetupModal,
    onRaceSetupModalModelUpdate,
    selectPendingRaceHorse,
    startRaceWithPendingHorse,
  }
}
