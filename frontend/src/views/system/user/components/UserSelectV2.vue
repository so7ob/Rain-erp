<template>
  <div
    v-bind="attrs"
    class="w-full"
    :class="disabled ? 'cursor-not-allowed' : 'cursor-pointer'"
    @click="openDialog"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
    @focusin="focused = true"
    @focusout="focused = false"
  >
    <el-tooltip :disabled="selectedItems.length === 0" placement="top" :show-after="500">
      <template #content>
        <div v-if="selectedItems.length" class="flex flex-wrap gap-10px">
          <div v-for="item in selectedItems" :key="item.id" class="leading-6">
            <div
              >{{ t('system.user.fields.username') }}:
              <bdi dir="auto">{{ item.username }}</bdi></div
            >
            <div
              >{{ t('system.user.fields.nickname') }}:
              <bdi dir="auto">{{ item.nickname }}</bdi></div
            >
            <div
              >{{ t('system.user.fields.department') }}:
              <bdi dir="auto">{{ item.deptName || '-' }}</bdi></div
            >
            <div
              >{{ t('system.user.fields.mobile') }}:
              <bdi dir="ltr">{{ item.mobile || '-' }}</bdi></div
            >
          </div>
        </div>
      </template>
      <el-input
        :model-value="displayLabel"
        :placeholder="effectivePlaceholder"
        :disabled="disabled"
        readonly
        container-role="combobox"
        aria-haspopup="dialog"
        :aria-expanded="dialogOpen"
        :aria-controls="dialogOpen ? dialogId : undefined"
        :aria-label="accessibleLabel"
        :class="disabled ? 'is-select-disabled' : 'is-select-clickable'"
        @keydown.enter.prevent="openDialog"
        @keydown.space.prevent="openDialog"
        @keydown.delete.prevent="clearSelection"
      >
        <template #suffix>
          <button
            v-if="showClear"
            type="button"
            class="rain-user-clear"
            :aria-label="t('system.user.actions.clear')"
            @click.stop="clearSelection"
            ><Icon icon="ep:circle-close" aria-hidden="true"
          /></button>
          <Icon v-else icon="ep:search" aria-hidden="true" />
        </template>
      </el-input>
    </el-tooltip>
  </div>
  <UserSelectDialogV2
    :id="dialogId"
    ref="dialogRef"
    :multiple="multiple"
    :deptId="deptId"
    @selected="handleSelected"
    @opened="dialogOpen = true"
    @closed="dialogOpen = false"
  />
</template>
<script setup lang="ts">
import * as UserApi from '@/api/system/user'
import UserSelectDialogV2 from './UserSelectDialogV2.vue'
import { useUserStoreWithOut } from '@/store/modules/user'
import { useContextTask } from '@/hooks/web/useContextTask'
import { useId } from 'vue'

defineOptions({ name: 'UserSelectV2', inheritAttrs: false })
const attrs = useAttrs()
const dialogId = `rain-user-select-${useId()}`
const props = withDefaults(
  defineProps<{
    modelValue?: number | number[]
    defaultCurrentUser?: boolean
    multiple?: boolean
    disabled?: boolean
    disabledIds?: number[]
    clearable?: boolean
    placeholder?: string
    deptId?: number
  }>(),
  { defaultCurrentUser: false, disabled: false, clearable: true }
)
const emit = defineEmits<{
  'update:modelValue': [value: number | number[] | undefined]
  change: [item: UserApi.UserVO | UserApi.UserVO[] | undefined]
}>()
const { t } = useI18n()
const effectivePlaceholder = computed(() => props.placeholder ?? t('system.user.selectUser'))
const accessibleLabel = computed(() =>
  typeof attrs['aria-label'] === 'string' ? attrs['aria-label'] : effectivePlaceholder.value
)
const selectedItems = ref<UserApi.UserVO[]>([])
const dialogRef = ref<InstanceType<typeof UserSelectDialogV2>>()
const hovering = ref(false)
const focused = ref(false)
const dialogOpen = ref(false)
const hasValue = () =>
  props.modelValue != null &&
  (props.modelValue as unknown) !== '' &&
  (!Array.isArray(props.modelValue) || props.modelValue.length > 0)
const displayLabel = computed(() =>
  selectedItems.value
    .map((item) => item.nickname || item.username)
    .join(t('system.user.listSeparator'))
)
const showClear = computed(
  () => props.clearable && !props.disabled && (hovering.value || focused.value) && hasValue()
)
const clearSelection = () => {
  if (!props.clearable || props.disabled) return
  resolveTask.invalidate()
  selectedItems.value = []
  if (props.multiple) {
    emit('update:modelValue', [])
    emit('change', [])
  } else {
    emit('update:modelValue', undefined)
    emit('change', undefined)
  }
}
const resolveTask = useContextTask(() => {
  selectedItems.value = []
  dialogOpen.value = false
  if (props.multiple) {
    emit('update:modelValue', [])
    emit('change', [])
  } else {
    emit('update:modelValue', undefined)
    emit('change', undefined)
  }
})
const resolveItemById = async (value: number | number[] | undefined) => {
  const current = resolveTask.begin()
  if (value == null) {
    selectedItems.value = []
    return
  }
  const ids = Array.isArray(value) ? [...value] : [value]
  if (
    selectedItems.value.length === ids.length &&
    selectedItems.value.every((item) => ids.includes(item.id))
  )
    return
  try {
    const rows = await UserApi.getUserList(ids)
    if (current()) selectedItems.value = rows
  } catch {
    /* The shared request handler owns error messages. */
  }
}
watch(() => props.modelValue, resolveItemById, { deep: true, immediate: true })
const openDialog = () => {
  if (props.disabled) return
  const value = props.modelValue
  const ids = Array.isArray(value) ? [...value] : value == null ? [] : [value]
  dialogOpen.value = true
  void dialogRef.value?.open(ids, props.disabledIds)
}
const handleSelected = (rows: UserApi.UserVO[]) => {
  if (!rows?.length) return
  resolveTask.invalidate()
  selectedItems.value = rows
  if (props.multiple) {
    emit(
      'update:modelValue',
      rows.map((item) => item.id)
    )
    emit('change', rows)
  } else {
    emit('update:modelValue', rows[0].id)
    emit('change', rows[0])
  }
}
onMounted(() => {
  if (props.defaultCurrentUser && !hasValue()) {
    const id = useUserStoreWithOut().getUser?.id
    if (id) emit('update:modelValue', props.multiple ? [id] : id)
  }
})
</script>
<style lang="scss" scoped>
.is-select-clickable {
  :deep(.el-input__wrapper),
  :deep(.el-input__inner) {
    cursor: pointer;
  }
}
.is-select-disabled {
  :deep(.el-input__wrapper),
  :deep(.el-input__inner) {
    cursor: not-allowed;
  }
}
.rain-user-clear {
  display: inline-flex;
  border: 0;
  padding: 2px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.rain-user-clear:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
</style>
