import type { RouteMeta } from 'vue-router'
import { routeDisplayTitle } from '@/locales/display'
import { useI18n } from '@/hooks/web/useI18n'
import { getAuthenticationCacheScope } from '@/hooks/web/cacheContext'

export const getRouteTitle = (meta?: RouteMeta): string => {
  if (meta?.menuContext && meta.menuContext !== getAuthenticationCacheScope()) return ''
  return routeDisplayTitle(meta, useI18n().t)
}
