import { test, expect } from 'playwright/test'
import AxeBuilder from '@axe-core/playwright'
import defaults from '../../src/locales/defaults/core.json' with { type: 'json' }
import { fixtureApi, profile } from './fixtures.mjs'

const record = (id) => {
  const { key, ...source } = defaults.menus.find((item) => item.id === id)
  return { ...source, parentId: id === 1 ? 0 : 1, visible: true, keepAlive: true, alwaysShow: true }
}
const menus = [{ ...record(1), children: [record(4), record(5)] }]
const dictionary = defaults.dictionaries.map(({ key, literalReason, parameters, ...source }) => ({
  ...source,
  colorType: 'primary',
  cssClass: ''
}))

async function setup(page, menuSource = menus) {
  await fixtureApi(page, true)
  const requests = []
  await page.route('**/auth/get-permission-info', async (route) => {
    requests.push({
      kind: 'menus',
      language: route.request().headers()['accept-language'],
      tenant: route.request().headers()['tenant-id']
    })
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        code: 0,
        data: {
          user: route.request().headers().authorization?.includes('different-fixture')
            ? { ...profile, id: 2, nickname: 'Second fixture user' }
            : profile,
          roles: ['admin'],
          permissions: ['*:*:*'],
          menus: typeof menuSource === 'function' ? menuSource(route.request()) : menuSource
        }
      })
    })
  })
  await page.route('**/dict-data/simple-list', async (route) => {
    requests.push({
      kind: 'dictionary',
      language: route.request().headers()['accept-language'],
      tenant: route.request().headers()['tenant-id']
    })
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, data: dictionary })
    })
  })
  await page.route('**/system/user/page**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, data: { list: [], total: 0 } })
    })
  )
  return requests
}

async function language(page, name, locale) {
  await page.getByRole('button', { name: /اختيار اللغة|Choose language|选择语言/ }).click()
  await page.getByRole('menuitem', { name, exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', locale)
}

test('core titles and dictionary labels switch languages while query drafts and raw labels survive', async ({
  page
}) => {
  const requests = await setup(page)
  await page.goto('/system/user')
  await expect(page).toHaveTitle(/المستخدمون/)
  const username = page.locator('input[placeholder="请输入用户名称"]:visible')
  await username.fill('عميل Test 00123')
  const status = page
    .locator('.el-form-item')
    .filter({ has: page.locator('.el-form-item__label').filter({ hasText: /^状态$/ }) })
    .locator('.el-select')
  await status.click()
  await page.getByRole('option', { name: 'مفعّل', exact: true }).click()
  for (const [name, locale, title, label] of [
    ['English', 'en', 'Users', 'Enabled'],
    ['简体中文', 'zh-CN', '用户管理', '开启'],
    ['العربية', 'ar', 'المستخدمون', 'مفعّل']
  ]) {
    await language(page, name, locale)
    await expect(page).toHaveTitle(new RegExp(title))
    await expect(page.locator('.v-breadcrumb')).toContainText(title)
    await expect(page.locator('.v-tags-view')).toContainText(title)
    await expect(status).toContainText(label)
    await expect(username).toHaveValue('عميل Test 00123')
    await expect
      .poll(
        () =>
          requests.filter((request) => request.kind === 'dictionary' && request.language === locale)
            .length
      )
      .toBeGreaterThan(0)
  }
  const cache = await page.evaluate(() =>
    Object.entries(sessionStorage).filter(([key]) => key.startsWith('rain.display.cache.v1:'))
  )
  expect(cache.length).toBeGreaterThanOrEqual(3)
  expect(cache.every(([key]) => !key.includes('localization-fixture'))).toBe(true)
  expect(cache.some(([, value]) => value.includes('开启'))).toBe(true)
})

for (const layout of [
  'classic',
  'topLeft',
  'top',
  'cutMenu',
  'header-mixed-nav',
  'header-nav',
  'header-sidebar-nav',
  'mixed-nav',
  'sidebar-mixed-nav',
  'sidebar-nav'
]) {
  test(`core route titles remain translated in ${layout} navigation`, async ({ page }) => {
    await setup(page)
    await page.addInitScript(
      ({ layout }) => {
        localStorage.setItem(
          'layout',
          JSON.stringify({ c: Date.now(), e: Date.now() + 3_600_000, v: JSON.stringify(layout) })
        )
      },
      { layout }
    )
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/system/user')
    await expect(page).toHaveTitle(/المستخدمون/)
    await expect(
      page
        .locator('.v-menu__title, .v-tab-menu p')
        .filter({ hasText: /^إدارة النظام$/ })
        .first()
    ).toBeVisible()
    await page.keyboard.press('Control+k')
    const dialog = page.getByRole('dialog', { name: 'البحث في القوائم', exact: true })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('combobox').fill('المستخدمون')
    await expect(page.getByRole('option', { name: /المستخدمون.*\/system\/user/ })).toBeVisible()
  })
}

for (const width of [375, 1280])
  for (const dark of [false, true]) {
    test(`menu search preserves custom names at ${width}, ${dark ? 'dark' : 'light'}`, async ({
      page
    }) => {
      await page.emulateMedia({ colorScheme: dark ? 'dark' : 'light' })
      await page.setViewportSize({ width, height: 900 })
      await setup(page, [
        { ...record(1), children: [record(4), { ...record(5), name: 'common.save' }] }
      ])
      await page.goto('/user/profile')
      await expect(page.locator('.profile-layout')).toBeVisible()
      await page.keyboard.press('Control+k')
      const dialog = page.getByRole('dialog', { name: 'البحث في القوائم', exact: true })
      await expect(dialog).toBeVisible()
      await dialog.getByRole('combobox').fill('common.save')
      await expect(page.getByRole('option', { name: /common\.save.*\/system\/role/ })).toBeVisible()
      const result = await new AxeBuilder({ page }).include('.el-dialog').analyze()
      expect(result.violations).toEqual([])
      const box = await dialog.boundingBox()
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(width)
    })
  }

test('late dictionary responses cannot replace the selected language context', async ({ page }) => {
  await setup(page)
  let release
  const held = new Promise((resolve) => {
    release = resolve
  })
  let english = false
  await page.route('**/dict-data/simple-list', async (route) => {
    const locale = route.request().headers()['accept-language']
    if (locale === 'ar') await held
    else english = true
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        code: 0,
        data: [
          {
            dictType: 'common_status',
            value: '0',
            label: locale === 'ar' ? 'stale-label' : 'current-label',
            colorType: 'primary',
            cssClass: ''
          }
        ]
      })
    })
  })
  await page.goto('/system/user')
  await language(page, 'English', 'en')
  await expect.poll(() => english).toBe(true)
  release()
  const status = page
    .locator('.el-form-item')
    .filter({ has: page.locator('.el-form-item__label').filter({ hasText: /^状态$/ }) })
    .locator('.el-select')
  await status.click()
  await expect(page.getByRole('option', { name: 'current-label', exact: true })).toBeVisible()
  await expect(page.getByRole('option', { name: 'stale-label', exact: true })).toHaveCount(0)
})

test('user and tenant changes isolate menu, visited-tab and dictionary cache state', async ({
  page
}) => {
  const requests = await setup(page, (request) => [
    {
      ...record(1),
      children: [
        {
          ...record(4),
          name: request.headers()['tenant-id'] === '2' ? 'Second tenant menu' : 'First tenant menu'
        }
      ]
    }
  ])
  await page.addInitScript(() => {
    // Exercise the HTTP-origin capability set, where randomUUID may be unavailable.
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true })
    if (!sessionStorage.getItem('context-fixture-initialized')) {
      sessionStorage.setItem('context-fixture-initialized', 'true')
      const saved = (value) =>
        JSON.stringify({ c: Date.now(), e: Date.now() + 3_600_000, v: JSON.stringify(value) })
      localStorage.setItem('tenantId', saved(1))
      localStorage.setItem(
        'user',
        saved({ user: { id: 9999, nickname: 'Legacy wrong user' }, menus: [] })
      )
      sessionStorage.setItem(
        'dictCache',
        saved({ common_status: [{ value: '0', label: 'Legacy wrong dictionary' }] })
      )
    }
  })
  await page.goto('/system/user')
  await expect(page).toHaveTitle(/First tenant menu/)
  await page
    .locator('.el-form-item')
    .filter({ has: page.locator('.el-form-item__label').filter({ hasText: /^状态$/ }) })
    .locator('.el-select')
    .click()
  await expect(page.getByRole('option', { name: 'مفعّل', exact: true })).toBeVisible()
  await expect(page.getByText('Legacy wrong dictionary', { exact: true })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await page.keyboard.press('Control+k')
  const search = page.getByRole('dialog', { name: 'البحث في القوائم', exact: true })
  await expect(search).toBeVisible()
  await search.getByRole('combobox').fill('/system/user')
  await expect(
    page.getByRole('option', { name: /First tenant menu.*\/system\/user/ })
  ).toBeVisible()
  await page.evaluate(() => {
    const saved = (value) =>
      JSON.stringify({ c: Date.now(), e: Date.now() + 3_600_000, v: JSON.stringify(value) })
    localStorage.setItem('tenantId', saved(2))
    localStorage.setItem('ACCESS_TOKEN', saved('different-fixture-user-access'))
    localStorage.setItem('REFRESH_TOKEN', saved('different-fixture-user-refresh'))
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'tenantId', storageArea: localStorage })
    )
  })
  await expect(page.getByText('First tenant menu', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('option', { name: /First tenant menu.*\/system\/user/ })).toHaveCount(
    0
  )
  await expect(page).not.toHaveTitle(/First tenant menu/)
  await page.goto('/system/user')
  await expect(page).toHaveTitle(/Second tenant menu/)
  await expect(page.getByText('First tenant menu', { exact: true })).toHaveCount(0)
  expect(requests.some((request) => request.kind === 'menus' && request.tenant === '2')).toBe(true)
  const cache = await page.evaluate(() => ({
    keys: Object.keys(localStorage).filter((key) => key.startsWith('rain.auth.cache.v1:')),
    values: Object.entries(localStorage)
      .filter(([key]) => key.startsWith('rain.auth.cache.v1:'))
      .map(([, value]) => value)
  }))
  expect(cache.keys.length).toBeGreaterThanOrEqual(4)
  expect(cache.keys.every((key) => !key.includes('fixture-user'))).toBe(true)
  expect(cache.values.some((value) => value.includes('Second fixture user'))).toBe(true)
  expect(cache.values.every((value) => !value.includes('Legacy wrong user'))).toBe(true)
})
