import { applyDocumentLocale } from '@/locales/policy'

export const setHtmlPageLang = (locale: LocaleType) => {
  applyDocumentLocale(locale, document.documentElement)
}
