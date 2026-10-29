import type { App } from 'vue'
import { createI18n } from 'vue-i18n'
import { useLocaleStoreWithOut } from '@/store/modules/locale'
import type { I18n, I18nOptions } from 'vue-i18n'
import { setHtmlPageLang } from './helper'
import { arabicPluralRule, fallbackLocale, supportedLocales } from '@/locales/policy'
import { loadLocaleMessages } from '@/locales/catalogs'

export let i18n: ReturnType<typeof createI18n>

const createI18nOptions = async (): Promise<I18nOptions> => {
  const localeStore = useLocaleStoreWithOut()
  const locale = localeStore.getCurrentLocale
  setHtmlPageLang(locale.lang)
  const [message, fallback] = await Promise.all([
    loadLocaleMessages(locale.lang),
    loadLocaleMessages(fallbackLocale)
  ])

  localeStore.setCurrentLocale({
    lang: locale.lang
    // elLocale: elLocal
  })

  return {
    legacy: false,
    locale: locale.lang,
    fallbackLocale,
    pluralRules: { ar: arabicPluralRule },
    messages: {
      [fallbackLocale]: fallback,
      [locale.lang]: message
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
