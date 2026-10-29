import { readFileSync } from 'node:fs'

export function parseProjectVersion(pom) {
  const revisions = [...pom.matchAll(/<revision>([^<]+)<\/revision>/g)]
  if (revisions.length !== 1 || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-SNAPSHOT)?$/.test(revisions[0][1])) {
    throw new Error('Expected one Maven project revision in the root pom.xml')
  }
  return revisions[0][1]
}

export function readProjectVersion() {
  return parseProjectVersion(readFileSync(new URL('../../pom.xml', import.meta.url), 'utf8'))
}

export const defaults = Object.freeze({
  VITE_APP_TITLE: 'Rain-erp',
  VITE_PORT: '5173',
  VITE_OPEN: 'false',
  VITE_DEV: 'false',
  VITE_APP_TENANT_ENABLE: 'true',
  VITE_APP_CAPTCHA_ENABLE: 'true',
  VITE_APP_DOCALERT_ENABLE: 'false',
  VITE_APP_BAIDU_CODE: '',
  VITE_BAIDU_MAP_KEY: '',
  VITE_APP_DEFAULT_LOGIN_TENANT: '',
  VITE_APP_DEFAULT_LOGIN_USERNAME: '',
  VITE_APP_DEFAULT_LOGIN_PASSWORD: '',
  VITE_APP_API_ENCRYPT_ENABLE: 'false',
  VITE_APP_API_ENCRYPT_HEADER: 'X-Api-Encrypt',
  VITE_APP_API_ENCRYPT_ALGORITHM: 'AES',
  VITE_APP_API_ENCRYPT_REQUEST_KEY: '',
  VITE_APP_API_ENCRYPT_RESPONSE_KEY: '',
  VITE_BASE_URL: '',
  VITE_API_URL: '/admin-api',
  VITE_UPLOAD_TYPE: 'server',
  VITE_DROP_DEBUGGER: 'true',
  VITE_DROP_CONSOLE: 'true',
  VITE_SOURCEMAP: 'false',
  VITE_COMPRESS: 'none',
  VITE_BASE_PATH: '/',
  VITE_OUT_DIR: 'dist',
  VITE_MALL_H5_DOMAIN: '',
  VITE_GOVIEW_URL: 'http://127.0.0.1:3000'
})

export function publicEnvironment(overrides, version) {
  const env = Object.fromEntries(Object.entries({ ...defaults, ...overrides })
    .filter(([name]) => name.startsWith('VITE_')))
  // Product identity follows Maven at build time, including preparation by older release tooling.
  env.VITE_APP_VERSION = version
  if (!/^\d+$/.test(env.VITE_PORT) || Number(env.VITE_PORT) < 1 || Number(env.VITE_PORT) > 65535) {
    throw new Error('VITE_PORT must be a valid TCP port')
  }
  return env
}

export function environmentDefines(env) {
  return Object.fromEntries(Object.entries(env)
    .filter(([name]) => name.startsWith('VITE_'))
    .map(([name, value]) => [`import.meta.env.${name}`, JSON.stringify(value)]))
}
