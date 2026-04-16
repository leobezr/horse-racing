import { ref } from "vue";

const createTogglePendingRaceHorse = (
  pendingRaceHorseIds: { value: string[] },
): ((horseId: string) => void) => {
  return (horseId: string): void => {
    const horseIndex = pendingRaceHorseIds.value.findIndex((id) => {
      return id === horseId;
    });

    if (horseIndex >= 0) {
      pendingRaceHorseIds.value = pendingRaceHorseIds.value.filter((id) => {
        return id !== horseId;
      });
      return;
    }

    pendingRaceHorseIds.value = [...pendingRaceHorseIds.value, horseId];
  };
};

const createStartRaceWithPendingHorses = ({
  pendingRaceHorseIds,
  closeRaceSetupModal,
}: {
  pendingRaceHorseIds: { value: string[] };
  closeRaceSetupModal: () => void;
}): ((params: { onStart: (horseIds: string[]) => Promise<void> }) => Promise<void>) => {
  return async ({ onStart }): Promise<void> => {
    if (pendingRaceHorseIds.value.length === 0) {
      return;
    }

    const selectedHorseIds = [...pendingRaceHorseIds.value];
    closeRaceSetupModal();
    await onStart(selectedHorseIds);
  };
};

const createOpenRaceSetupModal = ({
  pendingRaceHorseIds,
  isRaceSetupModalOpen,
}: {
  pendingRaceHorseIds: { value: string[] };
  isRaceSetupModalOpen: { value: boolean };
}): ((selectedHorseIds: string[]) => void) => {
  return (selectedHorseIds: string[]): void => {
    pendingRaceHorseIds.value = [...selectedHorseIds];
    isRaceSetupModalOpen.value = true;
  };
};

const createCloseRaceSetupModal = ({
  pendingRaceHorseIds,
  isRaceSetupModalOpen,
}: {
  pendingRaceHorseIds: { value: string[] };
  isRaceSetupModalOpen: { value: boolean };
}): (() => void) => {
  return (): void => {
    isRaceSetupModalOpen.value = false;
    pendingRaceHorseIds.value = [];
  };
};

const createOnRaceSetupModalModelUpdate = ({
  closeRaceSetupModal,
}: {
  closeRaceSetupModal: () => void;
}): ((isOpen: boolean) => void) => {
  return (isOpen: boolean): void => {
    if (!isOpen) {
      closeRaceSetupModal();
    }
  };
};

export const useRaceSetupModalService = () => {
  const isRaceSetupModalOpen = ref<boolean>(false);
  const pendingRaceHorseIds = ref<string[]>([]);

  const openRaceSetupModal = createOpenRaceSetupModal({
    pendingRaceHorseIds,
    isRaceSetupModalOpen,
  });

  const closeRaceSetupModal = createCloseRaceSetupModal({
    pendingRaceHorseIds,
    isRaceSetupModalOpen,
  });

  const onRaceSetupModalModelUpdate = createOnRaceSetupModalModelUpdate({
    closeRaceSetupModal,
  });

  const togglePendingRaceHorse = createTogglePendingRaceHorse(pendingRaceHorseIds);

  const startRaceWithPendingHorses = createStartRaceWithPendingHorses({
    pendingRaceHorseIds,
    closeRaceSetupModal,
  });

  return {
    isRaceSetupModalOpen,
    pendingRaceHorseIds,
    openRaceSetupModal,
    closeRaceSetupModal,
    onRaceSetupModalModelUpdate,
    togglePendingRaceHorse,
    startRaceWithPendingHorses,
  };
};
