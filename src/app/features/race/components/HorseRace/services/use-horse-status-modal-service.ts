import { computed, nextTick, onBeforeUnmount, ref } from "vue";
import type { Ref } from "vue";
import type { HorseOption } from "@/game/features/race/types/horse-race";

type HorseStatusRef = { value: HorseOption | null };
type CanvasRef = { value: HTMLCanvasElement | null };
type NumberRef = { value: number };
type TimerRef = { value: number | null };
type HorseOptionsRef = Ref<HorseOption[]>;
type RenderSheetsRef = Ref<Record<string, HTMLCanvasElement[]>>;

const resolveActiveHorseStatus = ({
  horseOptions,
  activeHorseStatusId,
}: {
  horseOptions: HorseOptionsRef;
  activeHorseStatusId: { value: string | null };
}): HorseOption | null => {
  return (
    horseOptions.value.find((horse) => {
      return horse.id === activeHorseStatusId.value;
    }) ?? null
  );
};

const drawStatusFrame = ({
  activeHorseStatus,
  statusCanvasRef,
  renderSheets,
  statusFrameIndex,
  frameIndexOverride,
}: {
  activeHorseStatus: HorseStatusRef;
  statusCanvasRef: CanvasRef;
  renderSheets: RenderSheetsRef;
  statusFrameIndex: NumberRef;
  frameIndexOverride?: number;
}): void => {
  const horse = activeHorseStatus.value;
  const canvas = statusCanvasRef.value;

  if (!horse || !canvas) {
    return;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const frameSequence = horse.frameSequence.length > 0 ? horse.frameSequence : [0];
  const frameIndex = frameIndexOverride ?? statusFrameIndex.value;
  const frameId = frameSequence[frameIndex % frameSequence.length];
  const frame = renderSheets.value[horse.id]?.[frameId];

  if (!frame) {
    return;
  }

  canvas.width = frame.width;
  canvas.height = frame.height;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(frame, 0, 0);
};

const stopStatusAnimation = ({
  statusFrameTimerId,
}: {
  statusFrameTimerId: TimerRef;
}): void => {
  if (statusFrameTimerId.value !== null) {
    window.clearInterval(statusFrameTimerId.value);
    statusFrameTimerId.value = null;
  }
};

const startStatusAnimation = ({
  statusFrameTimerId,
  statusFrameIndex,
  activeHorseStatus,
  statusCanvasRef,
  renderSheets,
  statusFrameIntervalMs,
}: {
  statusFrameTimerId: TimerRef;
  statusFrameIndex: NumberRef;
  activeHorseStatus: HorseStatusRef;
  statusCanvasRef: CanvasRef;
  renderSheets: RenderSheetsRef;
  statusFrameIntervalMs: number;
}): void => {
  stopStatusAnimation({ statusFrameTimerId });
  statusFrameIndex.value = 0;

  drawStatusFrame({
    activeHorseStatus,
    statusCanvasRef,
    renderSheets,
    statusFrameIndex,
    frameIndexOverride: 0,
  });

  statusFrameTimerId.value = window.setInterval(() => {
    statusFrameIndex.value += 1;
    drawStatusFrame({
      activeHorseStatus,
      statusCanvasRef,
      renderSheets,
      statusFrameIndex,
    });
  }, statusFrameIntervalMs);
};

const createOpenHorseStatus = ({
  activeHorseStatusId,
  statusFrameTimerId,
  statusFrameIndex,
  activeHorseStatus,
  statusCanvasRef,
  renderSheets,
  statusFrameIntervalMs,
}: {
  activeHorseStatusId: { value: string | null };
  statusFrameTimerId: TimerRef;
  statusFrameIndex: NumberRef;
  activeHorseStatus: HorseStatusRef;
  statusCanvasRef: CanvasRef;
  renderSheets: RenderSheetsRef;
  statusFrameIntervalMs: number;
}): ((horseId: string) => Promise<void>) => {
  return async (horseId: string): Promise<void> => {
    activeHorseStatusId.value = horseId;
    await nextTick();
    startStatusAnimation({
      statusFrameTimerId,
      statusFrameIndex,
      activeHorseStatus,
      statusCanvasRef,
      renderSheets,
      statusFrameIntervalMs,
    });
  };
};

const createCloseHorseStatus = ({
  activeHorseStatusId,
  statusFrameTimerId,
}: {
  activeHorseStatusId: { value: string | null };
  statusFrameTimerId: TimerRef;
}): (() => void) => {
  return (): void => {
    activeHorseStatusId.value = null;
    stopStatusAnimation({ statusFrameTimerId });
  };
};

const createOnStatusDialogModelUpdate = ({
  closeHorseStatus,
}: {
  closeHorseStatus: () => void;
}): ((isOpen: boolean) => void) => {
  return (isOpen: boolean): void => {
    if (!isOpen) {
      closeHorseStatus();
    }
  };
};

export const useHorseStatusModalService = ({
  horseOptions,
  renderSheets,
}: {
  horseOptions: HorseOptionsRef;
  renderSheets: RenderSheetsRef;
}) => {
  const statusCanvasRef = ref<HTMLCanvasElement | null>(null);
  const activeHorseStatusId = ref<string | null>(null);
  const statusFrameIndex = ref<number>(0);
  const statusFrameTimerId = ref<number | null>(null);
  const statusFrameIntervalMs = 120;

  const activeHorseStatus = computed<HorseOption | null>(() => {
    return resolveActiveHorseStatus({
      horseOptions,
      activeHorseStatusId,
    });
  });

  const openHorseStatus = createOpenHorseStatus({
    activeHorseStatusId,
    statusFrameTimerId,
    statusFrameIndex,
    activeHorseStatus,
    statusCanvasRef,
    renderSheets,
    statusFrameIntervalMs,
  });

  const closeHorseStatus = createCloseHorseStatus({
    activeHorseStatusId,
    statusFrameTimerId,
  });

  const onStatusDialogModelUpdate = createOnStatusDialogModelUpdate({
    closeHorseStatus,
  });

  onBeforeUnmount(() => {
    stopStatusAnimation({ statusFrameTimerId });
  });

  return {
    statusCanvasRef,
    activeHorseStatus,
    openHorseStatus,
    closeHorseStatus,
    onStatusDialogModelUpdate,
  };
};
