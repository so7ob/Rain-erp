import test from 'node:test'
import assert from 'node:assert/strict'
import { defaults, parseProjectVersion, readProjectVersion, publicEnvironment, environmentDefines } from './project.mjs'

test('release and development versions come from the same Maven revision', () => {
  for (const version of ['0.1.0', '0.1.1-SNAPSHOT', '1.0.0']) {
    assert.equal(parseProjectVersion(`<project><revision>${version}</revision></project>`), version)
  }
  assert.match(readProjectVersion(), /^\d+\.\d+\.\d+(-SNAPSHOT)?$/)
})
test('ambiguous or invalid Maven revisions fail the frontend build', () => {
  for (const pom of ['', '<revision>latest</revision>', '<revision>0.01.0</revision>', '<revision>0.1.0</revision><revision>0.2.0</revision>']) {
    assert.throws(() => parseProjectVersion(pom), /Maven project revision/)
  }
})
test('defaults use same-origin API requests and do not prefill credentials or provider keys', () => {
  assert.equal(defaults.VITE_BASE_URL, '')
  assert.equal(defaults.VITE_API_URL, '/admin-api')
  for (const key of ['VITE_APP_DEFAULT_LOGIN_PASSWORD', 'VITE_APP_DEFAULT_LOGIN_USERNAME',
    'VITE_APP_API_ENCRYPT_REQUEST_KEY', 'VITE_APP_API_ENCRYPT_RESPONSE_KEY', 'VITE_BAIDU_MAP_KEY', 'VITE_APP_BAIDU_CODE']) {
    assert.equal(defaults[key], '', key)
  }
  assert.equal(defaults.VITE_APP_API_ENCRYPT_ENABLE, 'false')
})
test('local overrides work while the product version remains Maven-authoritative', () => {
  const env = publicEnvironment({ VITE_BASE_URL: 'https://api.example.test', VITE_APP_VERSION: 'wrong',
    RAIN_PROXY_TARGET: 'http://127.0.0.1:48080', SERVER_ONLY_VALUE: 'server-only' }, '0.1.0')
  assert.equal(env.VITE_BASE_URL, 'https://api.example.test')
  assert.equal(env.VITE_APP_VERSION, '0.1.0')
  assert.equal(env.RAIN_PROXY_TARGET, undefined)
  assert.equal(env.SERVER_ONLY_VALUE, undefined)
})
test('client defines quote values and exclude server-only configuration', () => {
  const value = 'Rain "quoted"\nname'
  const define = environmentDefines({ VITE_APP_TITLE: value, SERVER_ONLY_VALUE: 'private' })
  assert.equal(JSON.parse(define['import.meta.env.VITE_APP_TITLE']), value)
  assert.equal(Object.keys(define).length, 1)
})
test('malformed local ports fail early', () => {
  for (const port of ['NaN', '0', '65536', '5173oops']) {
    assert.throws(() => publicEnvironment({ VITE_PORT: port }, '0.1.0'), /TCP port/)
  }
})
