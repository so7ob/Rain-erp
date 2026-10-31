<template>
  <Dialog
    v-model="visible"
    :title="t('common.confirmTitle')"
    class="rain-user-management"
    width="480"
    show-locale
  >
    <I18nT v-if="action" :keypath="questionKey" :plural="action.count" tag="p" scope="global">
      <template #name
        ><bdi dir="auto">{{ action.name }}</bdi></template
      >
      <template #count
        ><bdi dir="ltr">{{ action.count }}</bdi></template
      >
    </I18nT>
    <el-form
      v-if="action?.kind === 'resetPassword'"
      ref="formRef"
      :model="model"
      :rules="rules"
      label-position="top"
      @submit.prevent="confirm"
    >
      <el-form-item :label="t('system.user.fields.password')" prop="password">
        <el-input
          v-model="model.password"
          type="password"
          show-password
          autocomplete="new-password"
          @keyup.enter="confirm"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button type="primary" @click="confirm">{{ t('common.ok') }}</el-button>
      <el-button @click="visible = false">{{ t('common.cancel') }}</el-button>
    </template>
  </Dialog>
</template>
<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { Translation as I18nT } from 'vue-i18n'
import { useLocalizedForm } from '@/hooks/web/useLocalizedForm'
import { useContextTask } from '@/hooks/web/useContextTask'

type Kind = 'enable' | 'disable' | 'delete' | 'batchDelete' | 'export' | 'resetPassword'
type Action = { kind: Kind; name: string; count?: number }
const { t } = useI18n()
const visible = ref(false)
const action = ref<Action>()
const model = reactive({ password: '' })
const formRef = ref<FormInstance>()
let complete: ((value: boolean | string | undefined) => void) | undefined
const questionKey = computed(() => {
  if (action.value?.kind === 'delete') return 'common.delMessage'
  if (action.value?.kind === 'batchDelete') return 'system.user.confirm.deleteCount'
  return 'system.user.confirm.' + action.value?.kind
})
const rules = computed<FormRules>(() => ({
  password: [
    {
      validator: (_rule, value: string, done) => {
        if (value.length >= 4 && value.length <= 16) done()
        else done(new Error(t('system.user.validation.passwordLength')))
      },
      trigger: ['blur', 'change']
    }
  ]
}))
useLocalizedForm(() => formRef.value)
const settle = (value?: boolean | string) => {
  const callback = complete
  complete = undefined
  visible.value = false
  callback?.(value)
}
useContextTask(() => {
  settle()
  action.value = undefined
  model.password = ''
})
const ask = (kind: Kind, name = '', count?: number): Promise<boolean | string | undefined> => {
  settle()
  action.value = { kind, name, count }
  model.password = ''
  visible.value = true
  return new Promise((resolve) => {
    complete = resolve
  })
}
const confirm = async () => {
  const pending = complete
  const owner = action.value
  const password = model.password
  if (action.value?.kind === 'resetPassword') {
    if (!(await formRef.value?.validate().catch(() => false))) return
    if (complete !== pending || action.value !== owner || !visible.value) return
    settle(password)
  } else settle(true)
}
watch(visible, (value) => {
  if (!value && complete) settle()
})
onBeforeUnmount(() => settle())
defineExpose({ ask })
</script>
