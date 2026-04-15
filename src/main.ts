import { createApp } from 'vue'
import { createPinia } from 'pinia'
import AppShell from './app/core/AppShell.vue'
import { appRouter } from './app/routes/router'
import { appVuetify } from './app/core/plugins/vuetify'

const app = createApp(AppShell)

app.use(createPinia())
app.use(appRouter)
app.use(appVuetify)
app.mount('#app')
