<template>
  <Dialog v-model="dialogVisible" :title="t('system.user.import.title')" width="480" show-locale>
    <el-alert
      v-if="uploadFailed"
      :title="t('system.user.import.failed')"
      type="error"
      :closable="false"
      class="mb-12px"
    />
    <el-upload
      ref="uploadRef"
      v-model:file-list="fileList"
      :auto-upload="false"
      :disabled="formLoading"
      :aria-busy="formLoading"
      :http-request="uploadFile"
      :before-upload="checkFile"
      :limit="1"
      :on-exceed="handleExceed"
      :on-success="submitFormSuccess"
      accept=".xlsx,.xls"
      drag
    >
      <Icon icon="ep:upload" aria-hidden="true" />
      <div class="el-upload__text">{{ t('system.user.import.chooseFile') }}</div>
      <template #tip>
        <div class="el-upload__tip user-import-options">
          <el-checkbox v-model="updateSupport" :disabled="formLoading">
            {{ t('system.user.import.updateExisting') }}
          </el-checkbox>
          <p>{{ t('system.user.import.formats') }}</p>
          <el-button link type="primary" :disabled="formLoading" @click="importTemplate">
            {{ t('system.user.import.downloadTemplate') }}
          </el-button>
        </div>
      </template>
      <template #file="{ file }">
        <div class="user-import-file">
          <bdi dir="auto">{{ file.name }}</bdi>
          <el-button
            text
            :disabled="formLoading"
            :aria-label="t('system.user.import.removeFile', { name: file.name })"
            @click="uploadRef?.handleRemove(file)"
          >
            {{ t('common.del') }}
          </el-button>
        </div>
      </template>
    </el-upload>
    <template #footer>
      <el-button :loading="formLoading" type="primary" @click="submitForm">{{
        t('common.ok')
      }}</el-button>
      <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
    </template>
  </Dialog>
  <Dialog v-model="resultsVisible" :title="t('system.user.import.results')" width="560" show-locale>
    <div v-if="result" class="user-import-results">
      <section>
        <h3>{{
          t(
            'system.user.import.createdCount',
            { count: result.createUsernames.length },
            result.createUsernames.length
          )
        }}</h3>
        <ul v-if="result.createUsernames.length"
          ><li v-for="name in result.createUsernames" :key="name"
            ><bdi dir="auto">{{ name }}</bdi></li
          ></ul
        >
      </section>
      <section>
        <h3>{{
          t(
            'system.user.import.updatedCount',
            { count: result.updateUsernames.length },
            result.updateUsernames.length
          )
        }}</h3>
        <ul v-if="result.updateUsernames.length"
          ><li v-for="name in result.updateUsernames" :key="name"
            ><bdi dir="auto">{{ name }}</bdi></li
          ></ul
        >
      </section>
      <section>
        <h3>{{
          t(
            'system.user.import.failedCount',
            { count: Object.keys(result.failureUsernames).length },
            Object.keys(result.failureUsernames).length
          )
        }}</h3>
        <ul v-if="Object.keys(result.failureUsernames).length"
          ><li v-for="(reason, name) in result.failureUsernames" :key="name"
            ><bdi dir="auto">{{ name }}</bdi
            ><span> — </span><bdi dir="auto">{{ reason }}</bdi></li
          ></ul
        >
      </section>
    </div>
    <template #footer
      ><el-button type="primary" @click="resultsVisible = false">{{
        t('common.ok')
      }}</el-button></template
    >
  </Dialog>
</template>
<script lang="ts" setup>
import type {
  UploadInstance,
  UploadRawFile,
  UploadRequestOptions,
  UploadUserFile
} from 'element-plus'
import * as UserApi from '@/api/system/user'
import { getAuthenticationCacheScope } from '@/hooks/web/cacheContext'
import download from '@/utils/download'

defineOptions({ name: 'SystemUserImportForm' })
const { t } = useI18n()
const message = useMessage()
const dialogVisible = ref(false)
const resultsVisible = ref(false)
const formLoading = ref(false)
const uploadFailed = ref(false)
const uploadRef = ref<UploadInstance>()
const fileList = ref<UploadUserFile[]>([])
const updateSupport = ref(false)
const result = ref<UserApi.UserImportResult>()
const context = computed(getAuthenticationCacheScope)
let controller: AbortController | undefined
let uploadGeneration = 0
let activeContext: string | undefined
let templateGeneration = 0
const emits = defineEmits(['success'])

const resetForm = () => {
  uploadGeneration++
  controller?.abort()
  controller = undefined
  activeContext = undefined
  formLoading.value = false
  uploadFailed.value = false
  fileList.value = []
  uploadRef.value?.clearFiles()
}
const open = () => {
  resetForm()
  updateSupport.value = false
  result.value = undefined
  resultsVisible.value = false
  dialogVisible.value = true
}
defineExpose({ open })

const checkFile = (file: UploadRawFile) => {
  if (!/\.xlsx?$/i.test(file.name)) {
    message.error(t('system.user.import.formats'))
    formLoading.value = false
    return false
  }
  return true
}
const uploadFile = async (options: UploadRequestOptions) => {
  const generation = ++uploadGeneration
  const scope = context.value
  controller = new AbortController()
  try {
    const data = await UserApi.importUsers(options.file, updateSupport.value, controller.signal)
    return { generation, scope, data }
  } catch (error) {
    if (generation === uploadGeneration && scope === context.value && dialogVisible.value) {
      formLoading.value = false
      uploadFailed.value = true
      fileList.value = []
    }
    // Axios already displays the localized API or network error.
    throw error
  }
}
const submitForm = () => {
  if (!fileList.value.length) {
    message.error(t('system.user.import.fileRequired'))
    return
  }
  if (formLoading.value) return
  uploadFailed.value = false
  activeContext = context.value
  formLoading.value = true
  uploadRef.value?.submit()
}
const submitFormSuccess = (response: {
  generation: number
  scope: string
  data: UserApi.UserImportResult
}) => {
  if (
    !dialogVisible.value ||
    activeContext !== context.value ||
    response.scope !== context.value ||
    response.generation !== uploadGeneration
  )
    return
  result.value = response.data
  formLoading.value = false
  dialogVisible.value = false
  resultsVisible.value = true
  emits('success')
}
const handleExceed = () => message.error(t('system.user.import.oneFile'))
const importTemplate = async () => {
  const scope = context.value
  const generation = ++templateGeneration
  const filename = t('system.user.import.filename')
  const data = await UserApi.importUserTemplate()
  if (scope === context.value && generation === templateGeneration && dialogVisible.value) {
    download.excel(data, filename)
  }
}
watch(dialogVisible, (visible) => {
  if (!visible) {
    uploadGeneration++
    controller?.abort()
    templateGeneration++
  }
})
watch(context, () => {
  dialogVisible.value = false
  resultsVisible.value = false
  result.value = undefined
  templateGeneration++
  resetForm()
})
onBeforeUnmount(() => controller?.abort())
</script>
<style scoped>
.user-import-options {
  text-align: start;
}
.user-import-options .el-checkbox {
  height: auto;
  white-space: normal;
}
.user-import-file {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
  padding-inline: 8px;
}
.user-import-file bdi {
  overflow-wrap: anywhere;
  min-width: 0;
}
.user-import-results {
  max-height: 60vh;
  overflow: auto;
  text-align: start;
  overflow-wrap: anywhere;
}
.user-import-results ul {
  padding-inline-start: 1.5rem;
}
</style>
