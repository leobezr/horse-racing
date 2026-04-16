import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { fileURLToPath, URL } from 'node:url'

const resolveAppBasePath = (): string | undefined => {
  const rawBasePath = process.env.VITE_BASE_PATH
  if (!rawBasePath) {
    return undefined
  }

  const withLeadingSlash = rawBasePath.startsWith('/') ? rawBasePath : `/${rawBasePath}`
  if (withLeadingSlash.endsWith('/')) {
    return withLeadingSlash
  }

  return `${withLeadingSlash}/`
}

export default defineConfig({
  base: resolveAppBasePath(),
  plugins: [
    vue(),
    vuetify({
      autoImport: true,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
