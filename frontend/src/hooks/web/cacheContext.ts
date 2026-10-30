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
let storage: WebStorageCache | undefined
const raw = () => (storage ??= new WebStorageCache({ storage: 'localStorage' }))
const identity = createCacheIdentity(
  {
    credential: () => raw().get('REFRESH_TOKEN') || raw().get('ACCESS_TOKEN'),
    read: () => raw().get('rain.auth.identity'),
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
  return normalizeLocale(raw().get('lang'))
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
  if (key === 'REFRESH_TOKEN' || (key === 'ACCESS_TOKEN' && !raw().get('REFRESH_TOKEN')))
    identity.rotate()
  if (['REFRESH_TOKEN', 'ACCESS_TOKEN', 'tenantId', 'visitTenantId', 'lang'].includes(key))
    revision.value++
}

export const clearContextCaches = () => {
  for (const type of ['localStorage', 'sessionStorage'] as const) {
    const source = window[type]
    for (let index = source.length - 1; index >= 0; index--) {
      const key = source.key(index)
      if (
        key &&
        (cachePrefixes.some((prefix) => key.startsWith(prefix)) ||
          ['user', 'roleRouters', 'dictCache'].includes(key))
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
