<template>
  <v-card class="profile" data-test="app-route-profile" variant="outlined">
    <h2 class="profile__title" data-test="app-route-profile-title">Profile</h2>

    <div class="profile__summary" data-test="app-profile-summary">
      <p class="profile__summary-line" data-test="app-profile-total-bets">
        Total bets: {{ orderedBets.length }}
      </p>
      <p class="profile__summary-line" data-test="app-profile-total-stake">
        Total stake: {{ totalStake }}
      </p>
      <p class="profile__summary-line" data-test="app-profile-total-payout">
        Total payout: {{ totalPayout }}
      </p>
    </div>

    <v-list
      class="profile__bets"
      data-test="app-profile-bets-list"
      lines="two"
      bg-color="transparent"
    >
      <v-list-item
        v-for="bet in orderedBets"
        :key="bet.id"
        class="profile__bet"
        data-test="app-profile-bet-item"
      >
        <p class="profile__text" data-test="app-profile-bet-date">
          {{ formatTimestamp(bet.createdAtIso) }}
        </p>
        <p class="profile__text" data-test="app-profile-bet-race">
          Race: {{ bet.raceId }}
        </p>
        <p class="profile__text" data-test="app-profile-bet-pick">
          Horse: {{ bet.horseId }}
        </p>
        <p class="profile__text" data-test="app-profile-bet-amount">
          Amount: {{ bet.amount }}
        </p>
        <p class="profile__text" data-test="app-profile-bet-odds">
          Odds: {{ bet.oddsLabel }}
        </p>
        <p class="profile__text" data-test="app-profile-bet-result">
          Result: {{ bet.won ? "Won" : "Lost" }}
        </p>
        <p class="profile__text" data-test="app-profile-bet-payout">
          Payout: {{ bet.payout }}
        </p>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script setup lang="ts">
import { useProfileBetsStore } from "../../../../game/features/profile/state/profile-bets-store";

const profileBetsStore = useProfileBetsStore();
const orderedBets = profileBetsStore.orderedBets;
const totalStake = profileBetsStore.totalStake;
const totalPayout = profileBetsStore.totalPayout;

const formatTimestamp = (iso: string): string => new Date(iso).toLocaleString();
</script>

<style scoped lang="scss" src="./ProfileRoute.scss"></style>
