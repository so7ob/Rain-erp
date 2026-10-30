import defaults from './defaults/core.json' with { type: 'json' }

export type DisplayTranslator = (key: string, parameters?: Record<string, string>) => string
export interface MenuDisplaySource {
  id?: number | string
  name: string
  path?: string
  component?: string | null
}
export interface DictionaryDisplaySource {
  dictType: string
  value: string | number | boolean
  label: string
}

const menus = new Map(defaults.menus.map((entry) => [String(entry.id), entry]))
const dictionaries = new Map(
  defaults.dictionaries.map((entry) => [JSON.stringify([entry.dictType, entry.value]), entry])
)

// Only a known identity with its original meaning and text receives a default translation.
export function menuDisplayName(source: MenuDisplaySource, translate: DisplayTranslator): string {
  const entry = menus.get(String(source.id))
  return entry &&
    entry.name === source.name &&
    entry.path === (source.path ?? '') &&
    (entry.component ?? '') === (source.component ?? '')
    ? translate(entry.key)
    : source.name
}

export function withMenuDisplay<T extends MenuDisplaySource>(
  source: T,
  translate: DisplayTranslator
) {
  return {
    ...source,
    get displayName() {
      return menuDisplayName(source, translate)
    }
  }
}

export function withDictionaryDisplay<T extends DictionaryDisplaySource>(
  source: T,
  translate: DisplayTranslator
) {
  const entry = dictionaries.get(JSON.stringify([source.dictType, String(source.value)]))
  return {
    ...source,
    get displayLabel() {
      return entry && entry.label === source.label && entry.key
        ? translate(entry.key, entry.parameters as Record<string, string> | undefined)
        : source.label
    }
  }
}

/** Widget value conversion must retain the original record's display identity. */
export function withDictionaryValue<
  T extends DictionaryDisplaySource & { readonly displayLabel?: string },
  Value extends string | number | boolean
>(source: T, value: Value) {
  return {
    ...source,
    value,
    get displayLabel() {
      return source.displayLabel ?? source.label
    }
  }
}

export function routeDisplayTitle(
  meta: { title?: string; menuDisplay?: MenuDisplaySource } | undefined,
  translate: DisplayTranslator
): string {
  // Backend names are data, including customized names that happen to look like message keys.
  if (meta?.menuDisplay) {
    if (meta.title && meta.title !== meta.menuDisplay.name) return meta.title
    return withMenuDisplay(meta.menuDisplay, translate).displayName
  }
  return meta?.title ? translate(meta.title) : ''
}
