<script setup lang="ts">
import { useValidator } from '@/hooks/web/useValidator'
import { useDesign } from '@/hooks/web/useDesign'
import { useLockStore } from '@/store/modules/lock'
import avatarImg from '@/assets/imgs/avatar.gif'
import { useUserStore } from '@/store/modules/user'
import { useLocalizedForm } from '@/hooks/web/useLocalizedForm'

const { getPrefixCls } = useDesign()
const prefixCls = getPrefixCls('lock-dialog')

const { required } = useValidator()

const { t } = useI18n()

const lockStore = useLockStore()

const props = defineProps({
  modelValue: {
    type: Boolean
  }
})

const userStore = useUserStore()
const avatar = computed(() => userStore.user.avatar || avatarImg)
const userName = computed(() => userStore.user.nickname ?? 'Admin')

const emit = defineEmits(['update:modelValue'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => {
    emit('update:modelValue', val)
  }
})

const dialogTitle = computed(() => t('lock.lockScreen'))

const formData = ref({
  password: undefined
})
const formRules = computed(() => ({
  password: [required()]
}))

const formRef = ref() // 表单 Ref
useLocalizedForm(() => formRef.value)
const handleLock = async () => {
  // 校验表单
  if (!formRef) return
  const valid = await formRef.value.validate()
  if (!valid) return
  // 提交请求
  dialogVisible.value = false
  lockStore.setLockInfo({
    ...formData.value,
    isLock: true
  })
}
</script>

<template>
  <Dialog
    v-model="dialogVisible"
    width="500px"
    max-height="170px"
    :class="prefixCls"
    :title="dialogTitle"
    show-locale
  >
    <div class="flex flex-col items-center">
      <img :src="avatar" alt="" class="w-70px h-70px rounded-[50%]" />
      <span class="text-14px my-10px text-[var(--el-text-color-primary)]">
        {{ userName }}
      </span>
    </div>
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      :validate-on-rule-change="false"
      label-position="top"
    >
      <el-form-item :label="t('lock.lockPassword')" prop="password">
        <el-input
          type="password"
          v-model="formData.password"
          :placeholder="t('shell.lockPasswordPlaceholder')"
          clearable
          show-password
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button type="primary" @click="handleLock">{{ t('lock.lock') }}</el-button>
    </template>
  </Dialog>
</template>
