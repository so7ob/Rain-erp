type Messages = { [key: string]: string | string[] | Messages }

const merge = (source: Messages, overrides: Messages): Messages => {
  const result = { ...source }
  for (const [key, value] of Object.entries(overrides)) {
    const original = source[key]
    result[key] =
      typeof value === 'object' && !Array.isArray(value)
        ? merge(typeof original === 'object' && !Array.isArray(original) ? original : {}, value)
        : value
  }
  return result
}

/** Project-owned additions preserve the installed library and every unmodified locale entry. */
export const adaptElementPlusLocale = <T extends { name: string; el: Messages }>(
  base: T,
  overrides: Messages
): T => ({ ...base, el: merge(base.el, overrides) })
