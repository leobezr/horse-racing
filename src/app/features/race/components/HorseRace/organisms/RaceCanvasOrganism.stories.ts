import type { Meta, StoryObj } from "@storybook/vue3";
import { gameConfig } from "@/config/game.config";
import RaceCanvasOrganism from "./RaceCanvasOrganism.vue";

const createCanvasBinder = ({
  laneCount,
  trackWidth,
  trackHeight,
}: {
  laneCount: number;
  trackWidth: number;
  trackHeight: number;
}): ((element: Element | null) => void) => {
  return (element: Element | null): void => {
    if (!(element instanceof HTMLCanvasElement)) {
      return;
    }

    const context = element.getContext("2d");
    if (!context) {
      return;
    }

    context.fillStyle = "#0b0f19";
    context.fillRect(0, 0, trackWidth, trackHeight);

    const laneHeight = Math.max(1, Math.floor(trackHeight / laneCount));
    for (let laneIndex = 0; laneIndex < laneCount; laneIndex += 1) {
      const y = laneIndex * laneHeight;
      context.fillStyle = laneIndex % 2 === 0 ? "#253140" : "#1a2431";
      context.fillRect(0, y, trackWidth, laneHeight);
      context.strokeStyle = "#3f5268";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(trackWidth, y);
      context.stroke();
    }

    const finishX = trackWidth - gameConfig.track.finishLineOffset;
    context.fillStyle = "#f0f5ff";
    context.fillRect(finishX, 0, 8, trackHeight);
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
          onBindCanvas: createCanvasBinder({
            laneCount: gameConfig.raceHorseCount,
            trackWidth: args.trackWidth,
            trackHeight: args.trackHeight,
          }),
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
