<template>
  <el-form
    v-show="getShow"
    ref="formLogin"
    :model="loginData.loginForm"
    :rules="LoginRules"
    :validate-on-rule-change="false"
    class="login-form"
    label-position="top"
    label-width="120px"
    size="large"
  >
    <el-row class="mx-[-10px]">
      <el-col :span="24" class="px-10px">
        <el-form-item>
          <LoginFormTitle class="w-full" />
        </el-form-item>
      </el-col>
      <el-col :span="24" class="px-10px">
        <el-form-item
          v-if="loginData.tenantEnable === 'true'"
          prop="tenantName"
          :label="t('login.tenantname')"
        >
          <el-input
            v-model="loginData.loginForm.tenantName"
            :placeholder="t('login.tenantNamePlaceholder')"
            :prefix-icon="iconHouse"
            link
            type="primary"
            dir="auto"
          />
        </el-form-item>
      </el-col>
      <el-col :span="24" class="px-10px">
        <el-form-item prop="username" :label="t('login.username')">
          <el-input
            v-model="loginData.loginForm.username"
            :placeholder="t('login.usernamePlaceholder')"
            :prefix-icon="iconAvatar"
            dir="auto"
          />
        </el-form-item>
      </el-col>
      <el-col :span="24" class="px-10px">
        <el-form-item prop="password" :label="t('login.password')">
          <el-input
            v-model="loginData.loginForm.password"
            :placeholder="t('login.passwordPlaceholder')"
            :prefix-icon="iconLock"
            show-password
            type="password"
            @keyup.enter="getCode()"
            dir="auto"
          />
        </el-form-item>
      </el-col>
      <el-col :span="24" class="px-10px mt-[-20px] mb-[-20px]">
        <el-form-item>
          <el-row justify="space-between" style="width: 100%">
            <el-col :span="6">
              <el-checkbox v-model="loginData.loginForm.rememberMe">
                {{ t('login.remember') }}
              </el-checkbox>
            </el-col>
            <el-col :offset="6" :span="12">
              <el-button
                class="auth-forgot-password"
                link
                type="primary"
                @click="setLoginState(LoginStateEnum.RESET_PASSWORD)"
              >
                {{ t('login.forgetPassword') }}
              </el-button>
            </el-col>
          </el-row>
        </el-form-item>
      </el-col>
      <el-col :span="24" class="px-10px">
        <el-form-item>
          <el-button :loading="loginLoading" class="w-full" type="primary" @click="getCode()">
            {{ t('login.login') }}
          </el-button>
        </el-form-item>
      </el-col>
      <Verify
        v-if="loginData.captchaEnable === 'true'"
        ref="verify"
        :captchaType="captchaType"
        :imgSize="{ width: '400px', height: '200px' }"
        mode="pop"
        @success="handleLogin"
      />
      <el-col :span="24" class="px-10px">
        <el-form-item>
          <el-row
            :gutter="5"
            justify="space-between"
            class="auth-alternative-actions"
            style="width: 100%"
          >
            <el-col :xs="24" :sm="8">
              <el-button class="w-full" @click="setLoginState(LoginStateEnum.MOBILE)">
                {{ t('login.btnMobile') }}
              </el-button>
            </el-col>
            <el-col :xs="24" :sm="8">
              <el-button class="w-full" @click="handleQrcodeLogin">
                {{ t('login.btnQRCode') }}
              </el-button>
            </el-col>
            <el-col :xs="24" :sm="8">
              <el-button class="w-full" @click="setLoginState(LoginStateEnum.REGISTER)">
                {{ t('login.btnRegister') }}
              </el-button>
            </el-col>
          </el-row>
        </el-form-item>
      </el-col>
      <el-divider content-position="center">{{ t('login.otherLogin') }}</el-divider>
      <el-col :span="24" class="px-10px">
        <el-form-item>
          <div class="w-full flex flex-wrap justify-between gap-3">
            <button
              v-for="(item, key) in socialList"
              :key="key"
              type="button"
              :aria-label="t('auth.socialSignIn', { provider: item.name })"
              class="inline-flex cursor-pointer items-center border-0 bg-transparent p-6px"
              @click="doSocialLogin(item.type)"
            >
              <Icon
                :icon="item.icon"
                :size="30"
                class="anticon"
                color="var(--el-text-color-regular)"
              />
            </button>
          </div>
        </el-form-item>
      </el-col>
      <el-divider content-position="center">{{ t('auth.resources.title') }}</el-divider>
      <el-col :span="24" class="px-10px">
        <el-form-item>
          <div class="w-full flex flex-wrap justify-between gap-3">
            <el-link href="https://doc.iocoder.cn/" target="_blank">{{
              t('auth.resources.guide')
            }}</el-link>
            <el-link href="https://doc.iocoder.cn/video/" target="_blank">{{
              t('auth.resources.video')
            }}</el-link>
            <el-link href="https://www.iocoder.cn/Interview/good-collection/" target="_blank">
              {{ t('auth.resources.interview') }}
            </el-link>
            <el-link href="http://static.yudao.iocoder.cn/mp/Aix9975.jpeg" target="_blank">
              {{ t('auth.resources.consulting') }}
            </el-link>
          </div>
        </el-form-item>
      </el-col>
    </el-row>
  </el-form>
</template>
<script lang="ts" setup>
import { useLocalizedForm } from '@/hooks/web/useLocalizedForm'
import { ElLoading } from 'element-plus'
import LoginFormTitle from './LoginFormTitle.vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

import { useIcon } from '@/hooks/web/useIcon'

import * as authUtil from '@/utils/auth'
import { buildSocialRedirectUri } from '@/utils/social'
import { usePermissionStore } from '@/store/modules/permission'
import * as LoginApi from '@/api/login'
import { LoginStateEnum, useFormValid, useLoginState } from './useLogin'

defineOptions({ name: 'LoginForm' })

const { t } = useI18n()
const message = useMessage()
const iconHouse = useIcon({ icon: 'ep:house' })
const iconAvatar = useIcon({ icon: 'ep:avatar' })
const iconLock = useIcon({ icon: 'ep:lock' })
const formLogin = ref()
const { validForm } = useFormValid(formLogin)
const { setLoginState, getLoginState } = useLoginState()
const { currentRoute, push, resolve } = useRouter()
const permissionStore = usePermissionStore()
const redirect = ref<string>('')
const loginLoading = ref(false)
const verify = ref()
const captchaType = ref('blockPuzzle') // blockPuzzle 滑块 clickWord 点击文字 pictureWord 文字验证码

useLocalizedForm(() => formLogin.value)

const getShow = computed(() => unref(getLoginState) === LoginStateEnum.LOGIN)

const LoginRules = computed(() => ({
  tenantName: [required],
  username: [required],
  password: [required]
}))
const loginData = reactive({
  isShowPassword: false,
  captchaEnable: import.meta.env.VITE_APP_CAPTCHA_ENABLE,
  tenantEnable: import.meta.env.VITE_APP_TENANT_ENABLE,
  loginForm: {
    tenantName: import.meta.env.VITE_APP_DEFAULT_LOGIN_TENANT || '',
    username: import.meta.env.VITE_APP_DEFAULT_LOGIN_USERNAME || '',
    password: import.meta.env.VITE_APP_DEFAULT_LOGIN_PASSWORD || '',
    captchaVerification: '',
    rememberMe: true // 默认记录我。如果不需要，可手动修改
  }
})

const socialList = [
  { icon: 'ant-design:wechat-filled', type: 30, name: 'WeChat' },
  { icon: 'ant-design:dingtalk-circle-filled', type: 20, name: 'DingTalk' },
  { icon: 'ant-design:github-filled', type: 0, name: 'GitHub' },
  { icon: 'ant-design:alipay-circle-filled', type: 0, name: 'Alipay' }
]

// 获取验证码
const getCode = async () => {
  // 情况一，未开启：则直接登录
  if (loginData.captchaEnable === 'false') {
    await handleLogin({})
  } else {
    // 情况二，已开启：则展示验证码；只有完成验证码的情况，才进行登录
    // 弹出验证码
    verify.value.show()
  }
}
// 获取租户 ID
const getTenantId = async () => {
  if (loginData.tenantEnable === 'true') {
    const res = await LoginApi.getTenantIdByName(loginData.loginForm.tenantName)
    authUtil.setTenantId(res)
  }
}
// 扫码登录与账号登录一样，先确定租户。
const handleQrcodeLogin = async () => {
  await getTenantId()
  setLoginState(LoginStateEnum.QR_CODE)
}
// 记住我
const getLoginFormCache = () => {
  const loginForm = authUtil.getLoginForm()
  if (loginForm) {
    loginData.loginForm = {
      ...loginData.loginForm,
      username: loginForm.username ? loginForm.username : loginData.loginForm.username,
      password: loginForm.password ? loginForm.password : loginData.loginForm.password,
      rememberMe: loginForm.rememberMe,
      tenantName: loginForm.tenantName ? loginForm.tenantName : loginData.loginForm.tenantName
    }
  }
}
// 根据域名，获得租户信息
const getTenantByWebsite = async () => {
  if (loginData.tenantEnable === 'true') {
    const website = location.host
    const res = await LoginApi.getTenantByWebsite(website)
    if (res) {
      loginData.loginForm.tenantName = res.name
      authUtil.setTenantId(res.id)
    }
  }
}
const loading = ref() // ElLoading.service 返回的实例
// 登录
const handleLogin = async (params: any) => {
  loginLoading.value = true
  try {
    await getTenantId()
    const data = await validForm()
    if (!data) {
      return
    }
    const loginDataLoginForm = { ...loginData.loginForm }
    loginDataLoginForm.captchaVerification = params.captchaVerification
    const res = await LoginApi.login(loginDataLoginForm)
    if (!res) {
      return
    }
    loading.value = ElLoading.service({
      lock: true,
      text: t('auth.loading'),
      background: 'rgba(0, 0, 0, 0.7)'
    })
    if (loginDataLoginForm.rememberMe) {
      authUtil.setLoginForm(loginDataLoginForm)
    } else {
      authUtil.removeLoginForm()
    }
    authUtil.setToken(res)
    if (!redirect.value) {
      redirect.value = '/'
    }
    // 判断是否为SSO登录
    if (redirect.value.indexOf('sso') !== -1) {
      window.location.href = window.location.href.replace('/login?redirect=', '')
    } else {
      await push({ path: redirect.value || permissionStore.addRouters[0].path })
    }
  } finally {
    loginLoading.value = false
    loading.value.close()
  }
}

// 社交登录
const doSocialLogin = async (type: number) => {
  if (type === 0) {
    message.error(t('auth.providerUnavailable'))
  } else {
    loginLoading.value = true
    if (loginData.tenantEnable === 'true') {
      // 尝试先通过 tenantName 获取租户
      await getTenantId()
      // 如果获取不到，则需要弹出提示，进行处理
      if (!authUtil.getTenantId()) {
        try {
          const data = await message.prompt(t('login.tenantNamePlaceholder'), t('common.reminder'))
          if (data?.action !== 'confirm') throw 'cancel'
          const res = await LoginApi.getTenantIdByName(data.value)
          authUtil.setTenantId(res)
        } catch (error) {
          if (error === 'cancel') return
        } finally {
          loginLoading.value = false
        }
      }
    }
    // 计算 redirectUri
    // 注意: type、redirect 需要先 encode 一次，否则钉钉回调会丢失。
    // 配合 social-login.vue#getUrlValue() 使用
    const redirectUri = buildSocialRedirectUri(resolve('/social-login').href, {
      type,
      redirect: redirect.value || '/'
    })

    // 进行跳转
    window.location.href = await LoginApi.socialAuthRedirect(type, encodeURIComponent(redirectUri))
  }
}
watch(
  () => currentRoute.value,
  (route: RouteLocationNormalizedLoaded) => {
    redirect.value = route?.query?.redirect as string
  },
  {
    immediate: true
  }
)
onMounted(() => {
  getLoginFormCache()
  getTenantByWebsite()
})
</script>

<style lang="scss" scoped>
.auth-alternative-actions {
  row-gap: 8px;

  .el-button {
    min-height: 40px;
    height: auto;
    padding-block: 10px;
    white-space: normal;
  }
}

.auth-forgot-password {
  float: inline-end;
}

:deep(.anticon) {
  &:hover {
    color: var(--el-color-primary) !important;
  }
}

.login-code {
  float: right;
  width: 100%;
  height: 38px;

  img {
    width: 100%;
    height: auto;
    max-width: 100px;
    vertical-align: middle;
    cursor: pointer;
  }
}
</style>
