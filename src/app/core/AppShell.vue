<template>
  <v-app>
    <v-main>
      <v-container class="app" data-test="app-root" fluid>
        <v-sheet class="app__topbar" data-test="app-topbar" rounded="lg" elevation="6">
          <div class="app__brand" data-test="app-brand">
            <h1 class="app__title" data-test="app-title">{{ appTitle }}</h1>
            <p class="app__subtitle" data-test="app-subtitle">Deterministic horse racing with replayable seeds</p>
          </div>

          <nav class="app__nav" data-test="app-nav">
            <v-btn
              class="app__nav-link"
              data-test="app-nav-race-link"
              to="/"
              :data-active="String(activeRouteName === 'race')"
              variant="flat"
              rounded="pill"
            >
              Race
            </v-btn>
            <v-btn
              class="app__nav-link"
              data-test="app-nav-history-link"
              to="/race-history"
              :data-active="String(activeRouteName === 'race-history')"
              variant="flat"
              rounded="pill"
            >
              Race history
            </v-btn>
            <v-btn
              class="app__nav-link"
              data-test="app-nav-profile-link"
              to="/profile"
              :data-active="String(activeRouteName === 'profile')"
              variant="flat"
              rounded="pill"
            >
              Profile
            </v-btn>
          </nav>
        </v-sheet>

        <section class="app__route-container" data-test="app-route-container">
          <RouterView />
        </section>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterView } from 'vue-router'
import { appConfig } from '../../config/app.config'

const route = useRoute()
const appTitle = appConfig.appName
const activeRouteName = computed(() => {return (typeof route.name === 'string' ? route.name : 'race')})
</script>

<style scoped lang="scss" src="./AppShell.scss"></style>
