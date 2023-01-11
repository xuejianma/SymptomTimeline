import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import { loadFonts } from './plugins/webfontloader'
import { createRouter, createWebHistory } from 'vue-router'


const routes = [
  { path: '/', component: App },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})


loadFonts()

createApp(App)
  .use(vuetify)
  .use(router)
  .mount('#app')
