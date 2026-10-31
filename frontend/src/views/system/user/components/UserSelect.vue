<!-- 系统用户选择器：纯下拉，前端过滤（支持 nickname），展示部门 -->
<template>
  <el-select
    v-model="selectValue"
    :placeholder="effectivePlaceholder"
    :aria-label="t('system.user.selectUser')"
    :disabled="disabled"
    :clearable="clearable"
    filterable
    :filter-method="handleFilter"
    class="!w-1/1 rain-user-select"
    @change="handleChange"
  >
    <el-option v-for="item in filteredList" :key="item.id" :label="item.nickname" :value="item.id">
      <div class="flex items-center gap-8px">
        <bdi dir="auto">{{ item.nickname }}</bdi>
        <el-tag v-if="item.deptName" size="small" type="info" class="ms-4px">
          <bdi dir="auto">{{ item.deptName }}</bdi>
        </el-tag>
      </div>
    </el-option>
  </el-select>
</template>

<script setup lang="ts">
import * as UserApi from '@/api/system/user'
import { useContextTask } from '@/hooks/web/useContextTask'

defineOptions({ name: 'UserSelect' })

const props = withDefaults(
  defineProps<{
    modelValue?: number
    disabled?: boolean
    clearable?: boolean
    placeholder?: string
  }>(),
  {
    disabled: false,
    clearable: true
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: number | undefined]
  change: [item: UserApi.UserVO | undefined]
}>()

const { t } = useI18n()
const effectivePlaceholder = computed(() => props.placeholder ?? t('system.user.selectUser'))
const allList = ref<UserApi.UserVO[]>([])
const filteredList = ref<UserApi.UserVO[]>([])

const selectValue = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

/** 前端过滤（nickname + deptName） */
const handleFilter = (query: string) => {
  if (!query) {
    filteredList.value = allList.value
    return
  }
  const keyword = query.toLowerCase()
  filteredList.value = allList.value.filter(
    (item) =>
      item.nickname?.toLowerCase().includes(keyword) ||
      (item as any).deptName?.toLowerCase().includes(keyword)
  )
}

/** 选中变化 */
const handleChange = (val: number | undefined) => {
  const item = allList.value.find((o) => o.id === val)
  emit('change', item)
}

/** 加载用户列表 */
const loadTask = useContextTask(() => {
  allList.value = []
  filteredList.value = []
  emit('update:modelValue', undefined)
  emit('change', undefined)
  void loadUsers()
})
const loadUsers = async () => {
  const current = loadTask.begin()
  try {
    const rows = await UserApi.getSimpleUserList()
    if (!current()) return
    allList.value = rows
    filteredList.value = rows
  } catch {
    /* The shared request handler owns the error message. */
  }
}
onMounted(loadUsers)
</script>
