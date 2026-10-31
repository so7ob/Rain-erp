<template>
  <Dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    class="rain-user-management"
    width="640"
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
      :rules="formRules"
      label-position="top"
      :disabled="formLoading || !formReady"
    >
      <el-row>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="t('system.user.fields.nickname')" prop="nickname">
            <el-input
              v-model="formData.nickname"
              :placeholder="t('system.user.placeholders.nickname')"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="t('system.user.fields.department')" prop="deptId">
            <el-tree-select
              v-model="formData.deptId"
              :data="deptList"
              :props="defaultProps"
              check-strictly
              node-key="id"
              :placeholder="t('system.user.placeholders.department')"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="t('system.user.fields.mobile')" prop="mobile">
            <el-input
              v-model="formData.mobile"
              type="tel"
              maxlength="11"
              :placeholder="t('system.user.placeholders.mobile')"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="t('system.user.fields.email')" prop="email">
            <el-input
              v-model="formData.email"
              type="email"
              maxlength="50"
              :placeholder="t('system.user.placeholders.email')"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row>
        <el-col :xs="24" :sm="12">
          <el-form-item
            v-if="formData.id === undefined"
            :label="t('system.user.fields.username')"
            prop="username"
          >
            <el-input
              v-model="formData.username"
              :placeholder="t('system.user.placeholders.username')"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item
            v-if="formData.id === undefined"
            :label="t('system.user.fields.password')"
            prop="password"
          >
            <el-input
              v-model="formData.password"
              :placeholder="t('system.user.placeholders.password')"
              show-password
              type="password"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="t('system.user.fields.gender')">
            <el-select v-model="formData.sex" :placeholder="t('system.user.placeholders.gender')">
              <el-option
                v-for="dict in getIntDictOptions(DICT_TYPE.SYSTEM_USER_SEX)"
                :key="dict.value"
                :label="dict.displayLabel ?? dict.label"
                :value="dict.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="t('system.user.fields.posts')">
            <el-select
              v-model="formData.postIds"
              multiple
              :placeholder="t('system.user.placeholders.posts')"
            >
              <el-option
                v-for="item in postList"
                :key="item.id"
                :label="item.name"
                :value="item.id!"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="24">
          <el-form-item :label="t('system.user.fields.remark')">
            <el-input
              v-model="formData.remark"
              :placeholder="t('system.user.placeholders.remark')"
              type="textarea"
            />
          </el-form-item>
        </el-col>
      </el-row>
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
import type { FormInstance, FormRules } from 'element-plus'
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
import { CommonStatusEnum } from '@/utils/constants'
import { defaultProps, handleTree } from '@/utils/tree'
import { useContextTask } from '@/hooks/web/useContextTask'
import { useLocalizedForm } from '@/hooks/web/useLocalizedForm'
import * as PostApi from '@/api/system/post'
import * as DeptApi from '@/api/system/dept'
import * as UserApi from '@/api/system/user'

defineOptions({ name: 'SystemUserForm' })
const { t } = useI18n()
const message = useMessage()
const dialogVisible = ref(false)
const formLoading = ref(false)
const formReady = ref(false)
const loadFailed = ref(false)
const formType = ref('create')
const dialogTitle = computed(() =>
  t(formType.value === 'create' ? 'system.user.createTitle' : 'system.user.editTitle')
)
const initialForm = () => ({
  nickname: '',
  deptId: undefined as number | undefined,
  mobile: '',
  email: '',
  id: undefined as number | undefined,
  username: '',
  password: '',
  sex: undefined as number | undefined,
  postIds: [] as (string | number)[],
  remark: '',
  status: CommonStatusEnum.ENABLE,
  roleIds: [] as number[]
})
const formData = ref(initialForm())
const formRef = ref<FormInstance>()
const deptList = ref<Tree[]>([])
const postList = ref<PostApi.PostVO[]>([])
const formRules = computed<FormRules>(() => ({
  username: [
    { required: true, message: t('system.user.validation.usernameRequired'), trigger: 'blur' }
  ],
  nickname: [
    { required: true, message: t('system.user.validation.nicknameRequired'), trigger: 'blur' }
  ],
  password: [
    { required: true, message: t('system.user.validation.passwordRequired'), trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: t('system.user.validation.email'), trigger: ['blur', 'change'] }
  ],
  mobile: [
    { pattern: /^1[3-9]\d{9}$/, message: t('system.user.validation.mobile'), trigger: 'blur' }
  ]
}))
useLocalizedForm(() => formRef.value)
const clearContext = () => {
  dialogVisible.value = false
  formData.value = initialForm()
  deptList.value = []
  postList.value = []
  formLoading.value = false
  formReady.value = false
}
const loadTask = useContextTask(clearContext)
const saveTask = useContextTask()
const resetForm = () => {
  formData.value = initialForm()
  formRef.value?.resetFields()
}
const open = async (type: string, id?: number) => {
  loadTask.invalidate()
  saveTask.invalidate()
  formType.value = type
  resetForm()
  dialogVisible.value = true
  formReady.value = false
  loadFailed.value = false
  formLoading.value = true
  const current = loadTask.begin()
  try {
    const [user, departments, posts] = await Promise.all([
      id ? UserApi.getUser(id) : Promise.resolve(undefined),
      DeptApi.getSimpleDeptList(),
      PostApi.getSimplePostList()
    ])
    if (!current() || !dialogVisible.value) return
    if (id && !user) {
      loadFailed.value = true
      return
    }
    if (user) formData.value = user
    deptList.value = handleTree(departments)
    postList.value = posts
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
  if (
    !formReady.value ||
    formLoading.value ||
    !(await formRef.value?.validate().catch(() => false))
  )
    return
  const current = saveTask.begin()
  const data = {
    ...formData.value,
    postIds: [...(formData.value.postIds || [])],
    roleIds: [...(formData.value.roleIds || [])]
  } as unknown as UserApi.UserVO
  const type = formType.value
  formLoading.value = true
  try {
    if (type === 'create') await UserApi.createUser(data)
    else await UserApi.updateUser(data)
    if (!current() || !dialogVisible.value) return
    message.success(t(type === 'create' ? 'common.createSuccess' : 'common.updateSuccess'))
    dialogVisible.value = false
    emit('success')
  } catch {
    // The shared transport presents the localized error; retain the entered form.
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
