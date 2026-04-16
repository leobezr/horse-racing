import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { gameConfig } from "../../config/game.config";
import {
  loadBetsFromStorage,
  saveBetsToStorage,
} from "../../app/features/profile/infrastructure/local-storage-profile-bets";
import type { BetEntry } from "../../app/features/profile/types/profile-bets";

const createBetId = (): string => {
  return `bet-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
};
const initialCredit = gameConfig.betting.initialCredit;

const calculateFixedPayout = (
  bet: number,
  num: number,
  den: number,
): number => {
  const totalPayout = bet * (num / den + 1);
  return Number.parseFloat(totalPayout.toFixed(2));
};

const createProfileBetsGetters = ({
  bets,
  reservedCredit,
}: {
  bets: { value: BetEntry[] };
  reservedCredit: { value: number };
}) => {
  const orderedBets = createOrderedBets(bets);
  const totalStake = createTotalStake(bets);
  const totalPayout = createTotalPayout(bets);
  const availableCredit = createAvailableCredit({
    totalStake,
    totalPayout,
    reservedCredit,
  });

  return {
    orderedBets,
    totalStake,
    totalPayout,
    availableCredit,
  };
};

const createOrderedBets = (bets: { value: BetEntry[] }) => {
  return computed(() => {
    return [...bets.value].sort((left, right) => {
      return right.createdAtIso.localeCompare(left.createdAtIso);
    });
  });
};

const createTotalStake = (bets: { value: BetEntry[] }) => {
  return computed(() => {
    return bets.value.reduce((sum, bet) => {
      return sum + bet.amount;
    }, 0);
  });
};

const createTotalPayout = (bets: { value: BetEntry[] }) => {
  return computed(() => {
    return bets.value.reduce((sum, bet) => {
      return sum + bet.payout;
    }, 0);
  });
};

const createAvailableCredit = ({
  totalStake,
  totalPayout,
  reservedCredit,
}: {
  totalStake: { value: number };
  totalPayout: { value: number };
  reservedCredit: { value: number };
}) => {
  return computed(() => {
    return (
      initialCredit +
      totalPayout.value -
      totalStake.value -
      reservedCredit.value
    );
  });
};

const createResolvedBetEntry = (payload: {
  raceId: string;
  horseId: string;
  amount: number;
  oddsNumerator: number;
  oddsDenominator: number;
  oddsLabel: string;
  winnerHorseId: string | null;
}): BetEntry => {
  const won =
    payload.winnerHorseId !== null && payload.horseId === payload.winnerHorseId;
  let payout = 0;

  if (won) {
    payout = calculateFixedPayout(
      payload.amount,
      payload.oddsNumerator,
      payload.oddsDenominator,
    );
  }

  return {
    id: createBetId(),
    raceId: payload.raceId,
    horseId: payload.horseId,
    amount: payload.amount,
    oddsNumerator: payload.oddsNumerator,
    oddsDenominator: payload.oddsDenominator,
    oddsLabel: payload.oddsLabel,
    winnerHorseId: payload.winnerHorseId,
    won,
    payout,
    createdAtIso: new Date().toISOString(),
  };
};

const persistBetEntry = ({
  bets,
  nextEntry,
}: {
  bets: { value: BetEntry[] };
  nextEntry: BetEntry;
}): void => {
  bets.value = [nextEntry, ...bets.value].slice(0, 500);
  saveBetsToStorage(bets.value);
};

const createAddResolvedBet = ({
  bets,
  canPlaceBetAmount,
}: {
  bets: { value: BetEntry[] };
  canPlaceBetAmount: (amount: number) => boolean;
}) => {
  return (payload: {
    raceId: string;
    horseId: string;
    amount: number;
    oddsNumerator: number;
    oddsDenominator: number;
    oddsLabel: string;
    winnerHorseId: string | null;
  }): boolean => {
    if (!canPlaceBetAmount(payload.amount)) {
      return false;
    }

    const nextEntry = createResolvedBetEntry(payload);
    persistBetEntry({
      bets,
      nextEntry,
    });

    return true;
  };
};

const createReserveBetAmount = ({
  reservedCredit,
  canReserveAmount,
}: {
  reservedCredit: { value: number };
  canReserveAmount: (amount: number) => boolean;
}) => {
  return (amount: number): boolean => {
    if (!canReserveAmount(amount)) {
      return false;
    }

    reservedCredit.value += amount;
    return true;
  };
};

const createReleaseReservedBetAmount = ({
  reservedCredit,
}: {
  reservedCredit: { value: number };
}) => {
  return (amount: number): void => {
    if (amount <= 0) {
      return;
    }

    reservedCredit.value = Math.max(0, reservedCredit.value - amount);
  };
};

const createCanPlaceBetAmount = ({
  availableCredit,
}: {
  availableCredit: { value: number };
}) => {
  return (amount: number): boolean => {
    return amount > 0 && amount <= availableCredit.value;
  };
};

export const useProfileBetsStore = defineStore("profile-bets", () => {
  return createProfileBetsStoreState()
});

const createProfileBetsStoreState = () => {
  const bets = ref<BetEntry[]>(loadBetsFromStorage());
  const reservedCredit = ref<number>(0);
  const storeViewModel = createProfileBetsStoreViewModel({
    bets,
    reservedCredit,
  });

  return createProfileBetsStoreReturnValue({ bets, storeViewModel });
}

const createProfileBetsStoreReturnValue = ({
  bets,
  storeViewModel,
}: {
  bets: { value: BetEntry[] }
  storeViewModel: {
    orderedBets: { value: BetEntry[] }
    totalStake: { value: number }
    totalPayout: { value: number }
    availableCredit: { value: number }
    canPlaceBetAmount: (amount: number) => boolean
    reserveBetAmount: (amount: number) => boolean
    releaseReservedBetAmount: (amount: number) => void
    addResolvedBet: (payload: {
      raceId: string
      horseId: string
      amount: number
      oddsNumerator: number
      oddsDenominator: number
      oddsLabel: string
      winnerHorseId: string | null
    }) => boolean
  }
}) => {
  return {
    bets,
    ...storeViewModel,
  }
}

const createProfileBetsStoreViewModel = ({
  bets,
  reservedCredit,
}: {
  bets: { value: BetEntry[] };
  reservedCredit: { value: number };
}) => {
  const { orderedBets, totalStake, totalPayout, availableCredit } =
    createProfileBetsGetters({
      bets,
      reservedCredit,
    });
  const canPlaceBetAmount = createCanPlaceBetAmount({
    availableCredit,
  });
  const actions = createProfileBetsStoreActions({
    reservedCredit,
    bets,
    canPlaceBetAmount,
  });

  return {
    orderedBets,
    totalStake,
    totalPayout,
    availableCredit,
    canPlaceBetAmount,
    ...actions,
  };
};

const createProfileBetsStoreActions = ({
  reservedCredit,
  bets,
  canPlaceBetAmount,
}: {
  reservedCredit: { value: number };
  bets: { value: BetEntry[] };
  canPlaceBetAmount: (amount: number) => boolean;
}) => {
  const canReserveAmount = createCanReserveAmount();
  const reserveBetAmount = createReserveBetAmount({
    reservedCredit,
    canReserveAmount: (amount) => {
      return canReserveAmount({ amount, canPlaceBetAmount });
    },
  });
  const releaseReservedBetAmount = createReleaseReservedBetAmount({
    reservedCredit,
  });
  const addResolvedBet = createAddResolvedBet({
    bets,
    canPlaceBetAmount,
  });

  return {
    reserveBetAmount,
    releaseReservedBetAmount,
    addResolvedBet,
  };
};

const createCanReserveAmount = (): ((params: {
  amount: number;
  canPlaceBetAmount: (amount: number) => boolean;
}) => boolean) => {
  return ({ amount, canPlaceBetAmount }): boolean => {
    return canPlaceBetAmount(amount);
  };
};
