import type { SupportedLocale } from './policy'

export type Catalog = { [key: string]: string | Catalog }

const modules = import.meta.glob<Catalog>('./*/**/*.json', { import: 'default' })
const cache = new Map<SupportedLocale, Promise<Catalog>>()

const merge = (target: Catalog, source: Catalog, prefix = '') => {
  for (const [key, value] of Object.entries(source)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (['__proto__', 'prototype', 'constructor'].includes(key)) {
      throw new Error(`Unsafe translation key: ${path}`)
    }
    const existing = target[key]
    if (existing === undefined) {
      if (typeof value === 'string') target[key] = value
      else {
        const branch: Catalog = {}
        merge(branch, value, path)
        target[key] = branch
      }
    } else if (typeof existing === 'object' && typeof value === 'object') {
      merge(existing, value, path)
    } else {
      throw new Error(`Duplicate translation key: ${path}`)
    }
  }
}

export const loadLocaleMessages = (locale: SupportedLocale): Promise<Catalog> => {
  const cached = cache.get(locale)
  if (cached) return cached
  const loading = (async () => {
    const loaders = Object.entries(modules).filter(([path]) => path.startsWith(`./${locale}/`))
    if (!loaders.length) throw new Error(`Missing translation catalog: ${locale}`)
    const catalogs = await Promise.all(loaders.map(([, load]) => load()))
    const messages: Catalog = {}
    for (const catalog of catalogs) merge(messages, catalog)
    return messages
  })()
  cache.set(locale, loading)
  loading.catch(() => {
    if (cache.get(locale) === loading) cache.delete(locale)
  })
  return loading
}
