<!-- 列表选择通用组件，参考 ProductList 组件使用 -->
<!-- TODO 芋艿：可能会移除 -->
<template>
  <Dialog
    class="rain-table-select"
    v-model="dialogVisible"
    :appendToBody="true"
    :scroll="true"
    :title="title || t('shell.selectRows')"
    width="60%"
    show-locale
  >
    <el-table
      ref="multipleTableRef"
      v-loading="loading"
      :data="list"
      :show-overflow-tooltip="true"
      :stripe="true"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <slot></slot>
    </el-table>
    <!-- 分页 -->
    <Pagination
      v-model:limit="queryParams.pageSize"
      v-model:page="queryParams.pageNo"
      :total="total"
      @pagination="getList"
    />
    <template #footer>
      <el-button :disabled="formLoading" type="primary" @click="submitForm">{{
        t('common.ok')
      }}</el-button>
      <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
    </template>
  </Dialog>
</template>

<script lang="ts" setup>
import { ElTable } from 'element-plus'
import { getAuthenticationCacheScope } from '@/hooks/web/cacheContext'
const { t } = useI18n()

defineOptions({ name: 'TableSelectForm' })
withDefaults(
  defineProps<{
    modelValue?: any[]
    title?: string
  }>(),
  { modelValue: () => [], title: undefined }
)
const list = ref([]) // 列表的数据
const total = ref(0) // 列表的总页数
const loading = ref(false) // 列表的加载中
const dialogVisible = ref(false) // 弹窗的是否展示
const formLoading = ref(false)
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10
})
// 确认选择时的触发事件
const emits = defineEmits<{
  (e: 'update:modelValue', v: number[]): void
}>()
const multipleTableRef = ref<InstanceType<typeof ElTable>>()
const multipleSelection = ref<any[]>([])
const handleSelectionChange = (val: any[]) => {
  multipleSelection.value = val
}
/** 触发 */
const submitForm = () => {
  formLoading.value = true
  try {
    emits('update:modelValue', multipleSelection.value) // 返回选择的原始数据由使用方处理
  } finally {
    formLoading.value = false
    // 关闭弹窗
    dialogVisible.value = false
  }
}

let getListFunc: Function | undefined
let latestRequest = 0
watch(getAuthenticationCacheScope, () => {
  latestRequest++
  list.value = []
  total.value = 0
  multipleSelection.value = []
  loading.value = false
  dialogVisible.value = false
})
const getList = async () => {
  if (!getListFunc) return
  const request = ++latestRequest
  const context = getAuthenticationCacheScope()
  loading.value = true
  try {
    const data = await getListFunc(queryParams)
    if (request !== latestRequest || context !== getAuthenticationCacheScope()) return
    list.value = data.list
    total.value = data.total
  } finally {
    if (request === latestRequest) loading.value = false
  }
}

/** 打开弹窗 */
const open = async (loader: Function) => {
  getListFunc = loader
  dialogVisible.value = true
  await nextTick()
  if (multipleSelection.value.length > 0) {
    multipleTableRef.value!.clearSelection()
  }
  await getList()
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗
</script>
