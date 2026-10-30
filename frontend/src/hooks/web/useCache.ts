/**
 * 配置浏览器本地存储的方式，可直接存储对象数组。
 */

import WebStorageCache from 'web-storage-cache'
import { scopedCacheKey, notifyCacheMutation, clearContextCaches } from './cacheContext'

type CacheType = 'localStorage' | 'sessionStorage'

export const CACHE_KEY = {
  // 用户相关
  ROLE_ROUTERS: 'roleRouters',
  USER: 'user',
  VisitTenantId: 'visitTenantId',
  // 系统设置
  IS_DARK: 'isDark',
  LANG: 'lang',
  THEME: 'theme',
  LAYOUT: 'layout',
  DICT_CACHE: 'dictCache',
  // 登录表单
  LoginForm: 'loginForm',
  TenantId: 'tenantId'
}

export const useCache = (type: CacheType = 'localStorage') => {
  const source: WebStorageCache = new WebStorageCache({
    storage: type
  })
  const keyed = new Set(['get', 'set', 'delete', 'touch', 'add', 'replace'])
  const contextKeys = new Set([
    'REFRESH_TOKEN',
    'ACCESS_TOKEN',
    'tenantId',
    'visitTenantId',
    'lang'
  ])
  const wsCache = new Proxy(source, {
    get(target, property) {
      const method = target[property as keyof WebStorageCache]
      if (typeof method !== 'function') return method
      if (!keyed.has(String(property))) return method.bind(target)
      return (key: string, ...arguments_: any[]) => {
        const before = contextKeys.has(key) ? target.get(key) : undefined
        const mapped = scopedCacheKey(key)
        if (
          (property === 'set' || property === 'add' || property === 'replace') &&
          (key === CACHE_KEY.USER || key === CACHE_KEY.ROLE_ROUTERS)
        ) {
          arguments_[1] = { exp: 3600, ...arguments_[1] }
        }
        const result = (method as (...values: any[]) => any).call(target, mapped, ...arguments_)
        if (contextKeys.has(key) && property !== 'get' && property !== 'touch')
          notifyCacheMutation(key, before, target.get(key))
        return result
      }
    }
  })

  return {
    wsCache
  }
}

export const deleteUserCache = () => {
  clearContextCaches()
  const { wsCache } = useCache()
  wsCache.delete(CACHE_KEY.USER)
  wsCache.delete(CACHE_KEY.ROLE_ROUTERS)
  wsCache.delete(CACHE_KEY.VisitTenantId)
  // 注意，不要清理 LoginForm 登录表单
}
