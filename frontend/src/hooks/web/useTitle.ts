import { watch, ref } from 'vue'
import type { WatchStopHandle } from 'vue'
import { isString } from '@/utils/is'
import { useAppStoreWithOut } from '@/store/modules/app'

const appStore = useAppStoreWithOut()
let stopLocaleWatch: WatchStopHandle | undefined
let stopDocumentWatch: WatchStopHandle | undefined

export const useTitle = (newTitle?: string) => {
  stopLocaleWatch?.()
  stopDocumentWatch?.()
  const { t } = useI18n()
  const renderTitle = () => (newTitle ? `${appStore.getTitle} - ${t(newTitle)}` : appStore.getTitle)
  const title = ref(renderTitle())
  stopLocaleWatch = watch(renderTitle, (value) => {
    title.value = value
  })

  stopDocumentWatch = watch(
    title,
    (n, o) => {
      if (isString(n) && n !== o && typeof document !== 'undefined') {
        document.title = n
      }
    },
    { immediate: true }
  )

  return title
}
