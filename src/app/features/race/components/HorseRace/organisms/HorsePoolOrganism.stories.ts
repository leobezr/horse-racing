import { ref } from "vue";
import type { Meta, StoryObj } from "@storybook/vue3";
import HorsePoolOrganism from "./HorsePoolOrganism.vue";
import { createRacePoolPreview } from "@/game/features/race/application/race-session-service";
import { buildHorseRenderSheets, loadHorseFrameAssets } from "@/game/features/race/infrastructure/horse-asset-loader";
import { horseMaskColorTokens } from "@/game/features/race/infrastructure/horse-assets";
import type { HorseOption, HorseRenderSheets } from "@/game/features/race/types/horse-race";

type HorsePoolStoryData = {
  horseOptions: HorseOption[];
  renderSheets: HorseRenderSheets;
};

type HorsePoolControllerArgs = {
  horseNames: string[];
  horseColors: string[];
  saddleColors: string[];
};

const normalizeControllerValues = (values: string[]): string[] => {
  return values.filter((value) => {
    return value.trim().length > 0;
  });
};

const resolveLaneValue = ({
  laneNumber,
  values,
  fallback,
}: {
  laneNumber: number;
  values: string[];
  fallback: string;
}): string => {
  if (values.length === 0) {
    return fallback;
  }

  return values[laneNumber % values.length] ?? fallback;
};

const applyHorseControllerToHorse = ({
  horse,
  normalizedNames,
  normalizedHorseColors,
  normalizedSaddleColors,
}: {
  horse: HorseOption;
  normalizedNames: string[];
  normalizedHorseColors: string[];
  normalizedSaddleColors: string[];
}): HorseOption => {
  const resolvedHorseColor = resolveLaneValue({
    laneNumber: horse.laneNumber,
    values: normalizedHorseColors,
    fallback: horse.colors.primary,
  });
  const resolvedSaddleColor = resolveLaneValue({
    laneNumber: horse.laneNumber,
    values: normalizedSaddleColors,
    fallback: horse.colors.saddle,
  });
  const resolvedName = resolveLaneValue({
    laneNumber: horse.laneNumber,
    values: normalizedNames,
    fallback: horse.name,
  });

  return {
    ...horse,
    name: resolvedName,
    colors: {
      primary: resolvedHorseColor,
      secondary: resolvedHorseColor,
      tertiary: resolvedHorseColor,
      saddle: resolvedSaddleColor,
    },
  };
};

const applyHorseControllers = ({
  horses,
  horseNames,
  horseColors,
  saddleColors,
}: {
  horses: HorseOption[];
  horseNames: string[];
  horseColors: string[];
  saddleColors: string[];
}): HorseOption[] => {
  const normalizedNames = normalizeControllerValues(horseNames);
  const normalizedHorseColors = normalizeControllerValues(horseColors);
  const normalizedSaddleColors = normalizeControllerValues(saddleColors);

  return horses.map((horse) => {
    return applyHorseControllerToHorse({
      horse,
      normalizedNames,
      normalizedHorseColors,
      normalizedSaddleColors,
    });
  });
};

const buildStoryData = async ({
  horseNames,
  horseColors,
  saddleColors,
}: HorsePoolControllerArgs): Promise<HorsePoolStoryData> => {
  const preview = await createRacePoolPreview({ seedInput: "storybook-horse-pool" });
  const horseOptions = applyHorseControllers({
    horses: preview.horses,
    horseNames,
    horseColors,
    saddleColors,
  });
  const loadedFramePairs = await loadHorseFrameAssets();
  const renderSheets = buildHorseRenderSheets({
    horses: horseOptions,
    loadedFramePairs,
    maskSourceColors: horseMaskColorTokens,
  });

  return {
    horseOptions,
    renderSheets,
  };
};

const createIdleCanvasBinder = ({
  horseOptions,
  renderSheets,
}: HorsePoolStoryData): ((node: Element | null, horseId: string) => void) => {
  return (node: Element | null, horseId: string): void => {
    if (!(node instanceof HTMLCanvasElement)) {
      return;
    }

    const horse = horseOptions.find((entry) => {
      return entry.id === horseId;
    });
    const idleFrame = renderSheets[horseId]?.[0];
    const context = node.getContext("2d");
    if (!horse || !idleFrame || !context) {
      return;
    }

    node.width = idleFrame.width;
    node.height = idleFrame.height;
    context.clearRect(0, 0, node.width, node.height);
    context.drawImage(idleFrame, 0, 0);
  };
};

const meta = {
  title: "Race/Organisms/HorsePoolOrganism",
  component: HorsePoolOrganism,
  tags: ["autodocs"],
  args: {
    horseNames: [
      "Crimson Echo",
      "Silver Volt",
      "Golden Arc",
      "Night Comet",
      "Dust Runner",
      "Blue Ember",
      "Storm Piper",
      "Lucky Harbor",
      "Rapid Halo",
      "Velvet Drift",
    ],
    horseColors: ["#cc2f2f", "#2f6fcc", "#c89a2c", "#2c9f70", "#8a3fcc"],
    saddleColors: ["#ffffff", "#101010", "#ffe066", "#89f0ff", "#ffc0cb"],
  },
  argTypes: {
    horseNames: {
      control: { type: "object" },
      description: "Array used to rotate horse names by lane order.",
    },
    horseColors: {
      control: { type: "object" },
      description:
        "Array used to recolor primary/secondary/tertiary mask channels per horse.",
    },
    saddleColors: {
      control: { type: "object" },
      description: "Array used to recolor saddle channel separately from body colors.",
    },
  },
  decorators: [
    (story) => {
      return {
        components: { story },
        template:
          '<v-app><v-main><div class="game" style="padding:24px;max-width:420px;"><story /></div></v-main></v-app>',
      };
    },
  ],
} satisfies Meta<typeof HorsePoolOrganism>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SnapshotReady: Story = {
  loaders: [
    async ({ args }) => {
      return buildStoryData({
        horseNames: (args.horseNames as string[]) ?? [],
        horseColors: (args.horseColors as string[]) ?? [],
        saddleColors: (args.saddleColors as string[]) ?? [],
      });
    },
  ],
  render: (_args, context) => {
    const storyData = context.loaded as HorsePoolStoryData;

    return {
      components: { HorsePoolOrganism },
      setup() {
        const selectedHorseId = ref<string | null>(storyData.horseOptions[0]?.id ?? null);

        return {
          horseOptions: storyData.horseOptions,
          selectedHorseId,
          bindIdleCanvas: createIdleCanvasBinder(storyData),
          onSelectHorse: (horseId: string) => {
            selectedHorseId.value = horseId;
          },
        };
      },
      template:
        '<HorsePoolOrganism :horse-options="horseOptions" :selected-horse-id="selectedHorseId" :bind-idle-canvas="bindIdleCanvas" :on-select-horse="onSelectHorse" />',
    };
  },
};

export const NeonControllers: Story = {
  args: {
    horseNames: [
      "Neon Pulse",
      "Cyber Dash",
      "Arc Flash",
      "Synth Rider",
      "Laser Hoof",
    ],
    horseColors: ["#ff2a6d", "#05d9e8", "#ffb703", "#00f5a0", "#9b5de5"],
    saddleColors: ["#f8f9fa", "#0b132b", "#ff006e", "#8338ec", "#3a86ff"],
  },
  loaders: SnapshotReady.loaders,
  render: SnapshotReady.render,
};
