import WebStorageCache from 'web-storage-cache'
import { shallowRef } from 'vue'
import { normalizeLocale } from '@/locales/policy'
import {
  createCacheIdentity,
  authenticationCacheScope,
  displayCacheScope,
  randomCacheIdentity
} from '@/utils/cacheContextPolicy'

const revision = shallowRef(0)
const userId = shallowRef(0)
const effectiveLocale = shallowRef<ReturnType<typeof normalizeLocale>>()
let storage: WebStorageCache | undefined
let continuingAuthentication = false
const raw = () => (storage ??= new WebStorageCache({ storage: 'localStorage' }))
const identity = createCacheIdentity(
  {
    credential: () => raw().get('REFRESH_TOKEN') || raw().get('ACCESS_TOKEN'),
    read: () => raw().get('rain.auth.identity'),
    continuation: () => raw().get('rain.auth.credential-update'),
    write: (value) => raw().set('rain.auth.identity', value)
  },
  () => randomCacheIdentity(crypto)
)

export const cachePrefixes = ['rain.auth.cache.v1:', 'rain.display.cache.v1:']

export const getAuthenticationCacheScope = () => {
  void revision.value
  return authenticationCacheScope(
    identity.current(),
    raw().get('tenantId'),
    raw().get('visitTenantId')
  )
}
export const getCacheLocale = () => {
  void revision.value
  return effectiveLocale.value ?? normalizeLocale(raw().get('lang'))
}
export const setCacheLocale = (locale: unknown) => {
  effectiveLocale.value = normalizeLocale(locale)
}
export const getDisplayCacheScope = () =>
  displayCacheScope(getAuthenticationCacheScope(), userId.value, getCacheLocale())
export const setCacheUserId = (value: number) => {
  userId.value = value
}

export const scopedCacheKey = (key: string) => {
  if (key === 'user' || key === 'roleRouters')
    return cachePrefixes[0] + getAuthenticationCacheScope() + ':' + key
  if (key === 'dictCache') return cachePrefixes[1] + getDisplayCacheScope() + ':' + key
  return key
}

export const notifyCacheMutation = (key: string, before: unknown, after: unknown) => {
  if (before === after) return
  if (
    !continuingAuthentication &&
    (key === 'REFRESH_TOKEN' || (key === 'ACCESS_TOKEN' && !raw().get('REFRESH_TOKEN')))
  )
    identity.rotate()
  if (['REFRESH_TOKEN', 'ACCESS_TOKEN', 'tenantId', 'visitTenantId', 'lang'].includes(key))
    revision.value++
}

/** Only a refresh verified against the current session may replace credentials without starting a new login. */
export const continueAuthenticationContext = (writeCredentials: () => void) => {
  const captured = identity.current()
  raw().set('rain.auth.credential-update', {
    identity: captured,
    nonce: randomCacheIdentity(crypto)
  })
  continuingAuthentication = true
  try {
    writeCredentials()
  } finally {
    continuingAuthentication = false
    revision.value++
  }
}

export const clearContextCaches = () => {
  for (const type of ['localStorage', 'sessionStorage'] as const) {
    const source = window[type]
    for (let index = source.length - 1; index >= 0; index--) {
      const key = source.key(index)
      if (
        key &&
        (cachePrefixes.some((prefix) => key.startsWith(prefix)) ||
          ['user', 'roleRouters', 'dictCache', 'rain.auth.credential-update'].includes(key))
      )
        source.removeItem(key)
    }
  }
  revision.value++
}

export const clearDictionaryCaches = () => {
  for (const type of ['localStorage', 'sessionStorage'] as const) {
    const source = window[type]
    for (let index = source.length - 1; index >= 0; index--) {
      const key = source.key(index)
      if (key?.startsWith(cachePrefixes[1]) || key === 'dictCache') source.removeItem(key)
    }
  }
}

window.addEventListener('storage', (event) => {
  if (
    event.storageArea === window.localStorage &&
    (event.key === null ||
      [
        'REFRESH_TOKEN',
        'ACCESS_TOKEN',
        'tenantId',
        'visitTenantId',
        'lang',
        'rain.auth.identity'
      ].includes(event.key))
  )
    revision.value++
})
