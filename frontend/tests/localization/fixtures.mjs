export const profile = {
  id: 1,
  username: 'demo-user',
  nickname: 'عميل Test 123',
  email: 'demo@example.test',
  mobile: '13800000000',
  sex: 2,
  avatar: '',
  dept: { id: 1, name: 'قسم Test' },
  roles: [{ id: 1, name: 'دور مخصص' }],
  posts: [{ id: 1, name: 'وظيفة Test' }],
  createTime: '2026-01-01T12:00:00'
}

export async function fixtureApi(page, authenticated = false) {
  const requests = []
  if (authenticated) {
    await page.addInitScript(() => {
      if (sessionStorage.getItem('localization-fixture-auth-initialized')) return
      sessionStorage.setItem('localization-fixture-auth-initialized', 'true')
      const stored = (value) =>
        JSON.stringify({ c: Date.now(), e: Date.now() + 3_600_000, v: JSON.stringify(value) })
      localStorage.setItem('ACCESS_TOKEN', stored('localization-fixture-token'))
      localStorage.setItem('REFRESH_TOKEN', stored('localization-fixture-refresh'))
    })
  }
  await page.routeWebSocket('**/infra/ws**', (socket) => socket.onMessage(() => {}))
  await page.route('**/admin-api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    requests.push({
      path: url.pathname,
      method: request.method(),
      language: request.headers()['accept-language']
    })
    let data = []
    if (url.pathname.endsWith('/tenant/get-id-by-name')) data = 1
    else if (url.pathname.endsWith('/tenant/get-by-website')) data = null
    else if (url.pathname.endsWith('/auth/get-permission-info'))
      data = { user: profile, roles: ['admin'], permissions: ['*:*:*'], menus: [] }
    else if (url.pathname.endsWith('/user/profile/get')) data = profile
    else if (url.pathname.endsWith('/notify-message/get-unread-count')) data = 0
    else if (url.pathname.endsWith('/auth/send-sms-code')) data = true
    else if (url.pathname.endsWith('/auth/qrcode/create'))
      data = { qrcodeId: 'fixture', secret: 'fixture-only', qrContent: 'rain-erp-test-qr' }
    else if (url.pathname.endsWith('/auth/qrcode/poll')) data = { status: 0 }
    else if (url.pathname.endsWith('/oauth2/authorize'))
      data = {
        client: { name: 'Fixture application' },
        scopes: [{ key: 'user.read', value: false }]
      }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, data })
    })
  })
  return requests
}
