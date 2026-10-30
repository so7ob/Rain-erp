import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createI18n } from 'vue-i18n'
import { scanSource, readCatalogs } from './localization.mjs'
import { arabicPluralRule } from '../src/locales/policy.ts'

test('the complete user import dialog extracts display literals and every used key exists in all catalogs', () => {
  const path = 'views/system/user/UserImportForm.vue'
  const scanned = scanSource(fs.readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8'), path)
  assert.deepEqual(scanned.errors, [])
  assert.deepEqual(scanned.findings, [])
  const catalogs = readCatalogs(new URL('../src/locales/', import.meta.url))
  for (const key of scanned.keys) {
    for (const [locale, catalog] of Object.entries(catalogs)) {
      assert.ok(catalog.has(key), `Missing ${locale} import message: ${key}`)
    }
  }
})

test('import summaries cover all six Arabic count forms and client filenames match the server catalogs', () => {
  const catalogs = readCatalogs(new URL('../src/locales/', import.meta.url))
  const composer = createI18n({
    legacy: false,
    locale: 'ar',
    messages: { ar: Object.fromEntries(catalogs.ar) },
    pluralRules: { ar: arabicPluralRule }
  }).global
  for (const name of ['createdCount', 'updatedCount', 'failedCount']) {
    const key = `system.user.import.${name}`
    assert.equal(catalogs.ar.get(key).split('|').length, 6)
    const values = [0, 1, 2, 3, 11, 102].map((count) => composer.t(key, { count }, count))
    assert.equal(new Set(values).size, 6)
    assert.equal(values.some((value) => /[٠-٩۰-۹]/u.test(value)), false)
  }
  for (const [locale, suffix] of [['en', ''], ['ar', '_ar'], ['zh-CN', '_zh_CN']]) {
    const text = fs.readFileSync(new URL(`../../yudao-module-system/src/main/resources/i18n/system/messages${suffix}.properties`, import.meta.url), 'utf8')
    const server = new Map(text.split('\n').filter((line) => line.includes('=')).map((line) => {
      const separator = line.indexOf('=')
      return [line.slice(0, separator), line.slice(separator + 1)]
    }))
    for (const schema of ['import', 'export']) {
      const key = `system.user.${schema}.filename`
      assert.equal(catalogs[locale].get(key), server.get(key), `${locale} ${key}`)
    }
  }
})
