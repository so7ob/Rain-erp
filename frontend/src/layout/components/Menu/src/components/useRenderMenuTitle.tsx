import type { RouteMeta } from 'vue-router'
import { Icon } from '@/components/Icon'
import { getRouteTitle } from '@/hooks/web/useRouteTitle'
import { useI18n } from '@/hooks/web/useI18n'

export const useRenderMenuTitle = () => {
  const renderMenuTitle = (meta: RouteMeta) => {
    const { icon } = meta
    const title = getRouteTitle(meta) || useI18n().t('core.navigation.untitled')

    return icon ? (
      <>
        <Icon icon={meta.icon}></Icon>
        <span class="v-menu__title overflow-hidden overflow-ellipsis whitespace-nowrap">
          {title}
        </span>
      </>
    ) : (
      <span class="v-menu__title overflow-hidden overflow-ellipsis whitespace-nowrap">
        {title}
      </span>
    )
  }

  return {
    renderMenuTitle
  }
}
