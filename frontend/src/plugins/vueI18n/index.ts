import type { App } from 'vue'
import { createI18n } from 'vue-i18n'
import { useLocaleStoreWithOut } from '@/store/modules/locale'
import type { I18n, I18nOptions } from 'vue-i18n'
import { setHtmlPageLang } from './helper'
import {
  arabicPluralRule,
  fallbackLocale,
  supportedLocales,
  loadPreferredLocale
} from '@/locales/policy'
import { loadLocaleMessages } from '@/locales/catalogs'
import { CACHE_KEY, useCache } from '@/hooks/web/useCache'

export let i18n: ReturnType<typeof createI18n>

const createI18nOptions = async (): Promise<I18nOptions> => {
  const localeStore = useLocaleStoreWithOut()
  const { wsCache } = useCache()
  setHtmlPageLang(localeStore.getCurrentLocale.lang)
  const fallbackLoading = loadLocaleMessages(fallbackLocale)
  const {
    locale,
    messages: [message, fallback]
  } = await loadPreferredLocale(
    () => wsCache.get(CACHE_KEY.LANG),
    (selected) => Promise.all([loadLocaleMessages(selected), fallbackLoading])
  )

  localeStore.setCurrentLocale({ lang: locale }, false)
  setHtmlPageLang(locale)

  return {
    legacy: false,
    locale,
    fallbackLocale,
    pluralRules: { ar: arabicPluralRule },
    messages: {
      [fallbackLocale]: fallback,
      [locale]: message
    },
    availableLocales: [...supportedLocales],
    sync: true,
    silentTranslationWarn: true,
    missingWarn: false,
    silentFallbackWarn: true
  }
}

export const setupI18n = async (app: App<Element>) => {
  const options = await createI18nOptions()
  i18n = createI18n(options) as I18n
  app.use(i18n)
}
