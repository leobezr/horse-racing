import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from './types/router'
import ProfileRoute from '../features/profile/routes/ProfileRoute.vue'
import RaceHistoryRoute from '../features/race-history/routes/RaceHistoryRoute.vue'
import RaceRoute from '../features/race/routes/RaceRoute.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'race',
    component: RaceRoute,
  },
  {
    path: '/race-history',
    name: 'race-history',
    component: RaceHistoryRoute,
  },
  {
    path: '/profile',
    name: 'profile',
    component: ProfileRoute,
  },
]

export const appRouter = createRouter({
  history: createWebHistory(),
  routes,
})
