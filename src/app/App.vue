<template>
  <main class="app" data-test="app-root">
    <header class="app__header" data-test="app-header">
      <h1 class="app__title" data-test="app-title">{{ appTitle }}</h1>
      <p class="app__subtitle" data-test="app-subtitle">
        Choose a horse and run a deterministic race simulation.
      </p>
    </header>

    <HorseRaceCanvas />
  </main>
</template>

<script setup lang="ts">
import { appConfig } from '../config/app.config'
import HorseRaceCanvas from '../game/presentation/HorseRaceCanvas.vue'

const appTitle = appConfig.appName
</script>

<style scoped lang="scss" src="./App.scss"></style>
