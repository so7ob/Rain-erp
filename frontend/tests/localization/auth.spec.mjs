import { test, expect } from 'playwright/test'
import AxeBuilder from '@axe-core/playwright'

import { fixtureApi, profile } from './fixtures.mjs'

async function language(page, name, lang) {
  const control = page.getByRole('button', { name: /اختيار اللغة|Choose language|选择语言/ })
  await control.click()
  await page.getByRole('menuitem', { name, exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', lang)
  await expect(page.locator('html')).toHaveAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr')
}

test('Arabic is the default and language changes preserve the draft and update request headers', async ({
  page
}) => {
  const requests = await fixtureApi(page)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'تسجيل الدخول', exact: true })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await page.getByRole('textbox', { name: 'اسم المستخدم', exact: false }).fill('draft-عميل-123')
  await language(page, 'English', 'en')
  await expect(page).toHaveTitle(/ - Login$/)
  await expect(page.getByRole('textbox', { name: 'Username', exact: false })).toHaveValue(
    'draft-عميل-123'
  )
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect
    .poll(() => requests.filter((request) => request.language === 'en').length)
    .toBeGreaterThan(0)
  await language(page, '简体中文', 'zh-CN')
  await expect(page.getByRole('heading', { name: '登录', exact: true })).toBeVisible()
  await language(page, 'العربية', 'ar')
  expect(errors).toEqual([])
  expect(requests.some((request) => request.path.endsWith('/auth/login'))).toBe(false)
})

test('registration errors translate without changing validation limits or losing input', async ({
  page
}) => {
  await fixtureApi(page)
  await page.goto('/login')
  await page.getByRole('button', { name: 'إنشاء حساب', exact: true }).click()
  const username = page.getByRole('textbox', { name: 'اسم المستخدم', exact: false })
  await username.fill('ab')
  await username.blur()
  await expect(
    page.getByText('يجب أن يتكون اسم المستخدم من 4 إلى 30 حرفًا', { exact: true })
  ).toBeVisible()
  await language(page, 'English', 'en')
  await expect(
    page.getByText('Username must contain 4 to 30 characters', { exact: true })
  ).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Username', exact: false })).toHaveValue('ab')
  await page.getByRole('textbox', { name: 'Username', exact: false }).fill('abcd')
  await page.getByRole('textbox', { name: 'Username', exact: false }).blur()
  await expect(
    page.getByText('Username must contain 4 to 30 characters', { exact: true })
  ).toBeHidden()
})

test('QR instructions and reset-password validation remain localized', async ({ page }) => {
  await fixtureApi(page)
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'اسم المنشأة', exact: false }).fill('Demo')
  await page.getByRole('button', { name: 'الدخول برمز QR', exact: true }).click()
  await expect(
    page.getByText('امسح الرمز بتطبيق الإدارة على هاتفك ثم أكد تسجيل الدخول', { exact: true })
  ).toBeVisible()
  await language(page, 'English', 'en')
  await expect(
    page.getByText('Scan with the mobile administration app and confirm sign in', { exact: true })
  ).toBeVisible()
  await page.getByRole('button', { name: 'back', exact: true }).click()
  await page.getByRole('button', { name: 'Forget password?', exact: true }).click()
  await page.getByRole('textbox', { name: 'Mobile Number', exact: false }).fill('123')
  await page.getByRole('textbox', { name: 'Mobile Number', exact: false }).blur()
  await expect(page.getByText('Phone number must contain 11 digits', { exact: true })).toBeVisible()
})

for (const width of [375, 1280]) {
  for (const dark of [false, true]) {
    test(`Arabic login has no axe violations or viewport overflow at ${width}, ${dark ? 'dark' : 'light'}`, async ({
      page
    }, testInfo) => {
      await fixtureApi(page)
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/login')
      await expect(page.getByRole('heading', { name: 'تسجيل الدخول', exact: true })).toBeVisible()
      if (dark) await page.locator('.v-theme-switch').click()
      await expect(page.locator('html')).toHaveClass(dark ? /dark/ : /^(?!.*\bdark\b)/)
      const result = await new AxeBuilder({ page }).analyze()
      expect(
        result.violations.map((violation) => ({
          id: violation.id,
          targets: violation.nodes.map((node) => node.target)
        }))
      ).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false
      )
      for (const name of ['الدخول برقم الهاتف', 'الدخول برمز QR', 'إنشاء حساب']) {
        const button = page.getByRole('button', { name, exact: true })
        await expect(button).toBeVisible()
        expect(await button.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
          true
        )
      }
      await page.screenshot({ path: testInfo.outputPath('login.png'), fullPage: true })
    })
  }
}

for (const width of [375, 1280]) {
  for (const dark of [false, true]) {
    test(`Arabic profile content has no axe violations at ${width}, ${dark ? 'dark' : 'light'}`, async ({
      page
    }, testInfo) => {
      await page.emulateMedia({ colorScheme: dark ? 'dark' : 'light' })
      await page.setViewportSize({ width, height: 900 })
      await fixtureApi(page, true)
      await page.goto('/user/profile')
      await expect(page.getByRole('textbox', { name: 'الاسم المعروض', exact: false })).toHaveValue(
        profile.nickname
      )
      await expect(page.locator('html')).toHaveClass(dark ? /dark/ : /^(?!.*\bdark\b)/)
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true)
      const result = await new AxeBuilder({ page }).include('.profile-layout').analyze()
      expect(
        result.violations.map((violation) => ({
          id: violation.id,
          targets: violation.nodes.map((node) => node.target)
        }))
      ).toEqual([])
      await page.screenshot({ path: testInfo.outputPath('profile-initial.png'), fullPage: true })
      await page.getByRole('button', { name: 'حفظ', exact: true }).scrollIntoViewIfNeeded()
      await expect(
        page.getByRole('tab', { name: 'الإعدادات الأساسية', exact: true })
      ).toBeInViewport()
      const formResult = await new AxeBuilder({ page }).include('.profile-layout').analyze()
      expect(
        formResult.violations.map((violation) => ({
          id: violation.id,
          targets: violation.nodes.map((node) => node.target)
        }))
      ).toEqual([])
      await page.screenshot({ path: testInfo.outputPath('profile.png'), fullPage: true })
    })
  }
}

test('profile labels update while custom Unicode and edited values remain intact', async ({
  page
}) => {
  await fixtureApi(page, true)
  await page.goto('/user/profile')
  const nickname = page.getByRole('textbox', { name: 'الاسم المعروض', exact: false })
  await expect(nickname).toHaveValue('عميل Test 123')
  await nickname.fill('تعديل Draft 123')
  await language(page, 'English', 'en')
  await expect(page.getByRole('textbox', { name: 'Nick Name', exact: false })).toHaveValue(
    'تعديل Draft 123'
  )
  await expect(page.getByText('قسم Test', { exact: true })).toBeVisible()
  await page.setViewportSize({ width: 375, height: 900 })
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
    .toBe(false)
})

test('the language menu works with the keyboard', async ({ page }) => {
  await fixtureApi(page)
  await page.goto('/login')
  const control = page.getByRole('button', { name: 'اختيار اللغة', exact: true })
  await control.focus()
  await control.press('Enter')
  const english = page.getByRole('menuitem', { name: 'English', exact: true })
  await expect(english).toBeVisible()
  await expect
    .poll(() => page.getByRole('menu').evaluate((menu) => menu.contains(document.activeElement)))
    .toBe(true)
  await page.keyboard.press('End')
  await expect(english).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('profile avatar selection opens from the keyboard without uploading', async ({ page }) => {
  const requests = await fixtureApi(page, true)
  await page.goto('/user/profile')
  const avatar = page.getByRole('button', { name: 'اختيار صورة', exact: true })
  await avatar.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'رفع الصورة الشخصية', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'رفع الصورة الشخصية', exact: true })).toBeHidden()
  expect(requests.some((request) => request.method !== 'GET')).toBe(false)
})

test('mobile profile tabs remain visible and preserve the password draft when switching languages', async ({
  page
}) => {
  await fixtureApi(page, true)
  await page.setViewportSize({ width: 375, height: 900 })
  await page.goto('/user/profile')
  const passwordTab = page.getByRole('tab', { name: 'إعدادات كلمة المرور', exact: true })
  await expect(page.getByRole('button', { name: 'اختيار اللغة', exact: true })).toBeInViewport()
  await passwordTab.scrollIntoViewIfNeeded()
  await expect(passwordTab).toBeInViewport()
  await passwordTab.click()
  await page.getByLabel('كلمة المرور الجديدة', { exact: false }).fill('draft-123')
  await language(page, 'English', 'en')
  await expect(page.getByLabel('New Password', { exact: false })).toHaveValue('draft-123')
  await expect(page.getByRole('tab', { name: 'Reset Password', exact: true })).toHaveAttribute(
    'aria-selected',
    'true'
  )
})

test('SMS resend countdown translates and retains the phone draft without sending a real message', async ({
  page
}) => {
  const requests = await fixtureApi(page)
  await page.goto('/login')
  await page.getByRole('button', { name: 'الدخول برقم الهاتف', exact: true }).click()
  await page.getByRole('textbox', { name: 'اسم المنشأة', exact: false }).fill('Demo')
  await page.getByRole('textbox', { name: 'رقم الهاتف', exact: false }).fill('13800000000')
  await page.getByRole('button', { name: 'إرسال رمز التحقق', exact: true }).click()
  await expect(page.getByText(/يمكن إعادة الإرسال بعد \d+ ثانية/)).toBeVisible()
  await language(page, 'English', 'en')
  await expect(page.getByText(/Resend in \d+ seconds/)).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Mobile Number', exact: false })).toHaveValue(
    '13800000000'
  )
  expect(requests.filter((request) => request.path.endsWith('/auth/send-sms-code'))).toHaveLength(1)
})

test('SSO permission descriptions and actions localize without granting access', async ({
  page
}) => {
  const requests = await fixtureApi(page, true)
  await page.goto('/sso?client_id=fixture-client&response_type=code')
  await expect(
    page.getByText('يطلب هذا التطبيق الخارجي الصلاحيات التالية:', { exact: true })
  ).toBeVisible()
  const scope = page.getByRole('checkbox', { name: 'قراءة معلوماتك الشخصية', exact: true })
  await page.getByText('قراءة معلوماتك الشخصية', { exact: true }).click()
  await expect(scope).toBeChecked()
  await language(page, 'English', 'en')
  await expect(
    page.getByRole('checkbox', { name: 'Read your personal information', exact: true })
  ).toBeChecked()
  await expect(page.getByRole('button', { name: 'Approve access', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Decline', exact: true })).toBeVisible()
  expect(
    requests.some(
      (request) => request.method === 'POST' && request.path.endsWith('/oauth2/authorize')
    )
  ).toBe(false)
})
