import { useCssVar } from '@vueuse/core'
import { watch } from 'vue'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { createNavigationProgress } from './navigationProgress'
import { useI18n } from '@/hooks/web/useI18n'

const primaryColor = useCssVar('--el-color-primary', document.documentElement)
const navigationProgress = createNavigationProgress(NProgress, document)
let watchInstalled = false

export const useNProgress = () => {
  const initColor = async () => {
    await nextTick()
    const bar = document.getElementById('nprogress')?.getElementsByClassName('bar')[0] as ElRef
    if (bar) {
      bar.style.background = unref(primaryColor.value) || ''
    }
  }

  initColor()

  const start = () => {
    const loadingLabel = () => useI18n().t('common.navigationLoading')
    navigationProgress.start(loadingLabel())
    if (!watchInstalled) {
      // The first route starts after i18n setup; installing earlier would observe no composer.
      watch(loadingLabel, navigationProgress.updateLabel, { flush: 'sync' })
      watchInstalled = true
    }
    initColor()
  }

  const done = () => {
    navigationProgress.done()
  }

  return {
    start,
    done
  }
}
