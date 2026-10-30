import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { scanSource, readCatalogs } from './localization.mjs'
import {
  createLocaleSwitcher,
  arabicPluralRule,
  loadPreferredLocale
} from '../src/locales/policy.ts'
import { createI18n } from 'vue-i18n'

test('owned shell and overlay display literals stay extracted without broad exceptions', () => {
  const catalogs = readCatalogs(new URL('../src/locales/', import.meta.url))
  const paths = [
    'layout/components/Collapse/src/Collapse.vue',
    'layout/components/ToolHeader.vue',
    'layout/components/Screenfull/src/Screenfull.vue',
    'layout/components/Message/src/Message.vue',
    'layout/components/TenantVisit/index.vue',
    'layout/components/UserInfo/src/UserInfo.vue',
    'layout/components/UserInfo/src/components/LockDialog.vue',
    'layout/components/Setting/src/Setting.vue',
    'layout/components/Setting/src/components/ColorRadioPicker.vue',
    'layout/components/Setting/src/components/LayoutRadioPicker.vue',
    'layout/components/Setting/src/components/InterfaceDisplay.vue',
    'components/Error/src/Error.vue',
    'components/Dialog/src/Dialog.vue',
    'components/Table/src/TableSelectForm.vue',
    'components/Pagination/index.vue',
    'hooks/web/useValidator.ts'
  ]
  for (const path of paths) {
    const result = scanSource(
      fs.readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8'),
      path
    )
    assert.deepEqual(result.errors, [], path)
    assert.deepEqual(result.findings, [], path)
    for (const key of result.keys) {
      for (const [locale, catalog] of Object.entries(catalogs)) {
        assert.ok(catalog.has(key), `${path}: missing ${locale} key ${key}`)
      }
    }
  }
})

test('JSX scanning distinguishes technical attributes from nested display text and accessible names', () => {
  const result = scanSource(
    `const view = <div>{ready && <button class="custom-hover" style={{ color: 'var(--text)' }} icon={'ep:check'} aria-label={'Button name'} title="Hint" data-help="Unknown display candidate">{'Visible text'}</button>}</div>`,
    'example.tsx'
  )
  assert.deepEqual(result.errors, [])
  assert.deepEqual(
    result.findings.map((finding) => finding.text),
    ['Button name', 'Hint', 'Unknown display candidate', 'Visible text']
  )
})

test('notification announcements use all six Arabic counting forms and Latin digits', () => {
  const catalogs = readCatalogs(new URL('../src/locales/', import.meta.url))
  const i18n = createI18n({
    legacy: false,
    locale: 'ar',
    pluralRules: { ar: arabicPluralRule },
    messages: { ar: { notice: catalogs.ar.get('shell.unreadNotifications') } }
  })
  for (const [count, expected] of [
    [0, 'لا توجد إشعارات غير مقروءة'],
    [1, 'إشعار غير مقروء'],
    [2, 'إشعاران غير مقروءين'],
    [3, '3 إشعارات غير مقروءة'],
    [11, '11 إشعارًا غير مقروء'],
    [100, '100 إشعار غير مقروء']
  ])
    assert.equal(i18n.global.t('notice', { count }, count), expected)
})

test('an external preference cancels obsolete loads and retains its no-persist context', async () => {
  const waiting = new Map()
  const applied = []
  const switchLocale = createLocaleSwitcher(
    (locale) => new Promise((resolve) => waiting.set(locale, resolve)),
    (locale, messages, context) => applied.push({ locale, messages, context })
  )
  const local = switchLocale('en', { persist: true })
  const external = switchLocale('ar', { persist: false })
  waiting.get('ar')('Arabic')
  await external
  waiting.get('en')('English')
  await local
  assert.deepEqual(applied, [{ locale: 'ar', messages: 'Arabic', context: { persist: false } }])
})

test('startup rereads the preference after a delayed or obsolete failed import', async () => {
  for (const fail of [false, true]) {
    let preference = 'ar'
    let release
    const held = new Promise((resolve) => {
      release = resolve
    })
    const loaded = []
    const result = loadPreferredLocale(
      () => preference,
      async (locale) => {
        loaded.push(locale)
        if (locale === 'ar') {
          await held
          if (fail) throw new Error('obsolete offline catalog')
        }
        return locale + '-messages'
      }
    )
    preference = 'en'
    release()
    assert.deepEqual(await result, { locale: 'en', messages: 'en-messages' })
    assert.deepEqual(loaded, ['ar', 'en'])
  }
})
