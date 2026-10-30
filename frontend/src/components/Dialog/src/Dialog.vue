<script lang="ts" setup>
import { propTypes } from '@/utils/propTypes'
import { isNumber } from '@/utils/is'
import { LocaleDropdown } from '@/layout/components/LocaleDropdown'

defineOptions({ name: 'Dialog' })

const slots = useSlots()
const { t } = useI18n()
const emits = defineEmits(['update:modelValue'])

const props = defineProps({
  modelValue: propTypes.bool.def(false),
  title: propTypes.string.def(''),
  showLocale: propTypes.bool.def(false),
  fullscreen: propTypes.bool.def(true),
  defaultFullscreen: propTypes.bool.def(false),
  width: propTypes.oneOfType([String, Number]).def('40%'),
  scroll: propTypes.bool.def(false), // 是否开启滚动条。如果是的话，按照 maxHeight 设置最大高度
  maxHeight: propTypes.oneOfType([String, Number]).def('400px'),
  loading: propTypes.bool.def(false)
})

const getBindValue = computed(() => {
  const delArr: string[] = [
    'fullscreen',
    'defaultFullscreen',
    'title',
    'maxHeight',
    'appendToBody',
    'loading',
    'showLocale'
  ]
  const attrs = useAttrs()
  const obj = { ...attrs, ...props }
  for (const key in obj) {
    if (delArr.indexOf(key) !== -1) {
      delete obj[key]
    }
  }
  return obj
})

const isFullscreen = ref(props.defaultFullscreen)

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      isFullscreen.value = props.defaultFullscreen
    }
  }
)

const toggleFull = () => {
  isFullscreen.value = !unref(isFullscreen)
}

const dialogHeight = ref(isNumber(props.maxHeight) ? `${props.maxHeight}px` : props.maxHeight)

watch(
  () => isFullscreen.value,
  async (val: boolean) => {
    await nextTick()
    if (val) {
      const windowHeight = document.documentElement.offsetHeight
      dialogHeight.value = `${windowHeight - 55 - 60 - (slots.footer ? 63 : 0)}px`
    } else {
      dialogHeight.value = isNumber(props.maxHeight) ? `${props.maxHeight}px` : props.maxHeight
    }
  },
  {
    immediate: true
  }
)

const dialogStyle = computed(() => {
  return {
    height: unref(dialogHeight)
  }
})

const closing = ref(false)

function closeHandler() {
  emits('update:modelValue', false)
  closing.value = true
}

function closedHandler() {
  closing.value = false
}
</script>

<template>
  <ElDialog
    v-bind="getBindValue"
    :close-on-click-modal="true"
    :fullscreen="isFullscreen"
    :width="width"
    destroy-on-close
    lock-scroll
    draggable
    class="com-dialog"
    :show-close="false"
    @close="closeHandler"
    @closed="closedHandler"
  >
    <template #header="{ close, titleId }">
      <div class="rain-dialog-header">
        <span :id="titleId" class="rain-dialog-title" role="heading" aria-level="2">
          <slot name="title">
            {{ title || t('shell.dialog') }}
          </slot>
        </span>
        <div class="rain-dialog-actions">
          <LocaleDropdown v-if="showLocale" />
          <button
            v-if="fullscreen"
            type="button"
            class="rain-dialog-icon"
            :aria-label="isFullscreen ? t('shell.exitFullscreen') : t('shell.enterFullscreen')"
            :aria-pressed="isFullscreen"
            @click="toggleFull"
          >
            <Icon
              :icon="
                isFullscreen ? 'radix-icons:exit-full-screen' : 'radix-icons:enter-full-screen'
              "
              color="var(--el-text-color-regular)"
              hover-color="var(--el-color-primary)"
            />
          </button>
          <button
            type="button"
            class="rain-dialog-icon"
            :aria-label="t('common.close')"
            @click.stop="close"
          >
            <Icon
              class="is-hover cursor-pointer"
              icon="ep:close"
              hover-color="var(--el-color-primary)"
              color="var(--el-text-color-regular)"
            />
          </button>
        </div>
      </div>
    </template>

    <div v-loading="loading" :style="loading ? { minHeight: '120px' } : undefined">
      <template v-if="!loading">
        <ElScrollbar v-if="scroll" :style="dialogStyle">
          <slot></slot>
        </ElScrollbar>
        <slot v-else></slot>
      </template>
    </div>
    <template v-if="slots.footer" #footer>
      <div :style="{ 'pointer-events': closing ? 'none' : 'auto' }">
        <slot name="footer"></slot>
      </div>
    </template>
  </ElDialog>
</template>

<style lang="scss">
.com-dialog {
  max-inline-size: 100vw;
  &:not(.is-fullscreen) {
    max-inline-size: calc(100vw - 16px);
    @media (max-width: 600px) {
      width: calc(100vw - 16px) !important;
    }
  }
  .rain-dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-block-size: 54px;
    padding-inline: 15px;
  }
  .rain-dialog-title {
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }
  .rain-dialog-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }
  .rain-dialog-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-inline-size: 28px;
    min-block-size: 28px;
    padding: 4px;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }
  .rain-dialog-icon:focus-visible {
    box-shadow: 0 0 0 2px var(--el-text-color-primary);
    border-radius: 2px;
    outline: none;
  }
  .#{$elNamespace}-overlay-dialog {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .#{$elNamespace}-dialog {
    margin: 0 !important;

    &__header {
      min-height: 54px;
      padding: 0;
      margin-inline-end: 0 !important;
      border-bottom: 1px solid var(--el-border-color);
    }

    &__body {
      padding: 15px !important;
    }

    &__footer {
      border-top: 1px solid var(--el-border-color);
    }

    &__headerbtn {
      top: 0;
    }
  }
}
</style>
