import type { AppConfig } from './types/config'

export const appConfig: AppConfig = {
  appName: import.meta.env.VITE_APP_NAME ?? 'Horse Racing',
  assetBasePath: import.meta.env.BASE_URL,
}
