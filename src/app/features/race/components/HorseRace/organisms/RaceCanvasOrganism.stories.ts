import type { Meta, StoryObj } from "@storybook/vue3";
import { gameConfig } from "@/config/game.config";
import {
  createFrameVisibleBoundsReader,
  getFallbackFrameVisibleBounds,
} from "@/game/features/race/presentation/lib/frame-visible-bounds-cache";
import { createTrackCanvasRenderer } from "@/game/features/race/presentation/lib/track-canvas-renderer";
import RaceCanvasOrganism from "./RaceCanvasOrganism.vue";

const createCanvasBinder = (): ((element: Element | null) => void) => {
  const { getFrameVisibleBounds } = createFrameVisibleBoundsReader();
  const { renderEmptyTrack } = createTrackCanvasRenderer({
    getFrameVisibleBounds,
    getFallbackFrameVisibleBounds,
  });

  return (element: Element | null): void => {
    if (!(element instanceof HTMLCanvasElement)) {
      return;
    }

    renderEmptyTrack(element);
  };
};

const meta = {
  title: "Race/Organisms/RaceCanvasOrganism",
  component: RaceCanvasOrganism,
  tags: ["autodocs"],
  args: {
    showPreRaceCountdown: true,
    preRaceCountdownValue: 3,
    preRaceCountdownLabel: "Round 1 begins...",
    trackWidth: gameConfig.track.width,
    trackHeight: gameConfig.track.height,
  },
  decorators: [
    (story) => {
      return {
        components: { story },
        template:
          '<v-app><v-main><div class="game" style="padding:24px;"><story /></div></v-main></v-app>',
      };
    },
  ],
} satisfies Meta<typeof RaceCanvasOrganism>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CountdownOverlay: Story = {
  render: (args) => {
    return {
      components: { RaceCanvasOrganism },
      setup() {
        return {
          ...args,
          onBindCanvas: createCanvasBinder(),
        };
      },
      template:
        '<RaceCanvasOrganism :show-pre-race-countdown="showPreRaceCountdown" :pre-race-countdown-value="preRaceCountdownValue" :pre-race-countdown-label="preRaceCountdownLabel" :track-width="trackWidth" :track-height="trackHeight" :on-bind-canvas="onBindCanvas" />',
    };
  },
};

export const TrackOnly: Story = {
  args: {
    showPreRaceCountdown: false,
  },
  render: CountdownOverlay.render,
};
