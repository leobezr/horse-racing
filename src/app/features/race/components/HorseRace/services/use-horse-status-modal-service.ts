import { computed, nextTick, onBeforeUnmount, ref } from "vue";
import type { Ref } from "vue";
import type { HorseOption } from "@/game/features/race/types/horse-race";

type HorseStatusRef = { value: HorseOption | null };
type CanvasRef = { value: HTMLCanvasElement | null };
type NumberRef = { value: number };
type TimerRef = { value: number | null };
type HorseOptionsRef = Ref<HorseOption[]>;
type RenderSheetsRef = Ref<Record<string, HTMLCanvasElement[]>>;
type HorseStatusState = {
  statusCanvasRef: CanvasRef;
  activeHorseStatusId: { value: string | null };
  statusFrameIndex: NumberRef;
  statusFrameTimerId: TimerRef;
  statusFrameIntervalMs: number;
};
type ResolveStatusDrawDataInput = {
  activeHorseStatus: HorseStatusRef;
  statusCanvasRef: CanvasRef;
  renderSheets: RenderSheetsRef;
  statusFrameIndex: NumberRef;
  frameIndexOverride?: number;
};
type ResolveStatusDrawDataOutput = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  frame: HTMLCanvasElement;
};
type StartStatusAnimationInput = {
  statusFrameTimerId: TimerRef;
  statusFrameIndex: NumberRef;
  activeHorseStatus: HorseStatusRef;
  statusCanvasRef: CanvasRef;
  renderSheets: RenderSheetsRef;
  statusFrameIntervalMs: number;
};

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
  const resolved = resolveStatusDrawData({
    activeHorseStatus,
    statusCanvasRef,
    renderSheets,
    statusFrameIndex,
    frameIndexOverride,
  });
  if (!resolved) {
    return;
  }

  const { canvas, context, frame } = resolved;
  canvas.width = frame.width;
  canvas.height = frame.height;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(frame, 0, 0);
};

const resolveStatusDrawData = ({
  activeHorseStatus,
  statusCanvasRef,
  renderSheets,
  statusFrameIndex,
  frameIndexOverride,
}: ResolveStatusDrawDataInput): ResolveStatusDrawDataOutput | null => {
  const horseCanvasData = resolveHorseCanvasData({
    activeHorseStatus,
    statusCanvasRef,
  });
  return resolveStatusDrawDataFromHorseCanvas({
    horseCanvasData,
    renderSheets,
    statusFrameIndex,
    frameIndexOverride,
  });
};

const resolveStatusDrawDataFromHorseCanvas = ({
  horseCanvasData,
  renderSheets,
  statusFrameIndex,
  frameIndexOverride,
}: {
  horseCanvasData: { horse: HorseOption; canvas: HTMLCanvasElement } | null;
  renderSheets: RenderSheetsRef;
  statusFrameIndex: NumberRef;
  frameIndexOverride?: number;
}): ResolveStatusDrawDataOutput | null => {
  if (!horseCanvasData) {
    return null;
  }

  const { horse, canvas } = horseCanvasData;
  const context = resolveCanvasContext(canvas);
  if (!context) {
    return null;
  }

  const frame = resolveHorseFrame({
    horse,
    renderSheets,
    statusFrameIndex,
    frameIndexOverride,
  });

  if (!frame) {
    return null;
  }

  return { canvas, context, frame };
};

const resolveHorseCanvasData = ({
  activeHorseStatus,
  statusCanvasRef,
}: {
  activeHorseStatus: HorseStatusRef;
  statusCanvasRef: CanvasRef;
}): { horse: HorseOption; canvas: HTMLCanvasElement } | null => {
  const horse = activeHorseStatus.value;
  const canvas = statusCanvasRef.value;
  if (!horse || !canvas) {
    return null;
  }

  return {
    horse,
    canvas,
  };
};

const resolveCanvasContext = (
  canvas: HTMLCanvasElement,
): CanvasRenderingContext2D | null => {
  return canvas.getContext("2d");
};

const resolveHorseFrame = ({
  horse,
  renderSheets,
  statusFrameIndex,
  frameIndexOverride,
}: {
  horse: HorseOption;
  renderSheets: RenderSheetsRef;
  statusFrameIndex: NumberRef;
  frameIndexOverride?: number;
}): HTMLCanvasElement | null => {
  const frameSequence = horse.frameSequence.length > 0 ? horse.frameSequence : [0];
  const frameIndex = frameIndexOverride ?? statusFrameIndex.value;
  const frameId = frameSequence[frameIndex % frameSequence.length];
  return renderSheets.value[horse.id]?.[frameId] ?? null;
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
}: StartStatusAnimationInput): void => {
  resetStatusAnimation({
    statusFrameTimerId,
    statusFrameIndex,
  });
  drawStatusFrameAtStart({
    activeHorseStatus,
    statusCanvasRef,
    renderSheets,
    statusFrameIndex,
  });
  statusFrameTimerId.value = createStatusAnimationTimer({
    statusFrameIndex,
    activeHorseStatus,
    statusCanvasRef,
    renderSheets,
    statusFrameIntervalMs,
  });
};

const resetStatusAnimation = ({
  statusFrameTimerId,
  statusFrameIndex,
}: {
  statusFrameTimerId: TimerRef;
  statusFrameIndex: NumberRef;
}): void => {
  stopStatusAnimation({ statusFrameTimerId });
  statusFrameIndex.value = 0;
};

const drawStatusFrameAtStart = ({
  activeHorseStatus,
  statusCanvasRef,
  renderSheets,
  statusFrameIndex,
}: {
  activeHorseStatus: HorseStatusRef;
  statusCanvasRef: CanvasRef;
  renderSheets: RenderSheetsRef;
  statusFrameIndex: NumberRef;
}): void => {
  drawStatusFrame({
    activeHorseStatus,
    statusCanvasRef,
    renderSheets,
    statusFrameIndex,
    frameIndexOverride: 0,
  });
};

const createStatusAnimationTimer = ({
  statusFrameIndex,
  activeHorseStatus,
  statusCanvasRef,
  renderSheets,
  statusFrameIntervalMs,
}: {
  statusFrameIndex: NumberRef;
  activeHorseStatus: HorseStatusRef;
  statusCanvasRef: CanvasRef;
  renderSheets: RenderSheetsRef;
  statusFrameIntervalMs: number;
}): number => {
  return window.setInterval(() => {
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
  const state = createHorseStatusState();
  const { activeHorseStatus, openHorseStatus, closeHorseStatus, onStatusDialogModelUpdate } =
    createHorseStatusActions({
      state,
      horseOptions,
      renderSheets,
    });

  registerHorseStatusUnmountHook({
    statusFrameTimerId: state.statusFrameTimerId,
  });

  return {
    statusCanvasRef: state.statusCanvasRef,
    activeHorseStatus,
    openHorseStatus,
    closeHorseStatus,
    onStatusDialogModelUpdate,
  };
};

const registerHorseStatusUnmountHook = ({
  statusFrameTimerId,
}: {
  statusFrameTimerId: TimerRef;
}): void => {
  onBeforeUnmount(() => {
    stopStatusAnimation({ statusFrameTimerId });
  });
};

const createHorseStatusActions = ({
  state,
  horseOptions,
  renderSheets,
}: {
  state: HorseStatusState;
  horseOptions: HorseOptionsRef;
  renderSheets: RenderSheetsRef;
}) => {
  const activeHorseStatus = createActiveHorseStatus({
    horseOptions,
    activeHorseStatusId: state.activeHorseStatusId,
  });
  const openHorseStatus = createOpenHorseStatusFromState({
    state,
    activeHorseStatus,
    renderSheets,
  });
  const closeHorseStatus = createCloseHorseStatusFromState(state);

  const onStatusDialogModelUpdate = createOnStatusDialogModelUpdate({
    closeHorseStatus,
  });

  return {
    activeHorseStatus,
    openHorseStatus,
    closeHorseStatus,
    onStatusDialogModelUpdate,
  };
};

const createActiveHorseStatus = ({
  horseOptions,
  activeHorseStatusId,
}: {
  horseOptions: HorseOptionsRef;
  activeHorseStatusId: { value: string | null };
}): HorseStatusRef => {
  return computed<HorseOption | null>(() => {
    return resolveActiveHorseStatus({
      horseOptions,
      activeHorseStatusId,
    });
  });
};

const createOpenHorseStatusFromState = ({
  state,
  activeHorseStatus,
  renderSheets,
}: {
  state: HorseStatusState;
  activeHorseStatus: HorseStatusRef;
  renderSheets: RenderSheetsRef;
}): ((horseId: string) => Promise<void>) => {
  return createOpenHorseStatus({
    activeHorseStatusId: state.activeHorseStatusId,
    statusFrameTimerId: state.statusFrameTimerId,
    statusFrameIndex: state.statusFrameIndex,
    activeHorseStatus,
    statusCanvasRef: state.statusCanvasRef,
    renderSheets,
    statusFrameIntervalMs: state.statusFrameIntervalMs,
  });
};

const createCloseHorseStatusFromState = (
  state: HorseStatusState,
): (() => void) => {
  return createCloseHorseStatus({
    activeHorseStatusId: state.activeHorseStatusId,
    statusFrameTimerId: state.statusFrameTimerId,
  });
};

const createHorseStatusState = (): HorseStatusState => {
  return {
    statusCanvasRef: ref<HTMLCanvasElement | null>(null),
    activeHorseStatusId: ref<string | null>(null),
    statusFrameIndex: ref<number>(0),
    statusFrameTimerId: ref<number | null>(null),
    statusFrameIntervalMs: 120,
  };
};
