import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import { initAuth, getAuthToken } from '@/composables/useAuth'
import { loadProfileForUser } from '@/composables/useUserProfile'
import { loadPatterns } from '@/composables/usePatternData'
import { initBoardInventory, initToolInventory } from '@/view/tools/constants'
import dialogDrag from '@/directives/dialogDrag'
import '@/assets/css/list-table.css'
import '@/assets/css/index.css'

async function bootstrap() {
  const user = await initAuth()

  const app = createApp(App)
  app.directive('dialog-drag', dialogDrag)
  app.use(router)
  app.use(ElementPlus, { locale: zhCn })
  app.mount('#app')

  if (getAuthToken() && user) {
    initBoardInventory(user.id)
    initToolInventory(user.id)
    loadProfileForUser(user)
    loadPatterns(true)
  }
}

bootstrap()
