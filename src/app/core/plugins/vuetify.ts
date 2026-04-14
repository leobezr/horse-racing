import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { colorTokens } from '../../../shared/theme/color-tokens'

export const appVuetify = createVuetify({
  theme: {
    defaultTheme: 'horseRacingDark',
    themes: {
      horseRacingDark: {
        dark: true,
        colors: {
          background: colorTokens.app.background,
          surface: colorTokens.app.surface,
          'surface-bright': colorTokens.app.surfaceBright,
          'surface-variant': colorTokens.app.surfaceVariant,
          primary: colorTokens.brand.primary,
          'on-primary': '#ffffff',
          secondary: colorTokens.brand.secondary,
          'on-secondary': '#f3f3f3',
          accent: colorTokens.brand.accent,
          error: '#ff0000',
          warning: '#ffc815',
          info: '#ff38ff',
          success: '#40ff3a',
          'on-surface': '#f3f3f3',
          'on-background': colorTokens.app.text,
        },
      },
    },
  },
})
