import { i18n } from '@/plugins/vueI18n'
import { useLocaleStoreWithOut } from '@/store/modules/locale'
import { setHtmlPageLang } from '@/plugins/vueI18n/helper'
import { loadLocaleMessages } from '@/locales/catalogs'
import { createLocaleSwitcher } from '@/locales/policy'

const changeLocale = createLocaleSwitcher(loadLocaleMessages, (locale, messages) => {
  const globalI18n = i18n.global
  globalI18n.setLocaleMessage(locale, messages)
  if (i18n.mode === 'legacy') globalI18n.locale = locale
  else (globalI18n.locale as any).value = locale
  useLocaleStoreWithOut().setCurrentLocale({ lang: locale })
  setHtmlPageLang(locale)
})

export const useLocale = () => ({ changeLocale })
