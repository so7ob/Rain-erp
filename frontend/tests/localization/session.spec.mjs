import { test, expect } from 'playwright/test'
import { fixtureApi, profile } from './fixtures.mjs'

const fresh = {
  accessToken: 'localization-fixture-renewed',
  refreshToken: 'localization-fixture-refresh'
}

async function savedEnglish(page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'lang',
      JSON.stringify({ c: Date.now(), e: Date.now() + 3_600_000, v: JSON.stringify('en') })
    )
  })
}

async function sessionTransport(
  page,
  {
    failure,
    alwaysUnauthorized = false,
    delaySecond = false,
    beforeRefresh,
    networkFailure = false
  } = {}
) {
  const state = { profile: [], refresh: [] }
  let release
  let refreshed = false
  const bothRequests = new Promise((resolve) => {
    release = resolve
  })
  await page.route('**/user/profile/get**', async (route) => {
    state.profile.push({
      language: route.request().headers()['accept-language'],
      authorization: route.request().headers().authorization
    })
    if (state.profile.length === 2) release()
    const unauthorized = !refreshed || alwaysUnauthorized
    if (delaySecond && state.profile.length === 2) {
      await page.waitForFunction(() =>
        localStorage.getItem('ACCESS_TOKEN')?.includes('localization-fixture-renewed')
      )
    }
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        unauthorized
          ? {
              code: 401,
              msg: 'Session needs renewal',
              messageKey: 'common.error.unauthorized',
              data: null
            }
          : { code: 0, msg: '', data: profile }
      )
    })
  })
  await page.route('**/system/auth/refresh-token**', async (route) => {
    state.refresh.push({
      language: route.request().headers()['accept-language'],
      method: route.request().method()
    })
    await bothRequests
    if (beforeRefresh) await beforeRefresh
    if (networkFailure) return route.abort('timedout')
    refreshed = true
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(failure || { code: 0, msg: '', data: fresh })
    })
  })
  return state
}

test('concurrent 401 responses share one refresh and replay with the renewed token and Arabic header', async ({
  page
}) => {
  await fixtureApi(page, true)
  const state = await sessionTransport(page)
  await page.goto('/user/profile')
  await expect(page.getByRole('textbox', { name: 'الاسم المعروض', exact: false })).toHaveValue(
    profile.nickname
  )
  expect(state.refresh).toEqual([{ language: 'ar', method: 'POST' }])
  await expect.poll(() => state.profile.length).toBe(4)
  expect(
    state.profile
      .slice(2)
      .every(
        (request) =>
          request.authorization === 'Bearer ' + fresh.accessToken && request.language === 'ar'
      )
  ).toBe(true)
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
})

test('expired refresh keys reject waiting requests without replay and retain saved English after re-login', async ({
  page
}) => {
  await fixtureApi(page, true)
  await savedEnglish(page)
  const state = await sessionTransport(page, {
    failure: {
      code: 401,
      msg: 'The refresh token has expired',
      messageKey: 'system.oauth2.refreshToken.expired',
      data: null
    }
  })
  await page.goto('/user/profile')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  expect(state.refresh).toEqual([{ language: 'en', method: 'POST' }])
  expect(state.profile).toHaveLength(2)
  await dialog.getByRole('button').click()
  await expect(page).toHaveURL(/\/login(?:\?|$)/)
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  expect(state.refresh).toHaveLength(1)
})

test('a renewed token that remains unauthorized cannot start an infinite refresh loop', async ({
  page
}) => {
  await fixtureApi(page, true)
  const state = await sessionTransport(page, { alwaysUnauthorized: true })
  await page.goto('/user/profile')
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(state.refresh).toHaveLength(1)
  await expect.poll(() => state.profile.length).toBe(4)
})

test('a failed refresh connection settles the waiting requests without replaying them', async ({
  page
}) => {
  await fixtureApi(page, true)
  const state = await sessionTransport(page, { networkFailure: true })
  await page.goto('/user/profile')
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(state.refresh).toHaveLength(1)
  expect(state.profile).toHaveLength(2)
})

test('an old 401 arriving after renewal replays with the current token without another refresh', async ({
  page
}) => {
  await fixtureApi(page, true)
  const state = await sessionTransport(page, { delaySecond: true })
  await page.goto('/user/profile')
  await expect(page.getByRole('textbox', { name: 'الاسم المعروض', exact: false })).toHaveValue(
    profile.nickname
  )
  await expect.poll(() => state.profile.length).toBe(4)
  expect(state.refresh).toHaveLength(1)
})

test('a delayed refresh cannot overwrite or sign out a different user and tenant session', async ({
  page
}) => {
  await page.addInitScript(() => {
    const send = XMLHttpRequest.prototype.send
    XMLHttpRequest.prototype.send = function (...args) {
      this.addEventListener('loadend', () => {
        if (this.responseURL.includes('/system/auth/refresh-token')) {
          // Observe the public transport lifecycle after Axios and its promise callbacks finish.
          setTimeout(() => {
            window.__localizationRefreshCompleted = true
          }, 0)
        }
      })
      return send.apply(this, args)
    }
  })
  await fixtureApi(page, true)
  await savedEnglish(page)
  let finish
  const beforeRefresh = new Promise((resolve) => {
    finish = resolve
  })
  const state = await sessionTransport(page, { beforeRefresh })
  await page.goto('/user/profile')
  await expect.poll(() => state.refresh.length).toBe(1)
  await page.evaluate(() => {
    const stored = (value) =>
      JSON.stringify({ c: Date.now(), e: Date.now() + 3_600_000, v: JSON.stringify(value) })
    localStorage.setItem('ACCESS_TOKEN', stored('different-fixture-user-access'))
    localStorage.setItem('REFRESH_TOKEN', stored('different-fixture-user-refresh'))
    localStorage.setItem('tenantId', stored(2))
  })
  finish()
  await page.waitForFunction(() => window.__localizationRefreshCompleted === true)
  expect(
    await page.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem('REFRESH_TOKEN')).v))
  ).toBe('different-fixture-user-refresh')
  expect(
    await page.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem('ACCESS_TOKEN')).v))
  ).toBe('different-fixture-user-access')
  expect(state.profile).toHaveLength(2)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('business errors sharing a numeric status or legacy session text are still displayed', async ({
  page
}) => {
  await fixtureApi(page, true)
  let refreshes = 0
  await page.route('**/system/auth/refresh-token**', async (route) => {
    refreshes++
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, data: fresh })
    })
  })
  await page.route('**/user/profile/get**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        code: 400,
        msg: '无效的刷新令牌',
        messageKey: 'crm.customer.notFound',
        data: null
      })
    })
  )
  await page.goto('/user/profile')
  await expect(page.getByText('无效的刷新令牌', { exact: true }).first()).toBeVisible()
  expect(refreshes).toBe(0)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('a domain token error with status 401 is displayed without refreshing or signing out the user', async ({
  page
}) => {
  await fixtureApi(page, true)
  let refreshes = 0
  await page.route('**/system/auth/refresh-token**', async (route) => {
    refreshes++
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, data: fresh })
    })
  })
  await page.route('**/user/profile/get**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        code: 401,
        msg: 'انتهت صلاحية رمز الوصول',
        messageKey: 'system.oauth2.accessToken.expired',
        data: null
      })
    })
  )
  await page.goto('/user/profile')
  await expect(page.getByText('انتهت صلاحية رمز الوصول', { exact: true }).first()).toBeVisible()
  expect(refreshes).toBe(0)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
