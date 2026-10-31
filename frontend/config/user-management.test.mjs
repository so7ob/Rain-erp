import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { scanSource, readCatalogs } from './localization.mjs'
import { createScopedTask } from '../src/utils/scopedTask.ts'
import { adaptElementPlusLocale } from '../src/locales/elementPlusAdapter.ts'
import ar from 'element-plus/es/locale/lang/ar.mjs'
import en from 'element-plus/es/locale/lang/en.mjs'
import zh from 'element-plus/es/locale/lang/zh-cn.mjs'

test('user management and shared selector/help controls keep all owned display text extracted', () => {
  const catalogs = readCatalogs(new URL('../src/locales/', import.meta.url))
  for (const path of [
    'views/system/user/index.vue',
    'views/system/user/UserForm.vue',
    'views/system/user/UserAssignRoleForm.vue',
    'views/system/user/UserActionDialog.vue',
    'views/system/user/components/UserSelect.vue',
    'views/system/user/components/UserSelectV2.vue',
    'views/system/user/components/UserSelectDialogV2.vue',
    'views/system/dept/components/DeptTreeSelect.vue',
    'components/DocAlert/index.vue'
  ]) {
    const scanned = scanSource(
      fs.readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8'),
      path
    )
    assert.deepEqual(scanned.errors, [], path)
    assert.deepEqual(scanned.findings, [], path)
    for (const key of scanned.keys)
      for (const [locale, catalog] of Object.entries(catalogs)) {
        assert.ok(catalog.has(key), `${path}: missing ${locale} ${key}`)
      }
  }
})

test('scoped operations reject older work, a changed tenant/login and disposed owners', () => {
  let context = 'login-a:tenant-1:visit-none'
  const task = createScopedTask(() => context)
  const first = task.begin()
  const independent = task.capture()
  const latest = task.begin()
  assert.equal(first(), false)
  assert.equal(latest(), true)
  assert.equal(independent(), true)
  context = 'login-a:tenant-2:visit-none'
  assert.equal(latest(), false)
  assert.equal(independent(), false)
  const next = task.begin()
  const captured = task.capture()
  task.invalidate()
  assert.equal(next(), false)
  assert.equal(captured(), false)
  const last = task.begin()
  task.dispose()
  assert.equal(last(), false)
})

test('library additions translate the reached controls without mutating native locale definitions', () => {
  for (const [language, base] of [
    ['ar', ar],
    ['en', en],
    ['zh-CN', zh]
  ]) {
    const original = structuredClone(base)
    const additions = JSON.parse(
      fs.readFileSync(new URL(`../src/locales/${language}/element-plus.json`, import.meta.url))
    ).common.elementPlus
    const adapted = adaptElementPlusLocale(base, additions)
    assert.deepEqual(base, original)
    assert.equal(adapted.name, base.name)
    assert.equal(adapted.el.datepicker.today, base.el.datepicker.today)
    if (language !== 'ar') assert.deepEqual(adapted, base)
    else {
      const visit = (object) => {
        for (const value of Object.values(object)) {
          if (typeof value === 'object') visit(value)
          else
            assert.equal(
              /[A-Za-z]/.test(value.replace(/\{[^}]*\}|el-pagination/g, '')),
              false,
              value
            )
        }
      }
      for (const section of ['table', 'tag', 'datepicker', 'pagination']) visit(adapted.el[section])
    }
  }
})
