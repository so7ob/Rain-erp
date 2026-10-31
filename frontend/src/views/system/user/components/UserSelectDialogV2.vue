<!--
  系统用户弹窗选择器（V2，支持单选/多选）

  对齐 MdVendorSelectDialog 架构模式 + userSelect 左侧部门树
  搜索字段 & 展示字段：用户名称、用户昵称、部门、手机号码

  Props:
    multiple — true 多选（checkbox），false 单选（radio）；默认 true
    deptId   — 部门 ID
  Events:
    selected(rows: UserVO[]) — 确认选择后触发，单选时数组长度为 1
  Expose:
    open(selectedIds?: number[]) — 打开弹窗，可传入已选 ID 用于预选高亮
-->
<template>
  <Dialog
    :title="effectiveTitle"
    v-model="dialogVisible"
    width="80%"
    class="rain-user-management rain-user-selector"
    align-center
    append-to-body
    show-locale
  >
    <el-row class="rain-user-selector-grid" :gutter="15">
      <!-- 左侧部门树 -->
      <el-col class="rain-user-selector-departments" :span="5" :xs="24">
        <ContentWrap :body-style="{ '--el-card-padding': '0px' }">
          <DeptTreeSelect ref="deptTreeRef" @node-click="handleDeptNodeClick" />
        </ContentWrap>
      </el-col>
      <!-- 右侧：搜索表单 + 用户表格 -->
      <el-col class="rain-user-selector-content" :span="19" :xs="24">
        <ContentWrap>
          <el-form :inline="true" :model="queryParams" label-position="top">
            <el-form-item :label="t('system.user.fields.username')">
              <el-input
                v-model="queryParams.username"
                :placeholder="t('system.user.placeholders.username')"
                clearable
                @keyup.enter="handleQuery"
                class="!w-240px"
              />
            </el-form-item>
            <el-form-item :label="t('system.user.fields.nickname')">
              <el-input
                v-model="queryParams.nickname"
                :placeholder="t('system.user.placeholders.nickname')"
                clearable
                @keyup.enter="handleQuery"
                class="!w-240px"
              />
            </el-form-item>
            <el-form-item :label="t('system.user.fields.mobile')">
              <el-input
                v-model="queryParams.mobile"
                :placeholder="t('system.user.placeholders.mobile')"
                clearable
                @keyup.enter="handleQuery"
                class="!w-240px"
              />
            </el-form-item>
            <el-form-item :label="t('system.user.fields.status')">
              <el-select
                v-model="queryParams.status"
                :placeholder="t('system.user.placeholders.status')"
                clearable
                class="!w-240px"
              >
                <el-option
                  v-for="dict in getIntDictOptions(DICT_TYPE.COMMON_STATUS)"
                  :key="dict.value"
                  :label="dict.displayLabel ?? dict.label"
                  :value="dict.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button @click="handleQuery">
                <Icon icon="ep:search" class="me-5px" /> {{ t('system.user.actions.search') }}
              </el-button>
              <el-button @click="resetQuery">
                <Icon icon="ep:refresh" class="me-5px" /> {{ t('system.user.actions.reset') }}
              </el-button>
            </el-form-item>
          </el-form>
        </ContentWrap>
        <!-- 数据表格：单选 radio / 多选 checkbox 统一在一个 table 内 -->
        <ContentWrap class="!mb-0" :body-style="{ padding: 'var(--content-wrap-padding,10px)' }">
          <el-table
            ref="tableRef"
            height="360"
            v-loading="loading"
            :data="list"
            :stripe="true"
            :show-overflow-tooltip="true"
            row-key="id"
            :highlight-current-row="!multiple"
            @selection-change="handleSelectionChange"
            @row-click="handleRowClick"
            @row-dblclick="handleRowDblClick"
          >
            <!-- 多选：checkbox（reserve-selection 保证跨页勾选不丢失） -->
            <el-table-column
              v-if="multiple"
              type="selection"
              :selectable="selectable"
              :reserve-selection="true"
              width="50"
              align="center"
            />
            <!-- 单选：radio -->
            <el-table-column v-else width="50" align="center">
              <template #default="{ row }">
                <el-radio
                  v-model="selectedRadioId"
                  :value="row.id"
                  class="radio-no-label"
                  :aria-label="t('system.user.selectRow', { name: row.nickname || row.username })"
                  :disabled="row.disabled"
                  @change="handleRadioChange(row)"
                />
              </template>
            </el-table-column>
            <el-table-column
              :label="t('system.user.fields.id')"
              align="center"
              prop="id"
              width="150"
              ><template #default="{ row }"
                ><bdi dir="ltr">{{ row.id }}</bdi></template
              ></el-table-column
            >
            <el-table-column
              :label="t('system.user.fields.username')"
              align="center"
              prop="username"
              width="150"
              ><template #default="{ row }"
                ><bdi dir="auto">{{ row.username }}</bdi></template
              ></el-table-column
            >
            <el-table-column
              :label="t('system.user.fields.nickname')"
              class-name="rain-user-name"
              prop="nickname"
              min-width="150"
              ><template #default="{ row }"
                ><bdi dir="auto">{{ row.nickname }}</bdi></template
              ></el-table-column
            >
            <el-table-column
              :label="t('system.user.fields.department')"
              align="center"
              prop="deptName"
              width="150"
              ><template #default="{ row }"
                ><bdi dir="auto">{{ row.deptName }}</bdi></template
              ></el-table-column
            >
            <el-table-column
              :label="t('system.user.fields.mobile')"
              align="center"
              prop="mobile"
              width="130"
              ><template #default="{ row }"
                ><bdi dir="ltr">{{ row.mobile }}</bdi></template
              ></el-table-column
            >
            <el-table-column
              :label="t('system.user.fields.status')"
              align="center"
              prop="status"
              width="80"
            >
              <template #default="scope">
                <dict-tag :type="DICT_TYPE.COMMON_STATUS" :value="scope.row.status" />
              </template>
            </el-table-column>
            <el-table-column
              :label="t('system.user.fields.createdAt')"
              align="center"
              prop="createTime"
              class-name="rain-user-date"
              :formatter="dateFormatter"
              width="180"
            />
          </el-table>
          <Pagination
            :total="total"
            v-model:page="queryParams.pageNo"
            v-model:limit="queryParams.pageSize"
            @pagination="getList"
          />
        </ContentWrap>
      </el-col>
    </el-row>
    <template #footer>
      <el-button type="primary" @click="confirmSelect">{{ t('common.ok') }}</el-button>
      <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
import { CommonStatusEnum } from '@/utils/constants'
import * as UserApi from '@/api/system/user'
import DeptTreeSelect from '@/views/system/dept/components/DeptTreeSelect.vue'
import { dateFormatter } from '@/utils/formatTime'
import { useContextTask } from '@/hooks/web/useContextTask'
import { useTableCheckboxAccessibility } from '@/hooks/web/useTableCheckboxAccessibility'

defineOptions({ name: 'UserSelectDialogV2' })

type UserSelectRow = UserApi.UserVO & {
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    title?: string
    multiple?: boolean // true 多选（checkbox），false 单选（radio）
    deptId?: number // 部门 ID
  }>(),
  {
    multiple: true
  }
)

const { t } = useI18n()
const effectiveTitle = computed(() => props.title ?? t('system.user.selectTitle'))
const message = useMessage()
const emit = defineEmits<{
  selected: [rows: UserApi.UserVO[], activityId?: any]
}>()

const dialogVisible = ref(false) // 弹窗是否展示
const loading = ref(false) // 列表加载中
const list = ref<UserSelectRow[]>([]) // 用户列表
const total = ref(0) // 总条数
const activityId = ref()

// ==================== 部门树 ====================
const deptTreeRef = ref() // 部门树 Ref

/** 部门节点点击 */
const handleDeptNodeClick = (deptId: number | undefined) => {
  queryParams.deptId = deptId
  handleQuery()
}

// ==================== 选中状态 ====================
const tableRef = ref() // 表格 Ref
useTableCheckboxAccessibility(() => tableRef.value?.$el)
const selectedRows = ref<UserSelectRow[]>([]) // 多选模式：选中行
const selectedRadioId = ref<number>() // 单选模式：选中 ID
const currentRadioRow = ref<UserSelectRow>() // 单选模式：选中行对象
const preSelectedIds = ref<number[]>([]) // 打开弹窗时传入的已选 ID
const preDisabledIds = ref<number[]>([]) // 打开弹窗时传入的禁选 ID

/** 多选：是否可以选中 */
const selectable = (row: UserSelectRow) => {
  return !preDisabledIds.value.includes(row.id)
}

/** 多选：checkbox 变化 */
const handleSelectionChange = (rows: UserSelectRow[]) => {
  if (props.multiple) {
    selectedRows.value = rows
  }
}

/** 单选：radio 变化 */
const handleRadioChange = (row: UserSelectRow) => {
  currentRadioRow.value = row
}

/** 单击行：单选模式下点击整行即选中（降低操作成本），多选不处理（避免和 dblclick 冲突） */
const handleRowClick = (row: UserSelectRow) => {
  if (row.disabled) {
    return
  }
  if (props.multiple) {
    return
  }
  selectedRadioId.value = row.id
  currentRadioRow.value = row
}

/** 双击行：多选模式切换勾选，单选模式直接确认 */
const handleRowDblClick = (row: UserSelectRow) => {
  if (row.disabled) {
    return
  }
  if (props.multiple) {
    tableRef.value?.toggleRowSelection(row)
    return
  }
  selectedRadioId.value = row.id
  currentRadioRow.value = row
  confirmSelect()
}

// ==================== 用户查询 ====================
const queryParams = reactive({
  pageNo: 1, // 页码
  pageSize: 10, // 每页条数
  username: undefined as string | undefined, // 用户名称
  nickname: undefined as string | undefined, // 用户昵称
  mobile: undefined as string | undefined, // 手机号码
  status: CommonStatusEnum.ENABLE as number | undefined, // 状态：默认只查启用
  deptId: undefined as number | undefined // 部门 ID（从左侧树选择）
})

/** 查询用户列表 */
const listTask = useContextTask(() => {
  dialogVisible.value = false
  list.value = []
  total.value = 0
  selectedRows.value = []
  selectedRadioId.value = undefined
  currentRadioRow.value = undefined
  preSelectedIds.value = []
  preDisabledIds.value = []
  loading.value = false
  tableRef.value?.clearSelection()
})
const getList = async () => {
  if (!dialogVisible.value) return
  const current = listTask.begin()
  const query = { ...queryParams }
  const disabledIds = [...preDisabledIds.value]
  loading.value = true
  try {
    const data = await UserApi.getUserPage(query)
    if (!current() || !dialogVisible.value) return
    list.value = data.list.map((row: UserApi.UserVO) => ({
      ...row,
      disabled: disabledIds.includes(row.id)
    }))
    total.value = data.total
    await nextTick()
    if (current() && dialogVisible.value) applyPreSelection()
  } catch {
    /* The shared request handler reports the error. */
  } finally {
    if (current()) loading.value = false
  }
}
watch(dialogVisible, (visible) => {
  if (!visible) {
    listTask.invalidate()
    loading.value = false
  }
})

/** 恢复预选状态（当前页可见范围内） */
const applyPreSelection = () => {
  if (preSelectedIds.value.length === 0) {
    return
  }
  if (props.multiple) {
    const table = tableRef.value
    if (!table) {
      return
    }
    list.value.forEach((row) => {
      if (preSelectedIds.value.includes(row.id)) {
        table.toggleRowSelection(row, true)
      }
    })
  } else {
    const match = list.value.find((row) => preSelectedIds.value.includes(row.id))
    if (match) {
      selectedRadioId.value = match.id
      currentRadioRow.value = match
    }
  }
}

/** 搜索按钮操作 */
const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

/** 重置查询条件 */
const resetQuery = () => {
  queryParams.username = undefined
  queryParams.nickname = undefined
  queryParams.mobile = undefined
  queryParams.status = CommonStatusEnum.ENABLE
  queryParams.deptId = undefined
  // 清空部门树选中
  deptTreeRef.value?.reset()
  handleQuery()
}

/** 确认选择 */
const confirmSelect = () => {
  if (props.multiple) {
    if (selectedRows.value.length === 0) {
      message.warning(t('system.user.chooseAtLeastOne'))
      return
    }
    emit('selected', selectedRows.value, activityId.value)
  } else {
    if (!currentRadioRow.value) {
      message.warning(t('system.user.chooseOne'))
      return
    }
    emit('selected', [currentRadioRow.value], activityId.value)
  }
  dialogVisible.value = false
}

// ==================== 打开弹窗 ====================

/** 打开弹窗，可传入已选 ID 用于预选高亮 */
const open = async (selectedIds?: number[], disabledIds?: number[], _activityId?: any) => {
  listTask.invalidate()
  const current = listTask.capture()
  preDisabledIds.value = disabledIds ?? []
  activityId.value = _activityId
  dialogVisible.value = true
  // 重置查询条件 + 页码，避免二次打开继承上次过滤上下文
  queryParams.username = undefined
  queryParams.nickname = undefined
  queryParams.mobile = undefined
  queryParams.status = CommonStatusEnum.ENABLE
  queryParams.deptId = props.deptId
  queryParams.pageNo = 1
  // 清空上一次的选中状态
  selectedRows.value = []
  selectedRadioId.value = undefined
  currentRadioRow.value = undefined
  preSelectedIds.value = (selectedIds ?? []).filter((id) => !preDisabledIds.value.includes(id))
  // 清空部门树选中 + 多选模式清空跨页缓存的勾选
  await nextTick()
  if (!current() || !dialogVisible.value) return
  deptTreeRef.value?.reset()
  tableRef.value?.clearSelection()
  await getList()
  if (current() && dialogVisible.value && queryParams.deptId) {
    deptTreeRef.value?.setCurrent(queryParams.deptId)
  }
}
defineExpose({ open })
</script>

<style lang="scss" scoped>
/* 隐藏 radio 的 label 文字，只保留圆圈 */
.radio-no-label {
  :deep(.el-radio__label) {
    display: none;
  }
}
</style>
