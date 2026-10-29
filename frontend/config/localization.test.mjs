import test from 'node:test'
import assert from 'node:assert/strict'
import { readCatalogs, validateCatalogs, flattenCatalog, scanSource } from './localization.mjs'
import {
  normalizeLocale,
  supportedLocales,
  applyDocumentLocale,
  arabicPluralRule,
  createLocaleSwitcher,
  relativeTimeMessages
} from '../src/locales/policy.ts'
import { createI18n } from 'vue-i18n'
import { reactive, computed, nextTick } from 'vue'
import { formatTimeAgo } from '@vueuse/core'
import { baseCompile } from '@intlify/message-compiler'

const catalogs = readCatalogs(new URL('../src/locales/', import.meta.url))

test('every shared message exists in all three catalogs and compiles', () => {
  assert.deepEqual(validateCatalogs(catalogs), [])
  assert.ok(catalogs.ar.size > 400)
  for (const [locale, catalog] of Object.entries(catalogs)) {
    for (const [key, value] of catalog) {
      const errors = []
      baseCompile(value, { onError: (error) => errors.push(error.message) })
      assert.deepEqual(errors, [], `${locale}: ${key}`)
    }
  }
})

test('catalog validation rejects missing translations, invalid leaves and parameter loss', () => {
  assert.deepEqual(validateCatalogs({ ar: new Map(), en: new Map([['save', 'Save']]) }), [
    'ar: missing save'
  ])
  assert.match(
    validateCatalogs({
      ar: new Map([['count', 'عدد {total}']]),
      en: new Map([['count', '{count} items']])
    }).join(),
    /placeholder mismatch/
  )
  assert.throws(() => flattenCatalog({ empty: '' }), /nonempty string/)
  assert.throws(() => flattenCatalog(JSON.parse('{"__proto__":"unsafe"}')), /Unsafe/)
})

test('new/invalid preferences use Arabic; valid saved languages and supported regional aliases are retained', () => {
  for (const input of [undefined, null, false, 1, {}, '', '../../en', 'fr', 'zh-TW'])
    assert.equal(normalizeLocale(input), 'ar')
  for (const locale of supportedLocales) assert.equal(normalizeLocale(locale), locale)
  assert.equal(normalizeLocale(' AR-ye '), 'ar')
  assert.equal(normalizeLocale('en-US'), 'en')
  assert.equal(normalizeLocale('zh-Hans'), 'zh-CN')
})

test('document language and direction switch together without touching application content', () => {
  const attributes = {}
  const root = {
    setAttribute: (key, value) => {
      attributes[key] = value
    }
  }
  for (const locale of supportedLocales) {
    applyDocumentLocale(locale, root)
    assert.deepEqual(attributes, { lang: locale, dir: locale === 'ar' ? 'rtl' : 'ltr' })
  }
})

test('a slow earlier language import cannot overwrite the latest selection', async () => {
  const waiting = new Map()
  const applied = []
  const change = createLocaleSwitcher(
    (locale) => new Promise((resolve) => waiting.set(locale, resolve)),
    (locale, messages) => applied.push([locale, messages])
  )
  const first = change('en')
  const last = change('ar')
  waiting.get('ar')('Arabic')
  await last
  waiting.get('en')('English')
  await first
  assert.deepEqual(applied, [['ar', 'Arabic']])
})

test('failed imports preserve the current locale, and later attempts can succeed', async () => {
  let fail = true
  const applied = []
  const change = createLocaleSwitcher(
    async () => {
      if (fail) throw new Error('offline')
      return 'loaded'
    },
    (locale) => applied.push(locale)
  )
  await assert.rejects(change('en'), /offline/)
  assert.deepEqual(applied, [])
  fail = false
  await change('en')
  assert.deepEqual(applied, ['en'])
})

test('composer updates rendered translations without resetting form data', async () => {
  const i18n = createI18n({
    legacy: false,
    locale: 'ar',
    fallbackLocale: 'en',
    messages: {
      ar: { common: { save: catalogs.ar.get('common.save') } },
      en: { common: { save: catalogs.en.get('common.save') }, fallback: 'Fallback' }
    }
  })
  const form = reactive({ name: 'عميل Test', amount: 123.45 })
  const label = computed(() => i18n.global.t('common.save'))
  assert.equal(label.value, 'حفظ')
  i18n.global.locale.value = 'en'
  await nextTick()
  assert.equal(label.value, 'Save')
  assert.deepEqual({ ...form }, { name: 'عميل Test', amount: 123.45 })
  i18n.global.locale.value = 'ar'
  assert.equal(i18n.global.t('fallback'), 'Fallback')
})

test('Arabic relative time handles dual/plural forms and uses Latin digits', () => {
  const messages = relativeTimeMessages('ar')
  assert.match(messages.minute(2, true), /دقيقتين/)
  for (const count of [0, 1, 2, 3, 11, 100]) {
    for (const past of [true, false]) {
      const value = messages.minute(count, past)
      assert.match(value, /\p{Script=Arabic}/u)
      assert.doesNotMatch(value, /[٠-٩۰-۹]/u)
    }
  }
  const now = new Date('2026-01-01T12:00:00Z')
  assert.match(formatTimeAgo(new Date(now.valueOf() - 11 * 60_000), { messages }, now), /11/)
  assert.equal(formatTimeAgo(new Date('invalid'), { messages }, now), '—')
})

test('Arabic plural selection supports all six forms without losing interpolation parameters', () => {
  const i18n = createI18n({
    legacy: false,
    locale: 'ar',
    pluralRules: { ar: arabicPluralRule },
    messages: { ar: { items: 'صفر | واحد | اثنان | قليل | كثير | آخر' } }
  })
  for (const [count, expected] of [
    [0, 'صفر'],
    [1, 'واحد'],
    [2, 'اثنان'],
    [3, 'قليل'],
    [10, 'قليل'],
    [11, 'كثير'],
    [99, 'كثير'],
    [100, 'آخر'],
    [103, 'قليل'],
    [1.5, 'آخر']
  ]) {
    assert.equal(i18n.global.t('items', count), expected)
  }
  assert.deepEqual(
    validateCatalogs({
      ar: new Map([
        ['items', 'لا عناصر | عنصر | عنصران | {count} عناصر | {count} عنصرًا | {count} عنصر']
      ]),
      en: new Map([['items', 'One item | {count} items']])
    }),
    []
  )
})

test('visible-text discovery covers templates, bound labels, interpolations and contextual script messages', () => {
  const source = `<template><span>名称 {{ valid ? '是' : '否' }}</span><el-input placeholder="请输入" :title="'标题'" /><button>{{ t('common.save') }}</button></template>
<script setup>const rules={message:'必填'}; message.success('成功'); const technical='erp:product:create'; // 中文注释
</script>`
  const scan = scanSource(source, 'sample.vue')
  assert.deepEqual(scan.errors, [])
  for (const text of ['名称', '是', '否', '请输入', '标题', '必填', '成功'])
    assert.ok(
      scan.findings.some((finding) => finding.text === text),
      text
    )
  assert.deepEqual(scan.keys, ['common.save'])
  assert.ok(
    scan.findings.every(
      (finding) => !finding.text.includes('注释') && !finding.text.includes('erp:product')
    )
  )
})

test('scanner reports malformed templates instead of silently treating them as translated', () => {
  assert.ok(scanSource('<template><span></template>', 'invalid.vue').errors.length)
})

test('scanner includes JSX/TSX text and display attributes, including Vue script blocks', () => {
  const code = `const view = () => <button title="标题">保存 {valid ? '是' : '否'} {t('common.save')}</button>`
  for (const [source, filename] of [
    [code, 'view.tsx'],
    [`<script lang="tsx">${code}</script>`, 'view.vue']
  ]) {
    const scan = scanSource(source, filename)
    for (const text of ['标题', '保存', '是', '否'])
      assert.ok(
        scan.findings.some((finding) => finding.text === text),
        `${filename}: ${text}`
      )
    assert.deepEqual(scan.keys, ['common.save'])
    assert.ok(!scan.findings.some((finding) => finding.text === 'common.save'))
  }
})
