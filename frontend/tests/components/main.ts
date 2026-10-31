import '@/plugins/unocss'
import '@/styles/index.scss'
import { createApp } from 'vue'
import { setupI18n } from '@/plugins/vueI18n'
import { setupStore } from '@/store'
import { setupElementPlus } from '@/plugins/elementPlus'
import { setupGlobCom } from '@/components'
import { setupLocaleSynchronization } from '@/hooks/web/useLocale'
import Harness from './Harness.vue'

const users = new URL(location.href).searchParams.get('fixture') === 'users'
const root = users ? (await import('./UserManagementFixture.vue')).default : Harness
const app = createApp(root)
await setupI18n(app)
app.onUnmount(setupLocaleSynchronization())
setupStore(app)
setupElementPlus(app)
setupGlobCom(app)
if (users) {
  const { setupAuth } = await import('@/directives')
  setupAuth(app)
  const { useUserStoreWithOut } = await import('@/store/modules/user')
  await useUserStoreWithOut().setUserInfoAction()
}
app.mount('#fixture')
