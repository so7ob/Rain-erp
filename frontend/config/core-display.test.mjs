import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ref, computed } from 'vue'
import defaults from '../src/locales/defaults/core.json' with { type: 'json' }
import {
  withMenuDisplay,
  withDictionaryDisplay,
  withDictionaryValue,
  routeDisplayTitle
} from '../src/locales/display.ts'
import { readCatalogs } from './localization.mjs'

const catalogs = readCatalogs(new URL('../src/locales/', import.meta.url))
const translate =
  (locale) =>
  (key, parameters = {}) => {
    const message = catalogs[locale].get(key)
    assert.ok(message, `${locale}: ${key}`)
    return message.replace(/\{(\w+)\}/g, (_, name) => parameters[name])
  }

function seedRows(table, count) {
  return readFileSync(new URL('../../sql/mysql/ruoyi-vue-pro.sql', import.meta.url), 'utf8')
    .split('\n')
    .filter((line) => line.startsWith(`INSERT INTO \`${table}\``) && line.endsWith(", b'0');"))
    .map((line) =>
      [...line.split(' VALUES (')[1].matchAll(/(?:^|,)\s*(?:'((?:\\.|[^'\\])*)'|([^,()]+))/g)]
        .slice(0, count)
        .map((match) => (match[1] ?? match[2]).trim().replace(/\\(['"\\])/g, '$1'))
    )
}

test('the reviewed core manifest covers every targeted seed identity and exact original meaning', () => {
  const menus = seedRows('system_menu', 9)
  const byId = new Map(menus.map((row) => [row[0], row]))
  const belongs = (row, visited = new Set()) => {
    if (!row || visited.has(row[0])) return false
    if (row[0] === '1' || row[0] === '2') return true
    visited.add(row[0])
    return belongs(byId.get(row[5]), visited)
  }
  const expected = menus
    .filter((row) => ['1', '2'].includes(row[3]) && belongs(row))
    .map((row) => ({
      id: Number(row[0]),
      name: row[1],
      path: row[6],
      component: row[8] === 'NULL' ? null : row[8]
    }))
  assert.equal(expected.length, 58)
  assert.deepEqual(
    defaults.menus.map(({ key, ...source }) => source),
    expected
  )
  const dictionary = seedRows('system_dict_data', 5)
    .filter((row) => /^(common|system|infra)_/.test(row[4]))
    .map((row) => ({ dictType: row[4], value: row[3], label: row[2] }))
  assert.equal(dictionary.length, 103)
  assert.deepEqual(
    defaults.dictionaries.map(({ key, parameters, literalReason, ...source }) => source),
    dictionary
  )
  assert.equal(new Set(defaults.menus.map((item) => item.id)).size, 58)
  assert.equal(
    new Set(dictionary.map((item) => JSON.stringify([item.dictType, item.value]))).size,
    103
  )
  assert.deepEqual(
    defaults.dictionaries
      .filter((item) => item.literalReason)
      .map((item) => `${item.dictType}:${item.value}`)
      .sort(),
    [
      'system_oauth2_grant_type:password',
      'system_oauth2_grant_type:authorization_code',
      'system_oauth2_grant_type:implicit',
      'system_oauth2_grant_type:client_credentials',
      'system_oauth2_grant_type:refresh_token',
      'system_social_type:10',
      'system_social_type:20',
      'system_social_type:30',
      'system_social_type:31',
      'system_social_type:32',
      'system_social_type:34',
      'system_social_type:40',
      'system_sms_channel_code:ALIYUN',
      'system_sms_channel_code:TENCENT',
      'system_sms_channel_code:HUAWEI',
      'system_sms_channel_code:QINIU'
    ].sort()
  )
})

test('all default presentations resolve in three languages without changing source fields or types', () => {
  for (const locale of ['ar', 'en', 'zh-CN']) {
    for (const entry of defaults.menus) {
      const { key, ...source } = entry
      Object.freeze(source)
      const result = withMenuDisplay(source, translate(locale))
      assert.equal(result.name, source.name)
      assert.equal(result.id, source.id)
      assert.equal(result.displayName, translate(locale)(key))
    }
    for (const entry of defaults.dictionaries) {
      const { key, parameters, literalReason, ...source } = entry
      Object.freeze(source)
      const result = withDictionaryDisplay(source, translate(locale))
      assert.equal(result.label, source.label)
      assert.equal(result.value, source.value)
      assert.equal(result.displayLabel, key ? translate(locale)(key, parameters) : source.label)
    }
  }
})

test('custom names, changed meaning and unknown identities remain literal, including key-shaped names', () => {
  const t = translate('ar')
  const known = defaults.menus.find((item) => item.id === 4)
  for (const change of [
    { name: 'عملاء Test 123' },
    { id: 999999 },
    { path: 'custom' },
    { component: 'custom/view' },
    { name: 'common.save' }
  ]) {
    const source = { ...known, ...change }
    assert.equal(withMenuDisplay(source, t).displayName, source.name)
    assert.equal(routeDisplayTitle({ menuDisplay: source, title: source.name }, t), source.name)
  }
  const dictionary = { dictType: 'system_user_sex', value: 1, label: '男' }
  assert.equal(routeDisplayTitle({ menuDisplay: known, title: 'عميل 00123' }, t), 'عميل 00123')
  assert.equal(withDictionaryDisplay(dictionary, t).value, 1)
  assert.equal(withDictionaryDisplay(dictionary, t).displayLabel, 'ذكر')
  for (const change of [
    { label: 'خاص Test' },
    { dictType: 'customer_sex' },
    { value: 'unknown' }
  ]) {
    const source = { ...dictionary, ...change }
    assert.equal(withDictionaryDisplay(source, t).displayLabel, source.label)
  }
})

test('already captured presentation objects and route titles react without changing drafts', () => {
  const locale = ref('ar')
  const t = (key, parameters) => translate(locale.value)(key, parameters)
  const source = defaults.menus.find((item) => item.id === 4)
  const menu = withMenuDisplay(source, t)
  const option = withDictionaryDisplay({ dictType: 'system_user_sex', value: '1', label: '男' }, t)
  const title = computed(() => routeDisplayTitle({ menuDisplay: source }, t))
  const draft = { nickname: 'عميل Test 00123', sex: '1' }
  assert.equal(menu.displayName, 'المستخدمون')
  assert.equal(option.displayLabel, 'ذكر')
  locale.value = 'en'
  assert.equal(menu.displayName, 'Users')
  assert.equal(option.displayLabel, 'Male')
  assert.equal(title.value, 'Users')
  assert.deepEqual(draft, { nickname: 'عميل Test 00123', sex: '1' })
})

test('widget conversion never mistakes a custom identifier for a default value', () => {
  const t = translate('ar')
  const custom = withDictionaryDisplay({ dictType: 'common_status', value: '01', label: '关闭' }, t)
  const numeric = withDictionaryValue(custom, 1)
  assert.equal(numeric.value, 1)
  assert.equal(numeric.label, '关闭')
  assert.equal(numeric.displayLabel, '关闭')
  const known = withDictionaryDisplay({ dictType: 'common_status', value: '1', label: '关闭' }, t)
  assert.equal(withDictionaryValue(known, 1).displayLabel, 'معطّل')
})
