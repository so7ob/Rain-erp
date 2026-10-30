import { i18n } from '@/plugins/vueI18n'
import { useLocaleStoreWithOut } from '@/store/modules/locale'
import { setHtmlPageLang } from '@/plugins/vueI18n/helper'
import { loadLocaleMessages } from '@/locales/catalogs'
import { createLocaleSwitcher } from '@/locales/policy'
import { normalizeLocale } from '@/locales/policy'
import type { Catalog } from '@/locales/catalogs'
import { CACHE_KEY, useCache } from '@/hooks/web/useCache'

const changeLocale = createLocaleSwitcher<Catalog, { persist?: boolean }>(
  loadLocaleMessages,
  (locale, messages, context) => {
    const globalI18n = i18n.global
    globalI18n.setLocaleMessage(locale, messages)
    if (i18n.mode === 'legacy') globalI18n.locale = locale
    else (globalI18n.locale as any).value = locale
    useLocaleStoreWithOut().setCurrentLocale({ lang: locale }, context?.persist !== false)
    setHtmlPageLang(locale)
  }
)

export const setupLocaleSynchronization = () => {
  const { wsCache } = useCache()
  const synchronize = (force = false) => {
    const locale = normalizeLocale(wsCache.get(CACHE_KEY.LANG))
    if (force || locale !== useLocaleStoreWithOut().getCurrentLocale.lang) {
      void changeLocale(locale, { persist: false }).catch(() => {
        // Keep the existing document/composer/request/cache language together if a bundle fails.
        ElMessage.error(useI18n().t('sys.api.apiRequestFailed'))
      })
    }
  }
  const listener = (event: StorageEvent) => {
    if (
      event.storageArea === window.localStorage &&
      (event.key === CACHE_KEY.LANG || event.key === null)
    )
      synchronize(true)
  }
  window.addEventListener('storage', listener)
  synchronize()
  return () => window.removeEventListener('storage', listener)
}

export const useLocale = () => ({ changeLocale })
