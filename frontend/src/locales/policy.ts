export const supportedLocales = ['ar', 'en', 'zh-CN'] as const
export type SupportedLocale = (typeof supportedLocales)[number]
export const defaultLocale: SupportedLocale = 'ar'
export const fallbackLocale: SupportedLocale = 'en'

export const normalizeLocale = (value: unknown): SupportedLocale => {
  if (typeof value !== 'string') return defaultLocale
  const language = value.trim().toLowerCase()
  if (/^ar(?:-[a-z0-9]+)*$/.test(language)) return 'ar'
  if (/^en(?:-[a-z0-9]+)*$/.test(language)) return 'en'
  if (language === 'zh-cn' || language === 'zh-hans') return 'zh-CN'
  return defaultLocale
}

export const localeDirection = (locale: SupportedLocale) => (locale === 'ar' ? 'rtl' : 'ltr')

// Arabic catalogs use zero | one | two | few | many | other for six-form plurals.
export const arabicPluralRule = (choice: number, choicesLength: number) => {
  const count = Math.abs(choice)
  if (choicesLength !== 6) {
    if (choicesLength === 1) return 0
    if (choicesLength === 2) return count === 1 ? 0 : 1
    return count === 0 ? 0 : count === 1 ? 1 : Math.min(2, choicesLength - 1)
  }
  if (count === 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (Number.isInteger(count) && count % 100 >= 3 && count % 100 <= 10) return 3
  if (Number.isInteger(count) && count % 100 >= 11 && count % 100 <= 99) return 4
  return 5
}

export const applyDocumentLocale = (
  locale: SupportedLocale,
  root: Pick<HTMLElement, 'setAttribute'>
) => {
  root.setAttribute('lang', locale)
  root.setAttribute('dir', localeDirection(locale))
}

// A slower earlier import must never overwrite a more recent language choice.
export const loadPreferredLocale = async <T>(
  read: () => unknown,
  load: (locale: SupportedLocale) => Promise<T>
) => {
  for (;;) {
    const locale = normalizeLocale(read())
    try {
      const messages = await load(locale)
      if (normalizeLocale(read()) === locale) return { locale, messages }
    } catch (error) {
      if (normalizeLocale(read()) === locale) throw error
    }
  }
}

export const createLocaleSwitcher = <T, Context = void>(
  load: (locale: SupportedLocale) => Promise<T>,
  apply: (locale: SupportedLocale, messages: T, context?: Context) => void
) => {
  let latestRequest = 0
  return async (value: unknown, context?: Context) => {
    const locale = normalizeLocale(value)
    const request = ++latestRequest
    const messages = await load(locale)
    if (request === latestRequest) apply(locale, messages, context)
  }
}

export const relativeTimeMessages = (locale: SupportedLocale) => {
  const formatter = new Intl.RelativeTimeFormat(`${locale}-u-nu-latn`, { numeric: 'auto' })
  const unit = (name: Intl.RelativeTimeFormatUnit) => (n: number, past: boolean) =>
    formatter.format(past ? -n : n, name)
  return {
    justNow: formatter.format(0, 'second'),
    invalid: '—',
    past: (value: string) => value,
    future: (value: string) => value,
    second: unit('second'),
    minute: unit('minute'),
    hour: unit('hour'),
    day: unit('day'),
    week: unit('week'),
    month: unit('month'),
    year: unit('year')
  }
}
