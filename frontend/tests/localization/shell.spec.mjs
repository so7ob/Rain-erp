import { test, expect } from 'playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { fixtureApi } from './fixtures.mjs'
import { waitForFixtureSelection } from './overlays.mjs'

const countLocaleWrites = () => {
  window.__localeWrites = 0
  const original = Storage.prototype.setItem
  Storage.prototype.setItem = function (key, value) {
    if (key === 'lang') window.__localeWrites++
    return original.call(this, key, value)
  }
}

const changeLanguage = async (scope, page, name) => {
  await scope.getByRole('button', { name: /اختيار اللغة|Choose language|选择语言/ }).click()
  await page.getByRole('menuitem', { name, exact: true }).click()
}

test('locale changes synchronize across tabs without losing profile drafts', async ({
  page,
  context
}) => {
  await page.addInitScript(countLocaleWrites)
  const requests = await fixtureApi(page, true)
  const other = await context.newPage()
  await other.addInitScript(countLocaleWrites)
  await fixtureApi(other, true)
  await page.goto('/user/profile')
  await expect(page.getByLabel('الاسم المعروض', { exact: false })).toBeVisible()
  await page.getByLabel('الاسم المعروض', { exact: false }).fill('Cross-tab draft 00123')
  await other.goto('/user/profile')
  await changeLanguage(other, other, 'English')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByLabel('Nick Name', { exact: false })).toHaveValue('Cross-tab draft 00123')
  await changeLanguage(page, page, '简体中文')
  await expect(other.locator('html')).toHaveAttribute('lang', 'zh-CN')
  await expect(page.getByLabel('用户昵称', { exact: false })).toHaveValue('Cross-tab draft 00123')
  await expect
    .poll(() => requests.filter((request) => request.language === 'zh-CN').length)
    .toBeGreaterThan(0)
  expect(await page.evaluate(() => window.__localeWrites)).toBe(1)
  expect(await other.evaluate(() => window.__localeWrites)).toBe(1)
})

test('a tab booting with delayed catalogs cannot overwrite a newer language preference', async ({
  page,
  context
}) => {
  await fixtureApi(page, true)
  await page.goto('/user/profile')
  await expect(page.getByLabel('الاسم المعروض', { exact: false })).toBeVisible()
  const other = await context.newPage()
  await fixtureApi(other, true)
  let release
  let started
  const held = new Promise((resolve) => {
    release = resolve
  })
  const catalogStarted = new Promise((resolve) => {
    started = resolve
  })
  await other.route(
    /\/src\/locales\/(?:ar|en|zh-CN)\/.*\.json|\/assets\/shared-[^/]+\.js/,
    async (route) => {
      started()
      await held
      await route.continue()
    }
  )
  const navigation = other.goto('/user/profile')
  await catalogStarted
  await changeLanguage(page, page, 'English')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  release()
  await navigation
  await expect(other.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

for (const width of [375, 1280]) {
  for (const dark of [false, true]) {
    test(`settings controls and open drawer localize with keyboard at ${width}px, ${dark ? 'dark' : 'light'}`, async ({
      page
    }, testInfo) => {
      await page.emulateMedia({ colorScheme: dark ? 'dark' : 'light' })
      await page.setViewportSize({ width, height: 900 })
      await fixtureApi(page, true)
      await page.goto('/user/profile')
      const settings = page.getByRole('button', { name: 'إعدادات النظام', exact: true })
      await settings.focus()
      await page.keyboard.press('Enter')
      const drawer = page.locator('.rain-settings')
      await expect(drawer).toBeVisible()
      await changeLanguage(drawer, page, 'English')
      await expect(drawer.getByText('Layout', { exact: true })).toBeVisible()
      await expect(drawer.getByRole('switch').first()).toHaveAccessibleName(/.+/)
      await expect(drawer.getByRole('button', { name: /Color #/ }).first()).toBeVisible()
      const green = drawer.getByRole('button', { name: 'Color #009688', exact: true }).first()
      await green.focus()
      await page.keyboard.press('Space')
      await expect(green).toHaveAttribute('aria-pressed', 'true')
      await changeLanguage(drawer, page, 'العربية')
      const box = await drawer.boundingBox()
      expect(box.x).toBeGreaterThanOrEqual(-1)
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1)
      const results = await new AxeBuilder({ page }).include('.rain-settings').analyze()
      expect(results.violations).toEqual([])
      await drawer
        .getByRole('button', { name: 'نسخ الإعدادات', exact: true })
        .scrollIntoViewIfNeeded()
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
      await drawer.getByRole('button', { name: 'نسخ الإعدادات', exact: true }).click()
      const configuration = await page.evaluate(() => navigator.clipboard.readText())
      expect(configuration).toMatch(/elColorPrimary: '#009688'/)
      expect(configuration).toContain('قائمة التنقل')
      expect(configuration).not.toMatch(/\p{Script=Han}/u)
      const lower = await new AxeBuilder({ page }).include('.rain-settings').analyze()
      expect(lower.violations).toEqual([])
      await page.screenshot({ path: testInfo.outputPath('settings.png'), fullPage: true })
    })
  }
}

test('isolated selection component keeps raw records and responds to pagination and locale changes', async ({
  page
}) => {
  await fixtureApi(page, true)
  const base = process.env.RAIN_BROWSER_BASE_URL || 'http://127.0.0.1:4174'
  await page.goto(`${base}/tests/components/index.html`)
  await page.getByRole('button', { name: 'Open selection fixture' }).click()
  const dialog = page.locator('.com-dialog')
  await expect(dialog.getByText('عميل Test 001')).toBeVisible()
  await waitForFixtureSelection(page, dialog)
  await dialog.getByRole('button', { name: /Go to next page|الصفحة التالية|Next page/ }).click()
  await expect(dialog.getByText('عميل Test 002')).toBeVisible()
  await dialog.locator('.el-checkbox').last().click()
  await changeLanguage(dialog, page, 'English')
  await expect(page.getByRole('dialog', { name: 'Select records', exact: true })).toBeVisible()
  await expect(dialog.getByRole('combobox', { name: 'Rows per page', exact: true })).toBeVisible()
  await expect(dialog.getByRole('spinbutton', { name: 'Page number', exact: true })).toBeVisible()
  await expect(dialog.getByRole('checkbox').last()).toBeChecked()
  await dialog.getByRole('button', { name: 'OK', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: "Sorry, you don't have permission to access this page." })
  ).toBeVisible()
  await expect(page.getByLabel('Fixture selection', { exact: true })).toHaveText(
    '[{"id":2,"name":"عميل Test 002"}]'
  )
  await expect(page.getByLabel('Fixture requested pages')).toHaveText('[1,2]')
  await page.getByLabel('Fixture title').fill('common.save')
  await page.getByRole('button', { name: 'Open selection fixture' }).click()
  await expect(page.getByRole('dialog', { name: 'common.save', exact: true })).toBeVisible()
  await expect(dialog.getByRole('checkbox').last()).not.toBeChecked()
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByLabel('Fixture selection', { exact: true })).toHaveText(
    '[{"id":2,"name":"عميل Test 002"}]'
  )
})

for (const width of [375, 1280]) {
  for (const dark of [false, true]) {
    test(`lock dialog keyboard, validation and drafts at ${width}px, ${dark ? 'dark' : 'light'}`, async ({
      page
    }) => {
      await page.emulateMedia({ colorScheme: dark ? 'dark' : 'light' })
      await page.setViewportSize({ width, height: 900 })
      await fixtureApi(page, true)
      await page.goto('/user/profile')
      await page.getByRole('button', { name: 'قائمة المستخدم', exact: true }).focus()
      await page.keyboard.press('Enter')
      const item = page.getByRole('menuitem', { name: 'قفل الشاشة', exact: true })
      await item.focus()
      await page.keyboard.press('Enter')
      const dialog = page.locator('.v-lock-dialog')
      await expect(dialog).toBeVisible()
      await dialog.getByRole('button', { name: 'قفل', exact: true }).click()
      await expect(dialog.getByText('هذا الحقل مطلوب')).toBeVisible()
      const checked = await new AxeBuilder({ page }).include('.v-lock-dialog').analyze()
      expect(checked.violations).toEqual([])
      await changeLanguage(dialog, page, 'English')
      await expect(dialog.getByText('This is required')).toBeVisible()
      await dialog.getByLabel('Lock screen password', { exact: true }).fill('Fixture-Draft-00123')
      await changeLanguage(dialog, page, 'العربية')
      await expect(dialog.getByLabel('كلمة مرور القفل', { exact: true })).toHaveValue(
        'Fixture-Draft-00123'
      )
      const maximize = dialog.getByRole('button', { name: 'عرض بملء الشاشة', exact: true })
      await maximize.focus()
      await page.keyboard.press('Enter')
      await expect(
        dialog.getByRole('button', { name: 'إنهاء ملء الشاشة', exact: true })
      ).toHaveAttribute('aria-pressed', 'true')
      await expect.poll(async () => Math.round((await dialog.boundingBox()).width)).toBe(width)
      await dialog.getByRole('button', { name: 'إغلاق', exact: true }).click()
      await expect(dialog).not.toBeVisible()
    })
  }
}

const fulfill = (route, data) => route.fulfill({ json: { code: 0, data } })

test('tenant visit keeps original names and sends the selected identifier', async ({ page }) => {
  const requests = await fixtureApi(page, true)
  await page.route('**/system/tenant/simple-list', (route) =>
    fulfill(route, [{ id: 7, name: 'منشأة Test 00123' }])
  )
  await page.goto('/user/profile')
  await page.getByRole('combobox', { name: 'اختر منشأة', exact: true }).focus()
  await page.keyboard.press('ArrowDown')
  await page.getByRole('option', { name: 'منشأة Test 00123', exact: true }).click()
  await expect(
    page.getByText('المنشأة المزارة الآن: منشأة Test 00123', { exact: true })
  ).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() => {
        const stored = JSON.parse(localStorage.getItem('visitTenantId'))
        return JSON.parse(stored.v)
      })
    )
    .toBe(7)
  const selector = page
    .locator('.el-select')
    .filter({ has: page.getByRole('combobox', { name: 'اختر منشأة', exact: true }) })
  await expect(selector.getByText('منشأة Test 00123', { exact: true })).toBeVisible()
  expect(requests.filter((request) => request.method !== 'GET')).toEqual([])
})

for (const changed of ['REFRESH_TOKEN', 'tenantId', 'visitTenantId']) {
  test(`notification responses cannot restore the previous ${changed} context`, async ({
    page,
    context
  }) => {
    await fixtureApi(page, true)
    await page.route('**/notify-message/get-unread-count', (route) => fulfill(route, 11))
    let release
    let started
    const held = new Promise((resolve) => {
      release = resolve
    })
    const begun = new Promise((resolve) => {
      started = resolve
    })
    await page.route('**/notify-message/get-unread-list', async (route) => {
      started()
      await held
      await fulfill(route, [
        {
          id: 9,
          templateNickname: 'Old scope',
          templateContent: 'stale secret 00123',
          createTime: '2026-01-01T12:00:00'
        }
      ])
    })
    await page.goto('/user/profile')
    const button = page.getByRole('button', { name: '11 إشعارًا غير مقروء', exact: true })
    await button.focus()
    await page.keyboard.press('Enter')
    await begun
    const other = await context.newPage()
    await fixtureApi(other, true)
    await other.goto('/user/profile')
    await other.evaluate((key) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          c: Date.now(),
          e: Date.now() + 3600000,
          v: JSON.stringify(key === 'REFRESH_TOKEN' ? 'fixture-refresh-B' : 7)
        })
      )
    }, changed)
    await expect(page.locator('.rain-notifications')).not.toBeVisible()
    release()
    await expect(
      page.getByRole('button', { name: '11 إشعارًا غير مقروء', exact: true })
    ).toBeVisible()
    await expect(page.getByText('stale secret 00123', { exact: true })).toHaveCount(0)
  })
}

for (const width of [375, 1280]) {
  for (const dark of [false, true]) {
    test(`isolated shared selection and error content has no axe violations at ${width}px, ${dark ? 'dark' : 'light'}`, async ({
      page
    }, testInfo) => {
      await page.emulateMedia({ colorScheme: dark ? 'dark' : 'light' })
      await page.setViewportSize({ width, height: 900 })
      await fixtureApi(page, true)
      const base = process.env.RAIN_BROWSER_BASE_URL || 'http://127.0.0.1:4174'
      await page.goto(`${base}/tests/components/index.html`)
      await expect(page.locator('html')).toHaveClass(dark ? /dark/ : /^(?!.*\bdark\b)/)
      await expect(page.locator('.rain-error h1')).toContainText('صلاحية')
      const error = await new AxeBuilder({ page }).include('.rain-error').analyze()
      expect(error.violations).toEqual([])
      await page.getByRole('button', { name: 'Open selection fixture' }).click()
      const dialog = page.locator('.rain-table-select')
      await expect(dialog.getByText('عميل Test 001')).toBeVisible()
      await waitForFixtureSelection(page, dialog)
      const box = await dialog.boundingBox()
      expect(box.x).toBeGreaterThanOrEqual(-1)
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1)
      const result = await new AxeBuilder({ page }).include('.rain-table-select').analyze()
      expect(result.violations).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      )
      await page.screenshot({ path: testInfo.outputPath('selection.png'), fullPage: true })
    })
  }
}

for (const width of [375, 1280]) {
  for (const dark of [false, true]) {
    test(`notification popover preserves mixed content and fits at ${width}px, ${dark ? 'dark' : 'light'}`, async ({
      page
    }, testInfo) => {
      await page.emulateMedia({ colorScheme: dark ? 'dark' : 'light' })
      await page.setViewportSize({ width, height: 900 })
      await fixtureApi(page, true)
      await page.route('**/notify-message/get-unread-count', (route) => fulfill(route, 3))
      await page.route('**/notify-message/get-unread-list', (route) =>
        fulfill(route, [
          {
            id: 8,
            templateNickname: 'اسم Test 00123',
            templateContent: 'محتوى ABC 00456',
            createTime: '2026-01-01T12:00:00'
          }
        ])
      )
      await page.goto('/user/profile')
      await page.getByRole('button', { name: '3 إشعارات غير مقروءة', exact: true }).focus()
      await page.keyboard.press('Enter')
      const popover = page.locator('.rain-notifications')
      await expect(popover.getByText('محتوى ABC 00456', { exact: true })).toBeVisible()
      await expect(popover.locator('bdi')).toHaveText('اسم Test 00123')
      const box = await popover.boundingBox()
      expect(box.x).toBeGreaterThanOrEqual(-1)
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1)
      const result = await new AxeBuilder({ page }).include('.rain-notifications').analyze()
      expect(result.violations).toEqual([])
      await page.screenshot({ path: testInfo.outputPath('notifications.png'), fullPage: true })
    })
  }
}

test('navigation and browser fullscreen buttons expose their actual keyboard state', async ({
  page
}) => {
  await fixtureApi(page, true)
  await page.goto('/user/profile')
  await page.getByRole('button', { name: 'طي قائمة التنقل', exact: true }).focus()
  await page.keyboard.press('Space')
  await expect(
    page.getByRole('button', { name: 'توسيع قائمة التنقل', exact: true })
  ).toHaveAttribute('aria-expanded', 'false')
  await page.getByRole('button', { name: 'عرض بملء الشاشة', exact: true }).focus()
  await page.keyboard.press('Enter')
  const exit = page.getByRole('button', { name: 'إنهاء ملء الشاشة', exact: true })
  await expect(exit).toHaveAttribute('aria-pressed', 'true')
  await exit.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'عرض بملء الشاشة', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false'
  )
})
