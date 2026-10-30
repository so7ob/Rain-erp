import { defineStore } from 'pinia'
import { store } from '../index'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'
import ar from 'element-plus/es/locale/lang/ar'
import { normalizeLocale } from '@/locales/policy'
import { CACHE_KEY, useCache } from '@/hooks/web/useCache'
import { LocaleDropdownType } from '@/types/localeDropdown'
import { setCacheLocale } from '@/hooks/web/cacheContext'

const { wsCache } = useCache()

const elLocaleMap = {
  ar,
  'zh-CN': zhCn,
  en: en
}
interface LocaleState {
  currentLocale: LocaleDropdownType
  localeMap: LocaleDropdownType[]
}

export const useLocaleStore = defineStore('locales', {
  state: (): LocaleState => {
    const lang = normalizeLocale(wsCache.get(CACHE_KEY.LANG))
    return {
      currentLocale: {
        lang,
        elLocale: elLocaleMap[lang]
      },
      // 多语言
      localeMap: [
        {
          lang: 'ar',
          name: 'العربية'
        },
        {
          lang: 'zh-CN',
          name: '简体中文'
        },
        {
          lang: 'en',
          name: 'English'
        }
      ]
    }
  },
  getters: {
    getCurrentLocale(): LocaleDropdownType {
      return this.currentLocale
    },
    getLocaleMap(): LocaleDropdownType[] {
      return this.localeMap
    }
  },
  actions: {
    setCurrentLocale(localeMap: LocaleDropdownType, persist = true) {
      const lang = normalizeLocale(localeMap?.lang)
      this.currentLocale = { lang, elLocale: elLocaleMap[lang] }
      setCacheLocale(lang)
      if (persist) wsCache.set(CACHE_KEY.LANG, lang)
    }
  }
})

export const useLocaleStoreWithOut = () => {
  return useLocaleStore(store)
}
