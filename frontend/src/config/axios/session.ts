const silentRefreshKeys = new Set([
  'system.oauth2.refreshToken.invalid',
  'system.oauth2.refreshToken.expired'
])

export const isSilentRefreshError = (messageKey: unknown): boolean =>
  typeof messageKey === 'string' && silentRefreshKeys.has(messageKey)

export const isSessionAuthenticationError = (code: unknown, messageKey: unknown): boolean =>
  code === 401 &&
  (messageKey == null || messageKey === '' || messageKey === 'common.error.unauthorized')

// Waiting requests for the same session share a result or rejection; failed attempts never replay a queue.
export function createSingleRefresh<T, Context = void>(
  refresh: (context: Context) => Promise<T>,
  keyFor: (context: Context) => unknown = () => 'current'
): (context: Context) => Promise<T> {
  const pending = new Map<unknown, Promise<T>>()
  return (context) => {
    const key = keyFor(context)
    if (!pending.has(key)) {
      pending.set(
        key,
        Promise.resolve()
          .then(() => refresh(context))
          .finally(() => {
            pending.delete(key)
          })
      )
    }
    return pending.get(key)!
  }
}
