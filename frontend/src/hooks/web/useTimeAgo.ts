import { useTimeAgo as useTimeAgoCore } from '@vueuse/core'
import type { UseTimeAgoUnitNamesDefault } from '@vueuse/core'
import { useLocaleStoreWithOut } from '@/store/modules/locale'
import { relativeTimeMessages } from '@/locales/policy'

export const useTimeAgo = (time: Date | number | string) => {
  const localeStore = useLocaleStoreWithOut()
  return useTimeAgoCore<UseTimeAgoUnitNamesDefault>(time, {
    get messages() {
      return relativeTimeMessages(localeStore.getCurrentLocale.lang)
    }
  })
}
