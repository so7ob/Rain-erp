import { test, expect } from 'playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { userFixtures, userFixtureUrl, chooseUserLanguage, sampleUser } from './user-fixtures.mjs'
import { waitForOverlaySettled } from './overlays.mjs'

async function expectUnclippedFilterControls(form) {
  expect(
    await form.evaluate((element) => {
      const card = element.closest('.el-card').getBoundingClientRect()
      return [
        ...element.querySelectorAll('.el-input__wrapper, .el-select__wrapper, .el-button')
      ].every((control) => {
        const box = control.getBoundingClientRect()
        return box.top >= card.top - 1 && box.bottom <= card.bottom + 1
      })
    })
  ).toBe(true)
}

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
  await page.getByLabel('Fixture custom title', { exact: true }).fill('system.user.selectTitle')
  await expect(
    page.getByRole('combobox', { name: 'Fixture single selector', exact: true })
  ).toHaveAttribute('placeholder', 'system.user.selectTitle')
  await page.getByRole('button', { name: 'Open multiple selector fixture' }).click()
  let dialog = page.getByRole('dialog', { name: 'system.user.selectTitle', exact: true })
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
  dialog = page.getByRole('dialog', { name: 'system.user.selectTitle', exact: true })
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

test('user status confirmation and password reset retain drafts and send unchanged API values', async ({
  page
}) => {
  const { requests } = await userFixtures(page)
  await page.goto(userFixtureUrl())
  await page.getByRole('button', { name: 'Toggle user page fixture' }).click()
  const row = page
    .locator('section.rain-user-management')
    .getByRole('row')
    .filter({ hasText: 'user0001' })
  const status = row.getByRole('switch', { name: 'حالة حساب user0001', exact: true })
  await status.press('Space')
  let dialog = page.getByRole('dialog', { name: 'تأكيد العملية' })
  await expect(dialog.getByText('user0001', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'إلغاء', exact: true }).click()
  await expect(status).toBeChecked()
  expect(requests.filter((request) => request.path === '/system/user/update-status')).toHaveLength(
    0
  )
  await status.press('Space')
  await dialog.getByRole('button', { name: 'تأكيد', exact: true }).click()
  await expect(status).not.toBeChecked()
  expect(
    JSON.parse(requests.find((request) => request.path === '/system/user/update-status').body)
  ).toEqual({ id: 1, status: 1 })
  await row.getByRole('button', { name: /user0001/ }).click()
  await page.getByRole('menuitem', { name: 'إعادة ضبط كلمة المرور', exact: true }).click()
  await dialog.getByLabel('كلمة المرور', { exact: true }).fill('12')
  await dialog.getByRole('button', { name: 'تأكيد', exact: true }).click()
  await chooseUserLanguage(page, dialog, 'English')
  dialog = page.getByRole('dialog', { name: 'System Hint' })
  await expect(dialog.getByLabel('Password', { exact: true })).toHaveValue('12')
  await expect(dialog.getByText(/4.*16.*characters/)).toBeVisible()
  await dialog.getByLabel('Password', { exact: true }).fill('fixture1234')
  await dialog.getByRole('button', { name: 'OK', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(
    JSON.parse(requests.find((request) => request.path === '/system/user/update-password').body)
  ).toEqual({ id: 1, password: 'fixture1234' })
})

test('user management continues to enforce query-only permissions in the real directives', async ({
  page
}) => {
  await userFixtures(page, { permissions: ['system:user:query'] })
  await page.goto(userFixtureUrl())
  await page.getByRole('button', { name: 'Toggle user page fixture' }).click()
  const content = page.locator('section.rain-user-management')
  await expect(content.getByRole('row').filter({ hasText: 'user0001' })).toBeVisible()
  for (const name of ['إضافة مستخدم', 'تصدير', 'استيراد', 'حذف المحدد', 'تعديل'])
    await expect(content.getByRole('button', { name, exact: true })).toHaveCount(0)
  await expect(
    content.getByRole('switch', { name: 'حالة حساب user0001', exact: true })
  ).toBeDisabled()
})

test('single and batch deletion preserve cancellation, original IDs and translated count confirmation', async ({
  page
}) => {
  const { requests } = await userFixtures(page)
  await page.goto(userFixtureUrl())
  await page.getByRole('button', { name: 'Toggle user page fixture' }).click()
  const content = page.locator('section.rain-user-management')
  const single = content.getByRole('row').filter({ hasText: 'user0005' })
  await single.getByRole('button', { name: /user0005/ }).click()
  await page.getByRole('menuitem', { name: 'حذف', exact: true }).click()
  let dialog = page.getByRole('dialog', { name: 'تأكيد العملية', exact: true })
  await dialog.getByRole('button', { name: 'إلغاء', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(requests.filter((request) => request.path === '/system/user/delete')).toHaveLength(0)
  await single.getByRole('button', { name: /user0005/ }).click()
  await page.getByRole('menuitem', { name: 'حذف', exact: true }).click()
  await dialog.getByRole('button', { name: 'تأكيد', exact: true }).click()
  await expect(single).toHaveCount(0)
  expect(requests.find((request) => request.path === '/system/user/delete').query.id).toBe('5')
  for (const username of ['user0003', 'user0004'])
    await content
      .getByRole('row')
      .filter({ hasText: username })
      .getByRole('checkbox')
      .press('Space')
  await content.getByRole('button', { name: 'حذف المحدد', exact: true }).click()
  await expect(
    dialog.getByText('هل تريد حذف المستخدمَين المحددَين؟', { exact: true })
  ).toBeVisible()
  await chooseUserLanguage(page, dialog, 'English')
  dialog = page.getByRole('dialog', { name: 'System Hint', exact: true })
  await dialog.getByRole('button', { name: 'OK', exact: true }).click()
  await expect(content.getByRole('row').filter({ hasText: 'user0003' })).toHaveCount(0)
  await expect(content.getByRole('row').filter({ hasText: 'user0004' })).toHaveCount(0)
  expect(
    requests
      .find((request) => request.path === '/system/user/delete-list')
      .query.ids.split(',')
      .sort()
  ).toEqual(['3', '4'])
})

test('user creation survives verified credential renewal and replays the original draft once', async ({
  page
}) => {
  await userFixtures(page)
  const bodies = []
  let refreshes = 0
  await page.route('**/admin-api/system/user/create', async (route) => {
    bodies.push(route.request().postData())
    await route.fulfill({
      json:
        bodies.length === 1
          ? { code: 401, msg: 'Fixture expired', messageKey: 'common.error.unauthorized' }
          : { code: 0, data: 100 }
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
  await page.goto(userFixtureUrl())
  await page.getByRole('button', { name: 'Create user fixture' }).click()
  const dialog = page.getByRole('dialog', { name: 'إضافة مستخدم', exact: true })
  await expect(dialog.getByLabel('اسم تسجيل الدخول', { exact: true })).toBeEnabled()
  await dialog.getByLabel('اسم تسجيل الدخول', { exact: true }).fill('newuser0001')
  await dialog.getByLabel('الاسم المعروض', { exact: true }).fill('Retained عميل 00123')
  await dialog.getByLabel('كلمة المرور', { exact: true }).fill('fixture1234')
  await dialog.getByRole('button', { name: 'تأكيد', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Fixture saved users' })).toHaveText('1')
  expect(refreshes).toBe(1)
  expect(bodies).toHaveLength(2)
  expect(bodies[1]).toBe(bodies[0])
  expect(JSON.parse(bodies[1]).nickname).toBe('Retained عميل 00123')
})

for (const width of [375, 1280])
  for (const dark of [false, true]) {
    test(`the user date filter keeps Arabic, original Gregorian values and access at ${width}px, ${dark ? 'dark' : 'light'}`, async ({
      page
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ colorScheme: dark ? 'dark' : 'light' })
      const { requests } = await userFixtures(page)
      await page.goto(userFixtureUrl())
      await page.getByRole('button', { name: 'Toggle user page fixture' }).click()
      await page.getByPlaceholder('تاريخ البداية', { exact: true }).click()
      const picker = page.locator('.rain-user-date-filter')
      await expect(picker).toBeVisible()
      await waitForOverlaySettled(picker)
      await expect(picker).toHaveAccessibleName('وقت الإنشاء')
      expect(
        (await new AxeBuilder({ page }).include('.rain-user-date-filter').analyze()).violations
      ).toEqual([])
      const box = await picker.boundingBox()
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1)
      expect(
        await picker
          .locator('.el-date-range-picker')
          .evaluate((panel) => panel.scrollWidth <= panel.clientWidth + 1)
      ).toBe(true)
      const month = picker.locator('.el-date-range-picker__content').first()
      await month
        .locator('td.available:not(.prev-month):not(.next-month)')
        .filter({ hasText: /^1$/ })
        .click()
      await month
        .locator('td.available:not(.prev-month):not(.next-month)')
        .filter({ hasText: /^15$/ })
        .click()
      expect(
        (await new AxeBuilder({ page }).include('.rain-user-date-filter').analyze()).violations
      ).toEqual([])
      await page.screenshot({ path: testInfo.outputPath('date-filter.png'), fullPage: true })
      await picker.getByRole('button', { name: 'موافق', exact: true }).click()
      await expect(picker).not.toBeVisible()
      await page
        .locator('section.rain-user-management')
        .getByRole('button', { name: 'بحث', exact: true })
        .click()
      await expect
        .poll(
          () =>
            requests
              .filter((request) => request.path === '/system/user/page')
              .at(-1)
              ?.queryEntries.filter(([key]) => key.startsWith('createTime')).length
        )
        .toBe(2)
      const values = requests
        .filter((request) => request.path === '/system/user/page')
        .at(-1)
        .queryEntries.filter(([key]) => key.startsWith('createTime'))
        .map(([, value]) => value)
      expect(values[0]).toMatch(/^\d{4}-\d{2}-01 00:00:00$/)
      expect(values[1]).toMatch(/^\d{4}-\d{2}-15 00:00:00$/)
      const previous = requests.filter((request) => request.path === '/system/user/page').length
      const editor = page.locator('section.rain-user-management .el-range-editor')
      await editor.hover()
      await editor.locator('.el-range__close-icon').click()
      await page
        .locator('section.rain-user-management')
        .getByRole('button', { name: 'بحث', exact: true })
        .click()
      await expect
        .poll(() => requests.filter((request) => request.path === '/system/user/page').length)
        .toBe(previous + 1)
      expect(
        requests
          .filter((request) => request.path === '/system/user/page')
          .at(-1)
          .queryEntries.filter(([key]) => key.startsWith('createTime'))
          .every(([, value]) => value === '')
      ).toBe(true)
      await page
        .locator('section.rain-user-management')
        .getByRole('button', { name: 'تصدير', exact: true })
        .click()
      const confirmation = page.getByRole('dialog', { name: 'تأكيد العملية', exact: true })
      const downloading = page.waitForEvent('download')
      await confirmation.getByRole('button', { name: 'تأكيد', exact: true }).click()
      expect((await downloading).suggestedFilename()).toBe('بيانات المستخدمين.xls')
    })
  }

test('user load and save errors keep the failed form reviewable without losing its input', async ({
  page
}) => {
  await userFixtures(page)
  await page.route('**/admin-api/system/user/get?*', (route) =>
    route.fulfill({
      json: { code: 400, messageKey: 'system.user.notFound', msg: 'المستخدم غير موجود' }
    })
  )
  await page.route('**/admin-api/system/user/create', (route) =>
    route.fulfill({
      json: {
        code: 400,
        messageKey: 'system.user.usernameDuplicate',
        msg: 'اسم تسجيل الدخول مستخدم بالفعل'
      }
    })
  )
  await page.goto(userFixtureUrl())
  await page.getByRole('button', { name: 'Edit user fixture' }).click()
  let dialog = page.getByRole('dialog', { name: 'تعديل مستخدم', exact: true })
  await expect(dialog.getByRole('alert')).toContainText('تعذّر تحميل بيانات المستخدم')
  await expect(dialog.getByRole('button', { name: 'تأكيد', exact: true })).toBeDisabled()
  await dialog.getByRole('button', { name: 'إلغاء', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await page.getByRole('button', { name: 'Create user fixture' }).click()
  dialog = page.getByRole('dialog', { name: 'إضافة مستخدم', exact: true })
  await expect(dialog.getByLabel('اسم تسجيل الدخول', { exact: true })).toBeEnabled()
  await dialog.getByLabel('اسم تسجيل الدخول', { exact: true }).fill('duplicate0001')
  await dialog.getByLabel('الاسم المعروض', { exact: true }).fill('Retained عميل 00123')
  await dialog.getByLabel('كلمة المرور', { exact: true }).fill('fixture1234')
  await dialog.getByRole('button', { name: 'تأكيد', exact: true }).click()
  await expect(page.getByText('اسم تسجيل الدخول مستخدم بالفعل', { exact: true })).toBeVisible()
  await expect(dialog.getByLabel('الاسم المعروض', { exact: true })).toHaveValue(
    'Retained عميل 00123'
  )
  await expect(dialog.getByRole('button', { name: 'تأكيد', exact: true })).toBeEnabled()
  await expect(page.getByRole('status', { name: 'Fixture saved users' })).toHaveText('0')
})

for (const change of ['tenant', 'visit', 'login']) {
  test(`user edit discards an older response after a ${change} change`, async ({ page }) => {
    await userFixtures(page)
    let release, started
    const pending = new Promise((resolve) => {
      release = resolve
    })
    const requested = new Promise((resolve) => {
      started = resolve
    })
    await page.route('**/admin-api/system/user/get?*', async (route) => {
      started()
      await pending
      await route.fulfill({
        json: { code: 0, data: { ...sampleUser, nickname: 'Old context 00123' } }
      })
    })
    await page.goto(userFixtureUrl())
    await page.getByRole('button', { name: 'Edit user fixture' }).click()
    const dialog = page.getByRole('dialog', { name: 'تعديل مستخدم', exact: true })
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
    await expect(page.getByText('Old context 00123', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('status', { name: 'Fixture saved users' })).toHaveText('0')
  })
}

for (const width of [375, 1280])
  for (const dark of [false, true]) {
    test(`user create and assignment content passes axe at ${width}px, ${dark ? 'dark' : 'light'}`, async ({
      page
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ colorScheme: dark ? 'dark' : 'light' })
      await userFixtures(page)
      await page.goto(userFixtureUrl())
      await expect(
        page.getByRole('combobox', { name: 'Fixture simple selector', exact: true })
      ).toBeVisible()
      expect(
        (await new AxeBuilder({ page }).include('.fixture-user-selectors').analyze()).violations
      ).toEqual([])
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
      await dialog.getByRole('button', { name: 'إلغاء', exact: true }).click()
      await expect(dialog).not.toBeVisible()
      await page.getByRole('button', { name: 'Open multiple selector fixture' }).click()
      dialog = page.getByRole('dialog', { name: 'اختيار المستخدمين', exact: true })
      await expect(
        dialog.getByRole('row').filter({ hasText: 'user0001' }).getByRole('checkbox')
      ).toBeChecked()
      await expect(
        dialog.locator('thead').getByRole('checkbox', { name: 'تحديد جميع الصفوف', exact: true })
      ).toHaveJSProperty('indeterminate', true)
      await expectUnclippedFilterControls(dialog.locator('.el-form'))
      await waitForOverlaySettled(dialog)
      expect(
        (await new AxeBuilder({ page }).include('.rain-user-management').analyze()).violations
      ).toEqual([])
      await page.screenshot({ path: testInfo.outputPath('select-users.png'), fullPage: true })
      await dialog.getByRole('button', { name: 'إلغاء', exact: true }).click()
      await expect(dialog).not.toBeVisible()
      await page.getByRole('button', { name: 'Toggle user page fixture' }).click()
      await expect(
        page.getByRole('switch', { name: 'حالة حساب user0001', exact: true })
      ).toBeEnabled()
      await expectUnclippedFilterControls(
        page.locator('section.rain-user-management .el-form').first()
      )
      expect(
        (await new AxeBuilder({ page }).include('.rain-user-management').analyze()).violations
      ).toEqual([])
      await page.screenshot({ path: testInfo.outputPath('user-list.png'), fullPage: true })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      )
    })
  }
