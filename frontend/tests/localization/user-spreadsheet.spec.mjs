import { test, expect } from 'playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { fixtureApi } from './fixtures.mjs'
import { waitForOverlaySettled } from './overlays.mjs'

const filename = 'قالب Test 00123.xls'
const file = {
  name: filename,
  mimeType: 'application/vnd.ms-excel',
  buffer: Buffer.from('synthetic-workbook-00123')
}
const result = {
  createUsernames: ['<img src=x onerror="window.rawNameExecuted=1"> عميل 00123'],
  updateUsernames: ['updated000123'],
  failureUsernames: { bad000123: 'القسم (Custom 00123) معطّل' }
}
const open = async (page) => {
  const base = process.env.RAIN_BROWSER_BASE_URL || 'http://127.0.0.1:4174'
  await page.goto(`${base}/tests/components/index.html`)
  await page.getByRole('button', { name: 'Open user import fixture' }).click()
  const dialog = page.getByRole('dialog', { name: 'استيراد المستخدمين', exact: true })
  await expect(dialog).toBeVisible()
  await waitForOverlaySettled(dialog)
  return dialog
}
const chooseLanguage = async (page, dialog, name) => {
  await dialog.getByRole('button', { name: /اختيار اللغة|Choose language|选择语言/ }).click()
  await page.getByRole('menuitem', { name, exact: true }).click()
}

for (const width of [375, 1280]) {
  for (const dark of [false, true]) {
    test(`user import and literal mixed-text results pass axe at ${width}px, ${dark ? 'dark' : 'light'}`, async ({
      page
    }, testInfo) => {
      await page.emulateMedia({ colorScheme: dark ? 'dark' : 'light' })
      await page.setViewportSize({ width, height: 900 })
      await fixtureApi(page, true)
      let upload
      let attempts = 0
      await page.route('**/admin-api/system/user/import?*', async (route) => {
        upload = route.request()
        attempts++
        await route.fulfill({
          json:
            attempts === 1
              ? {
                  code: 400,
                  msg: 'التسمية غير صالحة للاختبار',
                  messageKey: 'excel.import.unknownDictionary'
                }
              : { code: 0, data: result }
        })
      })
      const dialog = await open(page)
      await page.locator('input[type=file]').setInputFiles(file)
      await dialog.getByRole('checkbox', { name: 'تحديث المستخدمين الموجودين' }).press('Space')
      await expect(dialog.getByText(filename, { exact: true })).toBeVisible()
      const box = await dialog.boundingBox()
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1)
      expect((await new AxeBuilder({ page }).include('.el-dialog').analyze()).violations).toEqual(
        []
      )
      await dialog.getByRole('button', { name: 'تأكيد', exact: true }).click()
      await expect(dialog.getByRole('alert')).toContainText('تعذّر الاستيراد')
      await expect(dialog.getByRole('checkbox')).toBeChecked()
      expect(
        (await new AxeBuilder({ page }).include('.el-dialog').include('.el-notification').analyze())
          .violations
      ).toEqual([])
      await page.locator('input[type=file]').setInputFiles(file)
      await dialog.getByRole('button', { name: 'تأكيد', exact: true }).click()
      const output = page.getByRole('dialog', { name: 'نتائج استيراد المستخدمين' })
      await expect(output).toBeVisible()
      await waitForOverlaySettled(output)
      expect(upload.headers()['accept-language']).toBe('ar')
      expect(attempts).toBe(2)
      expect(new URL(upload.url()).searchParams.get('updateSupport')).toBe('true')
      expect(upload.postDataBuffer().toString()).toContain('synthetic-workbook-00123')
      await expect(output.getByText(result.createUsernames[0], { exact: true })).toBeVisible()
      await expect(output.getByRole('heading', { name: 'أُنشئ مستخدم واحد' })).toBeVisible()
      await expect(output.getByRole('heading', { name: 'حُدّث مستخدم واحد' })).toBeVisible()
      await expect(output.locator('bdi')).toHaveCount(4)
      expect(await page.evaluate(() => window.rawNameExecuted)).toBeUndefined()
      expect(await output.locator('img').count()).toBe(0)
      expect((await new AxeBuilder({ page }).include('.el-dialog').analyze()).violations).toEqual(
        []
      )
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      )
      await page.screenshot({
        path: testInfo.outputPath('user-import-results.png'),
        fullPage: true
      })
      await expect(page.getByLabel('Fixture user imports', { exact: true })).toHaveText('1')
    })
  }
}

test('language switching keeps the selected file and checkbox and downloads a template with the chosen filename', async ({
  page
}) => {
  await fixtureApi(page, true)
  let language
  await page.route('**/admin-api/system/user/get-import-template', async (route) => {
    language = route.request().headers()['accept-language']
    await route.fulfill({
      contentType: 'application/vnd.ms-excel',
      body: Buffer.from('synthetic-template')
    })
  })
  let dialog = await open(page)
  await page.locator('input[type=file]').setInputFiles(file)
  await dialog.getByRole('checkbox').press('Space')
  await chooseLanguage(page, dialog, 'English')
  dialog = page.getByRole('dialog', { name: 'Import users', exact: true })
  await expect(dialog.getByRole('checkbox', { name: 'Update existing users' })).toBeChecked()
  await expect(dialog.getByText(filename, { exact: true })).toBeVisible()
  const downloading = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Download template' }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe('User import template.xls')
  expect(language).toBe('en')
  await chooseLanguage(page, dialog, '简体中文')
  dialog = page.getByRole('dialog', { name: '用户导入', exact: true })
  await expect(dialog.getByRole('checkbox', { name: '更新已经存在的用户数据' })).toBeChecked()
  await expect(dialog.getByText(filename, { exact: true })).toBeVisible()
  await chooseLanguage(page, dialog, 'العربية')
  await expect(page.getByRole('dialog', { name: 'استيراد المستخدمين', exact: true })).toBeVisible()
})

test('a multipart import refreshes its session once without closing either tab or losing the body', async ({
  page,
  context
}) => {
  await fixtureApi(page, true)
  let count = 0
  let refreshes = 0
  const bodies = []
  await page.route('**/admin-api/system/user/import?*', async (route) => {
    count++
    bodies.push(route.request().postDataBuffer().toString())
    await route.fulfill({
      json:
        count === 1
          ? { code: 401, msg: 'Fixture expired', messageKey: 'common.error.unauthorized' }
          : { code: 0, data: result }
    })
  })
  await page.route('**/admin-api/system/auth/refresh-token?*', async (route) => {
    refreshes++
    await route.fulfill({
      json: {
        code: 0,
        data: { accessToken: 'fixture-renewed-access', refreshToken: 'fixture-renewed-refresh' }
      }
    })
  })
  const first = await open(page)
  const other = await context.newPage()
  await fixtureApi(other, true)
  const second = await open(other)
  await other.locator('input[type=file]').setInputFiles(file)
  await second.getByRole('checkbox').press('Space')
  await page.locator('input[type=file]').setInputFiles(file)
  await first.getByRole('button', { name: 'تأكيد', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'نتائج استيراد المستخدمين' })).toBeVisible()
  await expect(second).toBeVisible()
  await expect(second.getByText(filename, { exact: true })).toBeVisible()
  await expect(second.getByRole('checkbox')).toBeChecked()
  expect(count).toBe(2)
  expect(refreshes).toBe(1)
  expect(bodies.every((body) => body.includes('synthetic-workbook-00123'))).toBe(true)
  const receipt = await page.evaluate(() => localStorage.getItem('rain.auth.credential-update'))
  expect(receipt).not.toContain('fixture-renewed')
})

test('import validates the required file and format, keeps one file and supports keyboard removal', async ({
  page
}) => {
  await fixtureApi(page, true)
  let uploads = 0
  await page.route('**/admin-api/system/user/import?*', async (route) => {
    uploads++
    await route.fulfill({ json: { code: 0, data: result } })
  })
  const dialog = await open(page)
  await dialog.getByRole('button', { name: 'تأكيد', exact: true }).click()
  await expect(page.getByText('اختر ملفًا للاستيراد', { exact: true })).toBeVisible()
  await page.locator('input[type=file]').setInputFiles({ ...file, name: 'invalid.txt' })
  await dialog.getByRole('button', { name: 'تأكيد', exact: true }).click()
  await expect(dialog.getByText('invalid.txt', { exact: true })).toHaveCount(0)
  expect(uploads).toBe(0)
  await page.locator('input[type=file]').setInputFiles(file)
  await page.locator('input[type=file]').setInputFiles({ ...file, name: 'second.xls' })
  await expect(page.getByText('اختر ملفًا واحدًا في كل مرة', { exact: true })).toBeVisible()
  await expect(dialog.getByText(filename, { exact: true })).toBeVisible()
  await expect(dialog.getByText('second.xls', { exact: true })).toHaveCount(0)
  await dialog.getByRole('button', { name: `إزالة ${filename}` }).press('Enter')
  await expect(dialog.getByText(filename, { exact: true })).toHaveCount(0)
  expect(uploads).toBe(0)
})

for (const change of ['tenant', 'visit', 'user']) {
  test(`an in-flight import cannot expose previous ${change} results`, async ({ page }) => {
    await fixtureApi(page, true)
    let release
    let started
    const pending = new Promise((resolve) => {
      release = resolve
    })
    const requested = new Promise((resolve) => {
      started = resolve
    })
    await page.route('**/admin-api/system/user/import?*', async (route) => {
      started()
      await pending
      await route.fulfill({ json: { code: 0, data: result } })
    })
    const dialog = await open(page)
    await page.locator('input[type=file]').setInputFiles(file)
    await dialog.getByRole('button', { name: 'تأكيد', exact: true }).click()
    await requested
    await page.evaluate(async (changed) => {
      const auth = await import('/src/utils/auth.ts')
      if (changed === 'tenant') auth.setTenantId(2)
      else if (changed === 'visit') auth.setVisitTenantId(2)
      else
        auth.setToken({
          accessToken: 'fixture-other-access',
          refreshToken: 'fixture-other-refresh'
        })
    }, change)
    await expect(dialog).not.toBeVisible()
    release()
    await expect(page.getByRole('dialog', { name: 'نتائج استيراد المستخدمين' })).not.toBeVisible()
    await expect(page.getByLabel('Fixture user imports', { exact: true })).toHaveText('0')
    await expect(page.getByText(result.createUsernames[0], { exact: true })).toHaveCount(0)
  })
}
