<template>
  <section class="rain-user-management">
    <doc-alert
      :title="t('system.user.docs.userCenter')"
      url="https://doc.iocoder.cn/user-center/"
    />
    <doc-alert
      :title="t('system.user.docs.socialLogin')"
      url="https://doc.iocoder.cn/social-user/"
    />
    <doc-alert
      :title="t('system.user.docs.excel')"
      url="https://doc.iocoder.cn/excel-import-and-export/"
    />

    <el-row :gutter="20">
      <!-- 左侧部门树 -->
      <el-col :span="4" :xs="24">
        <ContentWrap class="h-1/1">
          <DeptTreeSelect @node-click="handleDeptNodeClick" />
        </ContentWrap>
      </el-col>
      <el-col :span="20" :xs="24">
        <!-- 搜索 -->
        <ContentWrap>
          <el-form
            class="-mb-15px"
            :model="queryParams"
            ref="queryFormRef"
            :inline="true"
            label-position="top"
          >
            <el-form-item :label="t('system.user.fields.username')" prop="username">
              <el-input
                v-model="queryParams.username"
                :placeholder="t('system.user.placeholders.username')"
                clearable
                @keyup.enter="handleQuery"
                class="!w-240px"
              />
            </el-form-item>
            <el-form-item :label="t('system.user.fields.mobile')" prop="mobile">
              <el-input
                v-model="queryParams.mobile"
                :placeholder="t('system.user.placeholders.mobile')"
                clearable
                @keyup.enter="handleQuery"
                class="!w-240px"
              />
            </el-form-item>
            <el-form-item :label="t('system.user.fields.status')" prop="status">
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
            <el-form-item
              :label="t('system.user.fields.createdAt')"
              prop="createTime"
              class-name="rain-user-date"
            >
              <el-date-picker
                v-model="queryParams.createTime"
                value-format="YYYY-MM-DD HH:mm:ss"
                type="datetimerange"
                :start-placeholder="t('system.user.placeholders.startDate')"
                :end-placeholder="t('system.user.placeholders.endDate')"
                class="!w-240px"
              />
            </el-form-item>
            <el-form-item>
              <el-button @click="handleQuery"
                ><Icon icon="ep:search" />{{ t('system.user.actions.search') }}</el-button
              >
              <el-button @click="resetQuery"
                ><Icon icon="ep:refresh" />{{ t('system.user.actions.reset') }}</el-button
              >
              <el-button
                type="primary"
                plain
                @click="openForm('create')"
                v-hasPermi="['system:user:create']"
              >
                <Icon icon="ep:plus" /> {{ t('system.user.actions.create') }}
              </el-button>
              <el-button
                type="warning"
                plain
                @click="handleImport"
                v-hasPermi="['system:user:import']"
              >
                <Icon icon="ep:upload" /> {{ t('system.user.import.action') }}
              </el-button>
              <el-button
                type="success"
                plain
                @click="handleExport"
                :loading="exportLoading"
                v-hasPermi="['system:user:export']"
              >
                <Icon icon="ep:download" />{{ t('system.user.export.action') }}
              </el-button>
              <el-button
                type="danger"
                plain
                :disabled="checkedIds.length === 0"
                @click="handleDeleteBatch"
                v-hasPermi="['system:user:delete']"
              >
                <Icon icon="ep:delete" />{{ t('system.user.actions.batchDelete') }}
              </el-button>
            </el-form-item>
          </el-form>
        </ContentWrap>
        <ContentWrap>
          <el-table v-loading="loading" :data="list" @selection-change="handleRowCheckboxChange">
            <el-table-column type="selection" width="55" />
            <el-table-column :label="t('system.user.fields.id')" align="center" key="id" prop="id"
              ><template #default="{ row }"
                ><bdi dir="ltr">{{ row.id }}</bdi></template
              ></el-table-column
            >
            <el-table-column
              :label="t('system.user.fields.username')"
              align="center"
              prop="username"
              :show-overflow-tooltip="true"
              ><template #default="{ row }"
                ><bdi dir="auto">{{ row.username }}</bdi></template
              ></el-table-column
            >
            <el-table-column
              :label="t('system.user.fields.nickname')"
              align="center"
              prop="nickname"
              :show-overflow-tooltip="true"
              ><template #default="{ row }"
                ><bdi dir="auto">{{ row.nickname }}</bdi></template
              ></el-table-column
            >
            <el-table-column
              :label="t('system.user.fields.department')"
              align="center"
              key="deptName"
              prop="deptName"
              :show-overflow-tooltip="true"
              ><template #default="{ row }"
                ><bdi dir="auto">{{ row.deptName }}</bdi></template
              ></el-table-column
            >
            <el-table-column
              :label="t('system.user.fields.mobile')"
              align="center"
              prop="mobile"
              width="120"
              ><template #default="{ row }"
                ><bdi dir="ltr">{{ row.mobile }}</bdi></template
              ></el-table-column
            >
            <el-table-column :label="t('system.user.fields.status')" key="status">
              <template #default="scope">
                <el-switch
                  v-model="scope.row.status"
                  :active-value="0"
                  :inactive-value="1"
                  @change="handleStatusChange(scope.row)"
                  :disabled="!checkPermi(['system:user:update']) || statusBusy.has(scope.row.id)"
                  :aria-label="t('system.user.statusFor', { name: scope.row.username })"
                />
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
            <el-table-column :label="t('system.user.fields.actions')" align="center" width="160">
              <template #default="scope">
                <div class="flex items-center justify-center">
                  <el-button
                    type="primary"
                    link
                    @click="openForm('update', scope.row.id)"
                    v-hasPermi="['system:user:update']"
                  >
                    <Icon icon="ep:edit" />{{ t('system.user.actions.edit') }}
                  </el-button>
                  <el-dropdown
                    @command="(command) => handleCommand(command, scope.row)"
                    v-hasPermi="[
                      'system:user:delete',
                      'system:user:update-password',
                      'system:permission:assign-user-role'
                    ]"
                  >
                    <el-button
                      type="primary"
                      link
                      :aria-label="t('system.user.moreFor', { name: scope.row.username })"
                      ><Icon icon="ep:d-arrow-right" />
                      {{ t('system.user.actions.more') }}</el-button
                    >
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item
                          command="handleDelete"
                          v-if="checkPermi(['system:user:delete'])"
                        >
                          <Icon icon="ep:delete" />{{ t('system.user.actions.delete') }}
                        </el-dropdown-item>
                        <el-dropdown-item
                          command="handleResetPwd"
                          v-if="checkPermi(['system:user:update-password'])"
                        >
                          <Icon icon="ep:key" />{{ t('system.user.actions.resetPassword') }}
                        </el-dropdown-item>
                        <el-dropdown-item
                          command="handleRole"
                          v-if="checkPermi(['system:permission:assign-user-role'])"
                        >
                          <Icon icon="ep:circle-check" />{{ t('system.user.actions.assignRoles') }}
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </template>
            </el-table-column>
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

    <!-- 添加或修改用户对话框 -->
    <UserActionDialog ref="actionDialog" />
    <UserForm ref="formRef" @success="getList" />
    <!-- 用户导入对话框 -->
    <UserImportForm ref="importFormRef" @success="getList" />
    <!-- 分配角色 -->
    <UserAssignRoleForm ref="assignRoleFormRef" @success="getList" />
  </section>
</template>
<script lang="ts" setup>
import { useContextTask } from '@/hooks/web/useContextTask'
import UserActionDialog from './UserActionDialog.vue'
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
import { checkPermi } from '@/utils/permission'
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import { CommonStatusEnum } from '@/utils/constants'
import * as UserApi from '@/api/system/user'
import UserForm from './UserForm.vue'
import UserImportForm from './UserImportForm.vue'
import UserAssignRoleForm from './UserAssignRoleForm.vue'
import DeptTreeSelect from '@/views/system/dept/components/DeptTreeSelect.vue'

defineOptions({ name: 'SystemUser' })

const message = useMessage() // 消息弹窗
const { t } = useI18n() // 国际化

const loading = ref(true) // 列表的加载中
const total = ref(0) // 列表的总页数
const list = ref<UserApi.UserVO[]>([]) // 列表的数
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  username: undefined,
  mobile: undefined,
  status: undefined,
  deptId: undefined as number | undefined,
  createTime: []
})
const queryFormRef = ref() // 搜索的表单

/** 查询列表 */
const clearContext = () => {
  list.value = []
  total.value = 0
  checkedIds.value = []
  queryParams.username = undefined
  queryParams.mobile = undefined
  queryParams.status = undefined
  queryParams.deptId = undefined
  queryParams.createTime = []
  statusBusy.clear()
  exportLoading.value = false
  loading.value = false
  void getList()
}
const listTask = useContextTask(clearContext)
const actionTask = useContextTask()
const actionDialog = ref<InstanceType<typeof UserActionDialog>>()
const statusBusy = reactive(new Set<number>())
const getList = async () => {
  const current = listTask.begin()
  const query = { ...queryParams, createTime: [...queryParams.createTime] }
  loading.value = true
  try {
    const data = await UserApi.getUserPage(query)
    if (!current()) return
    list.value = data.list
    total.value = data.total
  } catch {
    /* The shared transport reports the localized error. */
  } finally {
    if (current()) loading.value = false
  }
}

/** 搜索按钮操作 */
const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

/** 重置按钮操作 */
const resetQuery = () => {
  queryFormRef.value?.resetFields()
  handleQuery()
}

/** 处理部门被点击 */
const handleDeptNodeClick = async (deptId: number | undefined) => {
  queryParams.deptId = deptId
  await getList()
}

/** 添加/修改操作 */
const formRef = ref()
const openForm = (type: string, id?: number) => {
  formRef.value.open(type, id)
}

/** 用户导入 */
const importFormRef = ref()
const handleImport = () => {
  importFormRef.value.open()
}

/** 修改用户状态 */
const handleStatusChange = async (row: UserApi.UserVO) => {
  const owner = actionTask.context.value
  const current = actionTask.capture()
  const status = row.status
  statusBusy.add(row.id)
  try {
    const accepted = await actionDialog.value?.ask(
      status === CommonStatusEnum.ENABLE ? 'enable' : 'disable',
      row.username
    )
    if (!current()) return
    if (!accepted) {
      row.status =
        status === CommonStatusEnum.ENABLE ? CommonStatusEnum.DISABLE : CommonStatusEnum.ENABLE
      return
    }
    await UserApi.updateUserStatus(row.id, status)
    if (current()) await getList()
  } catch {
    if (current())
      row.status =
        status === CommonStatusEnum.ENABLE ? CommonStatusEnum.DISABLE : CommonStatusEnum.ENABLE
  } finally {
    if (actionTask.context.value === owner) statusBusy.delete(row.id)
  }
}

/** 导出按钮操作 */
const exportLoading = ref(false)
const handleExport = async () => {
  const owner = actionTask.context.value
  try {
    const current = actionTask.capture()
    const query = { ...queryParams, createTime: [...queryParams.createTime] }
    if (!(await actionDialog.value?.ask('export')) || !current()) return
    // 发起导出
    exportLoading.value = true
    const filename = t('system.user.export.filename')
    const data = await UserApi.exportUser(query)
    if (current()) download.excel(data, filename)
  } catch {
  } finally {
    if (actionTask.context.value === owner) exportLoading.value = false
  }
}

/** 操作分发 */
const handleCommand = (command: string, row: UserApi.UserVO) => {
  switch (command) {
    case 'handleDelete':
      handleDelete(row.id)
      break
    case 'handleResetPwd':
      handleResetPwd(row)
      break
    case 'handleRole':
      handleRole(row)
      break
    default:
      break
  }
}

/** 删除按钮操作 */
const handleDelete = async (id: number) => {
  const current = actionTask.capture()
  try {
    if (!(await actionDialog.value?.ask('delete')) || !current()) return
    await UserApi.deleteUser(id)
    if (!current()) return
    message.success(t('common.delSuccess'))
    await getList()
  } catch {
    /* The request handler owns error messages. */
  }
}

/** 批量删除按钮操作 */
const checkedIds = ref<number[]>([])
const handleRowCheckboxChange = (rows: UserApi.UserVO[]) => {
  checkedIds.value = rows.map((row) => row.id)
}

const handleDeleteBatch = async () => {
  const ids = [...checkedIds.value]
  if (!ids.length) return
  const current = actionTask.capture()
  try {
    if (!(await actionDialog.value?.ask('batchDelete', '', ids.length)) || !current()) return
    await UserApi.deleteUserList(ids)
    if (!current()) return
    checkedIds.value = []
    message.success(t('common.delSuccess'))
    await getList()
  } catch {
    /* The request handler owns error messages. */
  }
}

/** 重置密码 */
const handleResetPwd = async (row: UserApi.UserVO) => {
  const current = actionTask.capture()
  try {
    const password = await actionDialog.value?.ask('resetPassword', row.username)
    if (typeof password !== 'string' || !current()) return
    await UserApi.resetUserPassword(row.id, password)
    if (current()) message.success(t('system.user.passwordChanged', { password }))
  } catch {
    /* The request handler owns error messages. */
  }
}

/** 分配角色 */
const assignRoleFormRef = ref()
const handleRole = (row: UserApi.UserVO) => {
  assignRoleFormRef.value.open(row)
}

/** 初始化 */
onMounted(() => {
  getList()
})
</script>
