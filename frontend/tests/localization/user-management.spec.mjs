import { test, expect } from 'playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { userFixtures, userFixtureUrl, chooseUserLanguage, sampleUser } from './user-fixtures.mjs'
import { waitForOverlaySettled } from './overlays.mjs'

test('user create/edit validation follows language changes and retains the original model', async ({
  page
}) => {
  const { requests } = await userFixtures(page)
  await page.goto(userFixtureUrl())
  await page.getByRole('button', { name: 'Create user fixture' }).click()
  let dialog = page.getByRole('dialog', { name: 'إضافة مستخدم', exact: true })
  await expect(dialog.getByLabel('اسم تسجيل الدخول', { exact: true })).toBeEnabled()
  await dialog.getByRole('button', { name: 'تأكيد', exact: true }).click()
  await expect(dialog.getByText('الاسم المعروض مطلوب', { exact: true })).toBeVisible()
  await dialog.getByLabel('الاسم المعروض', { exact: true }).fill('Draft عميل 00123')
  await chooseUserLanguage(page, dialog, 'English')
  dialog = page.getByRole('dialog', { name: 'Add user', exact: true })
  await expect(dialog.getByLabel('Display name', { exact: true })).toHaveValue('Draft عميل 00123')
  await expect(dialog.getByText('Username is required', { exact: true })).toBeVisible()
  await dialog.getByLabel('Username', { exact: true }).fill('newuser0001')
  await dialog.getByLabel('Password', { exact: true }).fill('fixture1234')
  await dialog.getByRole('button', { name: 'OK', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  const created = requests.find((request) => request.path === '/system/user/create')
  expect(created.language).toBe('en')
  expect(JSON.parse(created.body).nickname).toBe('Draft عميل 00123')
  await page.getByRole('button', { name: 'Edit user fixture' }).click()
  dialog = page.getByRole('dialog', { name: 'Edit user', exact: true })
  await expect(dialog.getByLabel('Display name', { exact: true })).toHaveValue(sampleUser.nickname)
  await expect(dialog.getByLabel('Password', { exact: true })).toHaveCount(0)
  await chooseUserLanguage(page, dialog, '简体中文')
  await expect(
    page
      .getByRole('dialog', { name: '修改用户', exact: true })
      .getByLabel('用户昵称', { exact: true })
  ).toHaveValue(sampleUser.nickname)
})

test('role assignment retains raw role names and selections while switching languages', async ({
  page
}) => {
  const { requests } = await userFixtures(page)
  await page.goto(userFixtureUrl())
  await page.getByRole('button', { name: 'Assign roles fixture' }).click()
  let dialog = page.getByRole('dialog', { name: 'تعيين أدوار المستخدم' })
  await expect(dialog.getByText('دور Custom 0007', { exact: true })).toBeVisible()
  await chooseUserLanguage(page, dialog, 'English')
  dialog = page.getByRole('dialog', { name: 'Assign user roles' })
  await expect(dialog.getByText('دور Custom 0007', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'OK', exact: true }).click()
  await expect
    .poll(
      () =>
        requests.filter((request) => request.path === '/system/permission/assign-user-role').length
    )
    .toBe(1)
  const assignment = requests.find(
    (request) => request.path === '/system/permission/assign-user-role'
  )
  expect(JSON.parse(assignment.body)).toEqual({ userId: 1, roleIds: [7] })
})

test('multiple user selector keeps preselection, disabled IDs, search text and cross-page selection', async ({
  page
}) => {
  await userFixtures(page)
  await page.goto(userFixtureUrl())
  await page.getByLabel('Fixture custom title', { exact: true }).fill('Custom عنوان 00123')
  await page.getByRole('button', { name: 'Open multiple selector fixture' }).click()
  let dialog = page.getByRole('dialog', { name: 'Custom عنوان 00123', exact: true })
  await expect(
    dialog.getByRole('row').filter({ hasText: 'user0001' }).getByRole('checkbox')
  ).toBeChecked()
  await expect(
    dialog.getByRole('row').filter({ hasText: 'user0002' }).getByRole('checkbox')
  ).toBeDisabled()
  await dialog.getByRole('row').filter({ hasText: 'user0003' }).getByRole('checkbox').press('Space')
  await dialog.getByRole('button', { name: /next page|صفحة تالية|الصفحة التالية/i }).click()
  await dialog.getByRole('row').filter({ hasText: 'user0011' }).getByRole('checkbox').press('Space')
  await dialog.getByPlaceholder('أدخل الاسم المعروض', { exact: true }).fill('Draft 00123')
  await chooseUserLanguage(page, dialog, 'English')
  dialog = page.getByRole('dialog', { name: 'Custom عنوان 00123', exact: true })
  await expect(dialog.getByPlaceholder('Enter a display name', { exact: true })).toHaveValue(
    'Draft 00123'
  )
  await dialog.getByRole('button', { name: 'OK', exact: true }).click()
  await expect
    .poll(async () =>
      JSON.parse(await page.getByRole('status', { name: 'Fixture selected users' }).textContent())
        .map((user) => user.id)
        .sort((a, b) => a - b)
    )
    .toEqual([1, 3, 11])
})

test('single user selector opens from the keyboard and clears its original identifier', async ({
  page
}) => {
  await userFixtures(page)
  await page.goto(userFixtureUrl())
  const input = page.getByRole('combobox', { name: 'Fixture single selector', exact: true })
  await input.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'اختيار المستخدمين', exact: true })
  await dialog.getByRole('radio', { name: `اختيار ${sampleUser.nickname}` }).press('Space')
  await dialog.getByRole('button', { name: 'تأكيد', exact: true }).click()
  await expect(input).toHaveValue(sampleUser.nickname)
  await expect(page.getByRole('status', { name: 'Fixture single value' })).toHaveText('1')
  await input.focus()
  await page.getByRole('button', { name: 'مسح الاختيار', exact: true }).click()
  await expect(input).toHaveValue('')
  await expect(page.getByRole('status', { name: 'Fixture single value' })).toBeEmpty()
})

for (const width of [375, 1280])
  for (const dark of [false, true]) {
    test(`user create and assignment content passes axe at ${width}px, ${dark ? 'dark' : 'light'}`, async ({
      page
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ colorScheme: dark ? 'dark' : 'light' })
      await userFixtures(page)
      await page.goto(userFixtureUrl())
      await page.getByRole('button', { name: 'Create user fixture' }).click()
      let dialog = page.getByRole('dialog', { name: 'إضافة مستخدم', exact: true })
      await expect(dialog.getByLabel('اسم تسجيل الدخول', { exact: true })).toBeEnabled()
      await waitForOverlaySettled(dialog)
      await dialog.getByRole('button', { name: 'تأكيد', exact: true }).click()
      expect(
        (await new AxeBuilder({ page }).include('.rain-user-management').analyze()).violations
      ).toEqual([])
      const box = await dialog.boundingBox()
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1)
      await page.screenshot({ path: testInfo.outputPath('create-user.png'), fullPage: true })
      await dialog.getByRole('button', { name: 'إلغاء', exact: true }).click()
      await page.getByRole('button', { name: 'Assign roles fixture' }).click()
      dialog = page.getByRole('dialog', { name: 'تعيين أدوار المستخدم' })
      await expect(dialog.getByText('دور Custom 0007', { exact: true })).toBeVisible()
      await waitForOverlaySettled(dialog)
      expect(
        (await new AxeBuilder({ page }).include('.rain-user-management').analyze()).violations
      ).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      )
    })
  }
