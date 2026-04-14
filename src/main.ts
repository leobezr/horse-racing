import { createApp } from 'vue'
import { createPinia } from 'pinia'
import AppShell from './app/core/AppShell.vue'
import { appRouter } from './app/core/router'

const app = createApp(AppShell)

app.use(createPinia())
app.use(appRouter)
app.mount('#app')
