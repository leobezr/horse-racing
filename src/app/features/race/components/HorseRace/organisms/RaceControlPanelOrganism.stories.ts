import { computed, ref } from "vue";
import type { Meta, StoryObj } from "@storybook/vue3";
import { fn } from "@storybook/test";
import RaceControlPanelOrganism from "./RaceControlPanelOrganism.vue";
import { gameConfig } from "@/config/game.config";

const meta = {
  title: "Race/Organisms/RaceControlPanelOrganism",
  component: RaceControlPanelOrganism,
  tags: ["autodocs"],
  args: {
    isLoading: false,
    canStartRace: true,
    availableCredit: 15000,
    chipValues: gameConfig.betting.chipValues,
    defaultStakeAmount: gameConfig.betting.chipValues[2] ?? 0,
    roundsCount: gameConfig.rounds.count,
    secondsPerRound: gameConfig.rounds.secondsPerRound,
    statusMessage: "Ready to start. Click Generate Race Schedule.",
  },
  argTypes: {
    defaultStakeAmount: {
      control: { type: "number" },
      description: "Initial selected chip amount for story state.",
    },
  },
  decorators: [
    (story) => {
      return {
        components: { story },
        template:
          '<v-app><v-main><div class="game" style="padding:24px;max-width:620px;"><story /></div></v-main></v-app>',
      };
    },
  ],
} satisfies Meta<typeof RaceControlPanelOrganism>;

export default meta;

type Story = StoryObj<typeof meta>;

type PanelStoryArgs = {
  isLoading: boolean;
  canStartRace: boolean;
  availableCredit: number;
  chipValues: number[];
  defaultStakeAmount: number;
  roundsCount: number;
  secondsPerRound: number;
  statusMessage: string;
};

const createPanelBindings = (args: PanelStoryArgs) => {
  const stakeAmount = ref<number>(args.defaultStakeAmount);
  const canAffordChip = (chip: number): boolean => {
    return chip <= args.availableCredit;
  };

  return {
    isLoading: computed(() => {
      return args.isLoading;
    }),
    canStartRace: computed(() => {
      return args.canStartRace;
    }),
    availableCredit: computed(() => {
      return args.availableCredit;
    }),
    chipValues: computed(() => {
      return args.chipValues;
    }),
    roundsCount: computed(() => {
      return args.roundsCount;
    }),
    secondsPerRound: computed(() => {
      return args.secondsPerRound;
    }),
    statusMessage: computed(() => {
      return args.statusMessage;
    }),
    stakeAmount,
    canAffordChip,
    onSelectChipAmount: (chip: number) => {
      stakeAmount.value = chip;
    },
    onOpenRaceSetup: fn(),
  };
};

function renderPanelStory(args: PanelStoryArgs) {

  return {
    components: { RaceControlPanelOrganism },
    setup() {
      return createPanelBindings(args);
    },
    template:
      '<RaceControlPanelOrganism :is-loading="isLoading" :can-start-race="canStartRace" :available-credit="availableCredit" :chip-values="chipValues" :stake-amount="stakeAmount" :can-afford-chip="canAffordChip" :on-select-chip-amount="onSelectChipAmount" :on-open-race-setup="onOpenRaceSetup" :rounds-count="roundsCount" :seconds-per-round="secondsPerRound" :status-message="statusMessage" />',
  };
}

export const ChipsInteractive: Story = {
  render: (args) => {
    return renderPanelStory(args as PanelStoryArgs);
  },
};

export const LoadingState: Story = {
  args: {
    isLoading: true,
    statusMessage: "Building race...",
  },
  render: (args) => {
    return renderPanelStory(args as PanelStoryArgs);
  },
};
