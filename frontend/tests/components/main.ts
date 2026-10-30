import '@/plugins/unocss'
import '@/styles/index.scss'
import { createApp } from 'vue'
import { setupI18n } from '@/plugins/vueI18n'
import { setupStore } from '@/store'
import { setupElementPlus } from '@/plugins/elementPlus'
import { setupGlobCom } from '@/components'
import { setupLocaleSynchronization } from '@/hooks/web/useLocale'
import Harness from './Harness.vue'

const app = createApp(Harness)
await setupI18n(app)
app.onUnmount(setupLocaleSynchronization())
setupStore(app)
setupElementPlus(app)
setupGlobCom(app)
app.mount('#fixture')
