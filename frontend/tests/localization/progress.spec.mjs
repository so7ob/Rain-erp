import { test, expect } from 'playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { createNavigationProgress } from '../../src/hooks/web/navigationProgress.ts'
import { fixtureApi, profile } from './fixtures.mjs'

const require = createRequire(import.meta.url)
const labels = Object.fromEntries(
  ['ar', 'en', 'zh-CN'].map((locale) => [
    locale,
    JSON.parse(readFileSync(new URL(`../../src/locales/${locale}/shared.json`, import.meta.url)))
      .common.navigationLoading
  ])
)

for (const [locale, label] of Object.entries(labels)) {
  test(`the application announces an unfinished navigation in ${locale}`, async ({ page }) => {
    await fixtureApi(page, true)
    await page.addInitScript((locale) => {
      localStorage.setItem(
        'lang',
        JSON.stringify({
          c: Date.now(),
          e: Date.now() + 3_600_000,
          v: JSON.stringify(locale)
        })
      )
    }, locale)
    let finish
    const pending = new Promise((resolve) => {
      finish = resolve
    })
    await page.route('**/auth/get-permission-info', async (route) => {
      await pending
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: { user: profile, roles: ['admin'], permissions: ['*:*:*'], menus: [] }
        })
      })
    })
    await page.goto('/user/profile')
    const progress = page.getByRole('progressbar', { name: label, exact: true })
    await expect(progress).toBeVisible()
    await expect(progress).not.toHaveAttribute('aria-valuenow')
    const result = await new AxeBuilder({ page }).include('#nprogress').analyze()
    expect(result.violations).toEqual([])
    finish()
    await expect(page.locator('.profile-layout')).toBeVisible()
    await expect(page.locator('#nprogress')).toHaveCount(0)
  })
}

test('visible navigation progress has valid, localized indeterminate semantics until removal', async ({
  page
}) => {
  // Exercise the real library and the shipped adapter while the progress is deliberately visible.
  await page.setContent(
    '<!doctype html><html lang="ar" dir="rtl"><head><title>Progress fixture</title></head><body><main>اختبار التحميل</main></body></html>'
  )
  await page.addStyleTag({ path: require.resolve('nprogress/nprogress.css') })
  await page.addScriptTag({ path: require.resolve('nprogress/nprogress.js') })
  await page.addScriptTag({
    content: `window.createNavigationProgress = ${createNavigationProgress.toString()}`
  })
  await page.evaluate((label) => {
    window.fixtureProgress = window.createNavigationProgress(window.NProgress, document)
    window.fixtureProgress.start(label)
  }, labels.ar)
  for (const [locale, label] of Object.entries(labels)) {
    await page.evaluate(
      ({ locale, label }) => {
        document.documentElement.lang = locale
        window.fixtureProgress.updateLabel(label)
      },
      { locale, label }
    )
    const progress = page.getByRole('progressbar', { name: label, exact: true })
    await expect(progress).toBeVisible()
    await expect(progress).not.toHaveAttribute('aria-valuenow')
    const result = await new AxeBuilder({ page }).include('#nprogress').analyze()
    expect(result.violations).toEqual([])
  }
  await page.evaluate(() => window.fixtureProgress.done())
  await expect(page.locator('#nprogress')).toHaveCount(0)
  const unusualLabel = '<تحميل> "A&B"'
  await page.evaluate((label) => window.fixtureProgress.start(label), unusualLabel)
  await expect(page.getByRole('progressbar', { name: unusualLabel, exact: true })).toBeVisible()
  await page.evaluate(() => window.fixtureProgress.done())
  await expect(page.locator('#nprogress')).toHaveCount(0)
})
