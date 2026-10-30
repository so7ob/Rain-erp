import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import qs from 'qs'
import { h } from 'vue'
import { config } from '@/config/axios/config'
import {
  getAccessToken,
  getRefreshToken,
  getTenantId,
  getVisitTenantId,
  removeToken,
  setToken
} from '@/utils/auth'
import { getErrorMessage } from './errorCode'
import { createSingleRefresh, isSilentRefreshError, isSessionAuthenticationError } from './session'

import { resetRouter } from '@/router'
import { deleteUserCache } from '@/hooks/web/useCache'
import { ApiEncrypt } from '@/utils/encrypt'
import { useLocaleStoreWithOut } from '@/store/modules/locale'
import { continueAuthenticationContext } from '@/hooks/web/cacheContext'

const tenantEnable = import.meta.env.VITE_APP_TENANT_ENABLE
const { result_code, base_url, request_timeout } = config

// 是否显示重新登录
export const isRelogin = { show: false }
let activeSession:
  | {
      credential: ReturnType<typeof getRefreshToken> | ReturnType<typeof getAccessToken>
      tenantId: ReturnType<typeof getTenantId>
      id: symbol
    }
  | undefined
const sessionIdentity = () => {
  const credential = getRefreshToken() || getAccessToken()
  const tenantId = getTenantId()
  if (
    !activeSession ||
    activeSession.credential !== credential ||
    activeSession.tenantId !== tenantId
  ) {
    activeSession = { credential, tenantId, id: Symbol('session') }
  }
  return { id: activeSession.id, tenantId }
}
type SessionIdentity = ReturnType<typeof sessionIdentity>
type RefreshAwareConfig = InternalAxiosRequestConfig & {
  _rainRefreshAttempted?: boolean
  _rainSession?: SessionIdentity
}
const sameSession = (session: SessionIdentity) => {
  return session.id === sessionIdentity().id
}
class SessionChangedError extends Error {
  constructor() {
    super(useI18n().t('api.session.changed'))
  }
}
// 请求白名单，无须 token 的接口
const whiteList: string[] = ['/login', '/refresh-token']

// 创建axios实例
const service: AxiosInstance = axios.create({
  baseURL: base_url, // api 的 base_url
  timeout: request_timeout, // 请求超时时间
  withCredentials: false, // 禁用 Cookie 等信息
  // 自定义参数序列化函数
  paramsSerializer: (params) => {
    return qs.stringify(params, { allowDots: true })
  }
})

const refreshSession = createSingleRefresh(
  async (session: SessionIdentity) => {
    if (!sameSession(session)) throw new SessionChangedError()
    const { data } = await refreshToken(session)
    if (!sameSession(session)) throw new SessionChangedError()
    if (
      (data.code !== 0 && data.code !== 200) ||
      !data.data?.accessToken ||
      !data.data?.refreshToken
    ) {
      return Promise.reject(data)
    }
    continueAuthenticationContext(() => setToken(data.data))
    return sessionIdentity()
  },
  (session) => session.id
)

// request拦截器
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.headers.set('Accept-Language', useLocaleStoreWithOut().getCurrentLocale.lang)
    // 是否需要设置访问租户；该配置仅供前端请求拦截器使用，不作为请求头发送
    const isVisitTenant = config.headers.get('isVisitTenant') !== false
    config.headers.delete('isVisitTenant')
    // 是否需要设置 token；命中白名单的接口（如 /login）不带 token
    let isToken = (config!.headers || {}).isToken !== false
    if (isToken && whiteList.some((v) => config.url?.includes(v))) {
      isToken = false
    }
    if (getAccessToken() && isToken) {
      const guarded = config as RefreshAwareConfig
      if (guarded._rainSession && !sameSession(guarded._rainSession))
        throw new SessionChangedError()
      guarded._rainSession ??= sessionIdentity()
      config.headers.Authorization = 'Bearer ' + getAccessToken() // 让每个请求携带自定义 token
    }
    // 设置租户
    if (tenantEnable && tenantEnable === 'true') {
      const tenantId = getTenantId()
      if (tenantId) config.headers['tenant-id'] = tenantId
      // 只有登录时，才设置 visit-tenant-id 访问租户
      const visitTenantId = getVisitTenantId()
      if (config.headers.Authorization && visitTenantId && isVisitTenant) {
        config.headers['visit-tenant-id'] = visitTenantId
      }
    }
    const method = config.method?.toUpperCase()
    // 防止 GET 请求缓存
    if (method === 'GET') {
      config.headers['Cache-Control'] = 'no-cache'
      config.headers['Pragma'] = 'no-cache'
    }
    // 自定义参数序列化函数
    else if (method === 'POST') {
      const contentType = config.headers['Content-Type'] || config.headers['content-type']
      if (contentType === 'application/x-www-form-urlencoded') {
        if (config.data && typeof config.data !== 'string') {
          config.data = qs.stringify(config.data)
        }
      }
    }
    // 是否 API 加密
    if ((config!.headers || {}).isEncrypt && !(config!.headers || {}).isEncrypted) {
      try {
        // 加密请求数据
        if (config.data) {
          config.data = ApiEncrypt.encryptRequest(config.data)
          // 设置加密标识头
          config.headers[ApiEncrypt.getEncryptHeader()] = 'true'
        }
      } catch (error) {
        console.error('请求数据加密失败:', error)
        throw error
      }
    }
    return config
  },
  (error: AxiosError) => {
    // Do something with request error
    return Promise.reject(error)
  }
)

// response 拦截器
service.interceptors.response.use(
  async (response: AxiosResponse<any>) => {
    let { data } = response
    const config = response.config as RefreshAwareConfig
    if (config._rainSession && !sameSession(config._rainSession))
      return Promise.reject(new SessionChangedError())
    if (!data) {
      // 返回“[HTTP]请求没有返回值”;
      throw new Error()
    }

    // 检查是否需要解密响应数据
    const encryptHeader = ApiEncrypt.getEncryptHeader()
    const isEncryptResponse =
      response.headers[encryptHeader] === 'true' ||
      response.headers[encryptHeader.toLowerCase()] === 'true'
    if (isEncryptResponse && typeof data === 'string') {
      try {
        // 解密响应数据
        data = ApiEncrypt.decryptResponse(data)
      } catch (error) {
        console.error('响应数据解密失败:', error)
        throw new Error(
          useI18n().t('api.response.decryptFailed', { reason: (error as Error).message })
        )
      }
    }

    const { t } = useI18n()
    // 未设置状态码则默认成功状态
    // 二进制数据则直接返回，例如说 Excel 导出
    if (
      response.request.responseType === 'blob' ||
      response.request.responseType === 'arraybuffer'
    ) {
      // 注意：如果导出的响应为 json，说明可能失败了，不直接返回进行下载
      if (response.data.type !== 'application/json') {
        return response.data
      }
      data = await new Response(response.data).json()
    }
    const code = data.code ?? result_code
    // 获取错误信息
    const msg = data.msg || getErrorMessage(code)
    if (code !== 0 && code !== 200 && isSilentRefreshError(data.messageKey)) {
      // 如果是忽略的错误码，直接返回 msg 异常
      return Promise.reject(msg)
    } else if (isSessionAuthenticationError(code, data.messageKey)) {
      if (config._rainRefreshAttempted || isRelogin.show || !getRefreshToken()) {
        return handleAuthorized()
      }
      config._rainRefreshAttempted = true
      const session = config._rainSession || sessionIdentity()
      try {
        if (config.headers.Authorization !== 'Bearer ' + getAccessToken()) {
          // Another response already renewed this same session while this 401 was in flight.
          config._rainSession = sessionIdentity()
        } else {
          config._rainSession = await refreshSession(session)
        }
        if (!sameSession(config._rainSession)) throw new SessionChangedError()
        config.headers.Authorization = 'Bearer ' + getAccessToken()
        if (config.headers.isEncrypt) {
          config.headers.isEncrypted = true
        }
        return service(config)
      } catch (error) {
        if (error instanceof SessionChangedError || !sameSession(config._rainSession || session))
          return Promise.reject(new SessionChangedError())
        return handleAuthorized()
      }
    } else if (code === 500) {
      ElMessage.error(t('sys.api.errMsg500'))
      return Promise.reject(new Error(msg))
    } else if (code === 901) {
      ElMessage.error({
        offset: 300,
        message: h('div', [
          h('div', t('sys.api.errMsg901')),
          h('p', [
            h(
              'a',
              { href: 'https://doc.iocoder.cn/', target: '_blank', rel: 'noopener noreferrer' },
              t('api.demo.documentation')
            )
          ]),
          h('div', t('api.demo.setupHint'))
        ])
      })
      return Promise.reject(new Error(msg))
    } else if (code !== 0 && code !== 200) {
      ElNotification.error({ title: msg })
      return Promise.reject('error')
    } else {
      return data
    }
  },
  (error: AxiosError) => {
    if (axios.isCancel(error)) return Promise.reject(error)
    let { message } = error
    const { t } = useI18n()
    if (error.code === 'ERR_NETWORK') {
      message = t('sys.api.errorMessage')
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      message = t('sys.api.apiTimeoutMessage')
    } else if (error.response?.status) {
      message = t('sys.api.apiRequestFailed') + error.response.status
    }
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

const refreshToken = async (session: SessionIdentity) => {
  return await axios.post(base_url + '/system/auth/refresh-token', undefined, {
    timeout: request_timeout,
    params: { refreshToken: getRefreshToken() },
    headers: {
      'Accept-Language': useLocaleStoreWithOut().getCurrentLocale.lang,
      'tenant-id': session.tenantId
    }
  })
}
const handleAuthorized = () => {
  const { t } = useI18n()
  if (!isRelogin.show) {
    // 如果已经到登录页面则不进行弹窗提示
    if (window.location.href.includes('login')) {
      return
    }
    isRelogin.show = true
    ElMessageBox.confirm(t('sys.api.timeoutMessage'), t('common.confirmTitle'), {
      showCancelButton: false,
      closeOnClickModal: false,
      showClose: false,
      closeOnPressEscape: false,
      confirmButtonText: t('login.relogin'),
      type: 'warning'
    }).then(() => {
      resetRouter() // 重置静态路由表
      deleteUserCache() // 删除用户缓存
      removeToken()
      isRelogin.show = false
      // 干掉token后再走一次路由让它过router.beforeEach的校验
      window.location.href = window.location.href
    })
  }
  return Promise.reject(t('sys.api.timeoutMessage'))
}
export { service }
