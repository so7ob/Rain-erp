<script lang="ts" setup>
import { useAppStore } from '@/store/modules/app'
import { propTypes } from '@/utils/propTypes'
import { useDesign } from '@/hooks/web/useDesign'

defineOptions({ name: 'Collapse' })

const { getPrefixCls } = useDesign()

const prefixCls = getPrefixCls('collapse')

defineProps({
  color: propTypes.string.def('')
})

const appStore = useAppStore()
const { t } = useI18n()

const collapse = computed(() => appStore.getCollapse)

const toggleCollapse = () => {
  const collapsed = unref(collapse)
  appStore.setCollapse(!collapsed)
}
</script>

<template>
  <button
    type="button"
    :class="prefixCls"
    class="inline-flex items-center justify-center border-0 bg-transparent p-8px text-inherit"
    :aria-label="collapse ? t('shell.expandNavigation') : t('shell.collapseNavigation')"
    :aria-expanded="!collapse"
    @click="toggleCollapse"
  >
    <Icon
      :color="color"
      :icon="collapse ? 'ep:expand' : 'ep:fold'"
      :size="18"
      class="cursor-pointer"
    />
  </button>
</template>
