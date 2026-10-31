<template>
  <Dialog
    v-model="dialogVisible"
    :title="t('system.user.assignRolesTitle')"
    class="rain-user-management"
    width="560"
    show-locale
  >
    <el-alert
      v-if="loadFailed"
      :title="t('system.user.loadFailed')"
      type="error"
      :closable="false"
    />
    <el-form
      ref="formRef"
      v-loading="formLoading"
      :model="formData"
      label-position="top"
      :disabled="formLoading || !formReady"
    >
      <el-form-item :label="t('system.user.fields.username')">
        <el-input v-model="formData.username" :disabled="true" />
      </el-form-item>
      <el-form-item :label="t('system.user.fields.nickname')">
        <el-input v-model="formData.nickname" :disabled="true" />
      </el-form-item>
      <el-form-item :label="t('system.user.fields.roles')">
        <el-select
          v-model="formData.roleIds"
          multiple
          :placeholder="t('system.user.placeholders.roles')"
        >
          <el-option v-for="item in roleList" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="formLoading || !formReady" type="primary" @click="submitForm">{{
        t('common.ok')
      }}</el-button>
      <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
    </template>
  </Dialog>
</template>
<script lang="ts" setup>
import type { FormInstance } from 'element-plus'
import * as PermissionApi from '@/api/system/permission'
import * as UserApi from '@/api/system/user'
import * as RoleApi from '@/api/system/role'
import { useContextTask } from '@/hooks/web/useContextTask'

defineOptions({ name: 'SystemUserAssignRoleForm' })
const { t } = useI18n()
const message = useMessage()
const dialogVisible = ref(false)
const formLoading = ref(false)
const formReady = ref(false)
const loadFailed = ref(false)
const initialForm = () => ({ id: -1, nickname: '', username: '', roleIds: [] as number[] })
const formData = ref(initialForm())
const formRef = ref<FormInstance>()
const roleList = ref<RoleApi.RoleVO[]>([])
const resetForm = () => {
  formData.value = initialForm()
  roleList.value = []
  formRef.value?.resetFields()
}
const loadTask = useContextTask(() => {
  dialogVisible.value = false
  resetForm()
  formLoading.value = false
  formReady.value = false
})
const saveTask = useContextTask()
const open = async (row: UserApi.UserVO) => {
  loadTask.invalidate()
  saveTask.invalidate()
  resetForm()
  formData.value.id = row.id
  formData.value.username = row.username
  formData.value.nickname = row.nickname
  dialogVisible.value = true
  formLoading.value = true
  formReady.value = false
  loadFailed.value = false
  const current = loadTask.begin()
  try {
    const [roles, available] = await Promise.all([
      PermissionApi.getUserRoleList(row.id),
      RoleApi.getSimpleRoleList()
    ])
    if (!current() || !dialogVisible.value) return
    formData.value.roleIds = roles
    roleList.value = available
    formReady.value = true
  } catch {
    if (current()) loadFailed.value = true
  } finally {
    if (current()) formLoading.value = false
  }
}
defineExpose({ open })
const emit = defineEmits(['success'])
const submitForm = async () => {
  if (!formReady.value || formLoading.value) return
  const current = saveTask.begin()
  if (
    !(await formRef.value?.validate().catch(() => false)) ||
    !current() ||
    !dialogVisible.value ||
    !formReady.value
  )
    return
  const data = { userId: formData.value.id, roleIds: [...formData.value.roleIds] }
  formLoading.value = true
  try {
    await PermissionApi.assignUserRole(data)
    if (!current() || !dialogVisible.value) return
    message.success(t('common.updateSuccess'))
    dialogVisible.value = false
    emit('success', true)
  } catch {
    // The shared transport presents the localized error; retain the selected roles.
  } finally {
    if (current()) formLoading.value = false
  }
}
watch(dialogVisible, (visible) => {
  if (!visible) {
    loadTask.invalidate()
    saveTask.invalidate()
    formLoading.value = false
  }
})
</script>
