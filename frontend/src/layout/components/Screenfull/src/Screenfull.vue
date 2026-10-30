<script lang="ts" setup>
import { Icon } from '@/components/Icon'
import { useFullscreen } from '@vueuse/core'
import { propTypes } from '@/utils/propTypes'
import { useDesign } from '@/hooks/web/useDesign'

defineOptions({ name: 'ScreenFull' })

const { getPrefixCls } = useDesign()

const prefixCls = getPrefixCls('screenfull')

defineProps({
  color: propTypes.string.def('')
})

const { toggle, isFullscreen } = useFullscreen()
const { t } = useI18n()

const toggleFullscreen = () => {
  toggle()
}
</script>

<template>
  <button
    type="button"
    :class="prefixCls"
    class="inline-flex items-center justify-center border-0 bg-transparent p-8px text-inherit"
    :aria-label="isFullscreen ? t('shell.exitFullscreen') : t('shell.enterFullscreen')"
    :aria-pressed="isFullscreen"
    @click="toggleFullscreen"
  >
    <Icon
      :color="color"
      :icon="isFullscreen ? 'zmdi:fullscreen-exit' : 'zmdi:fullscreen'"
      :size="18"
    />
  </button>
</template>
