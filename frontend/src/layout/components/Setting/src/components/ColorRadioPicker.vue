<script lang="ts" setup>
import { PropType } from 'vue'
import { propTypes } from '@/utils/propTypes'
import { useDesign } from '@/hooks/web/useDesign'
import { colorIsDark } from '@/utils/color'

defineOptions({ name: 'ColorRadioPicker' })

const { getPrefixCls } = useDesign()

const prefixCls = getPrefixCls('color-radio-picker')
const { t } = useI18n()

const props = defineProps({
  schema: {
    type: Array as PropType<string[]>,
    default: () => []
  },
  modelValue: propTypes.string.def(''),
  label: propTypes.string.def('')
})

const emit = defineEmits(['update:modelValue', 'change'])

const colorVal = ref(props.modelValue)

watch(
  () => props.modelValue,
  (val: string) => {
    if (val === unref(colorVal)) return
    colorVal.value = val
  }
)

// 监听
watch(
  () => colorVal.value,
  (val: string) => {
    emit('update:modelValue', val)
    emit('change', val)
  }
)
</script>

<template>
  <div :class="prefixCls" class="flex flex-wrap gap-12px" role="group" :aria-label="label">
    <button
      type="button"
      v-for="(item, i) in schema"
      :key="`radio-${i}`"
      :class="{ 'is-active': colorVal === item }"
      :aria-label="t('shell.colorOption', { color: item })"
      :aria-pressed="colorVal === item"
      :style="{
        background: item
      }"
      class="mb-5px h-28px w-28px cursor-pointer border-2px border-gray-300 rounded-2px border-solid p-0 text-center leading-20px"
      @click="colorVal = item"
    >
      <Icon
        v-if="colorVal === item"
        :size="16"
        :color="colorIsDark(item) ? 'var(--el-color-white)' : 'var(--el-color-black)'"
        icon="ep:check"
      />
    </button>
  </div>
</template>

<style lang="scss" scoped>
$prefix-cls: #{$namespace}-color-radio-picker;

.#{$prefix-cls} {
  .is-active {
    border-color: var(--el-color-primary);
  }
}
</style>
