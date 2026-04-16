import { watch } from "vue";
import type { Ref } from "vue";
import type { HorseOption } from "@/game/features/race/types/horse-race";

const createDrawIdleFrame = (
  renderSheets: Ref<Record<string, HTMLCanvasElement[]>>,
): ((horse: HorseOption, targetCanvas: HTMLCanvasElement) => void) => {
  return (horse: HorseOption, targetCanvas: HTMLCanvasElement): void => {
    const context = targetCanvas.getContext("2d");
    const idleFrame = renderSheets.value[horse.id]?.[0];

    if (!context || !idleFrame) {
      return;
    }

    targetCanvas.width = idleFrame.width;
    targetCanvas.height = idleFrame.height;
    context.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    context.drawImage(idleFrame, 0, 0);
  };
};

const createBindIdleCanvas = ({
  idleCanvasMap,
  horseOptions,
  drawIdleFrame,
}: {
  idleCanvasMap: Map<string, HTMLCanvasElement>;
  horseOptions: Ref<HorseOption[]>;
  drawIdleFrame: (horse: HorseOption, targetCanvas: HTMLCanvasElement) => void;
}): ((node: Element | null, horseId: string) => void) => {
  return (node: Element | null, horseId: string): void => {
    if (!(node instanceof HTMLCanvasElement)) {
      idleCanvasMap.delete(horseId);
      return;
    }

    idleCanvasMap.set(horseId, node);
    const horse = horseOptions.value.find((entry) => {
      return entry.id === horseId;
    });
    if (horse) {
      drawIdleFrame(horse, node);
    }
  };
};

const syncIdleCanvases = ({
  horses,
  idleCanvasMap,
  drawIdleFrame,
}: {
  horses: HorseOption[];
  idleCanvasMap: Map<string, HTMLCanvasElement>;
  drawIdleFrame: (horse: HorseOption, targetCanvas: HTMLCanvasElement) => void;
}): void => {
  for (const horse of horses) {
    const canvas = idleCanvasMap.get(horse.id);
    if (canvas) {
      drawIdleFrame(horse, canvas);
    }
  }
};

export const useHorseIdlePreviewsService = ({
  horseOptions,
  renderSheets,
}: {
  horseOptions: Ref<HorseOption[]>;
  renderSheets: Ref<Record<string, HTMLCanvasElement[]>>;
}) => {
  const idleCanvasMap = new Map<string, HTMLCanvasElement>();
  const drawIdleFrame = createDrawIdleFrame(renderSheets);
  const bindIdleCanvas = createBindIdleCanvas({
    idleCanvasMap,
    horseOptions,
    drawIdleFrame,
  });

  watch(
    horseOptions,
    (horses) => {
      syncIdleCanvases({
        horses,
        idleCanvasMap,
        drawIdleFrame,
      });
    },
    { deep: true },
  );

  return {
    bindIdleCanvas,
  };
};
