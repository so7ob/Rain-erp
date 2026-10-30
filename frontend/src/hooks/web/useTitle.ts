import { watch, ref, toValue } from 'vue'
import type { WatchStopHandle, MaybeRefOrGetter } from 'vue'
import type { RouteMeta } from 'vue-router'
import { getRouteTitle } from '@/hooks/web/useRouteTitle'
import { isString } from '@/utils/is'
import { useAppStoreWithOut } from '@/store/modules/app'

const appStore = useAppStoreWithOut()
let stopLocaleWatch: WatchStopHandle | undefined
let stopDocumentWatch: WatchStopHandle | undefined

export const useTitle = (newTitle?: MaybeRefOrGetter<string | RouteMeta | undefined>) => {
  stopLocaleWatch?.()
  stopDocumentWatch?.()
  const { t } = useI18n()
  const renderTitle = () => {
    const value = toValue(newTitle)
    const title = typeof value === 'string' ? t(value) : getRouteTitle(value)
    return title ? `${appStore.getTitle} - ${title}` : appStore.getTitle
  }
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
