import { fixtureApi } from './fixtures.mjs'

export const sampleUser = {
  id: 1,
  username: 'user0001',
  nickname: 'عميل ACME 00123',
  deptId: 11,
  deptName: 'قسم Custom 0011',
  postIds: [40],
  email: 'person@example.test',
  mobile: '15601691300',
  sex: 1,
  status: 0,
  remark: 'Original 00123',
  createTime: '2026-10-31 14:05:06',
  roleIds: [7]
}

export async function userFixtures(page, options = {}) {
  await fixtureApi(page, true)
  const users = Array.from({ length: 23 }, (_, index) => ({
    ...sampleUser,
    id: index + 1,
    username: `user${String(index + 1).padStart(4, '0')}`,
    nickname: index === 0 ? sampleUser.nickname : `عميل Test ${String(index + 1).padStart(5, '0')}`,
    status: index === 22 ? 1 : 0
  }))
  const requests = []
  await page.route('**/admin-api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/admin-api', '')
    requests.push({
      path,
      method: request.method(),
      language: request.headers()['accept-language'],
      query: Object.fromEntries(url.searchParams),
      queryEntries: [...url.searchParams],
      body: request.postData()
    })
    let data
    if (path === '/system/auth/get-permission-info')
      data = {
        user: { ...sampleUser, avatar: '' },
        roles: ['admin'],
        permissions: options.permissions || ['*:*:*'],
        menus: []
      }
    else if (path === '/system/dept/simple-list')
      data = [
        { id: 10, parentId: 0, name: 'شركة Custom 0010' },
        { id: 11, parentId: 10, name: sampleUser.deptName }
      ]
    else if (path === '/system/post/simple-list') data = [{ id: 40, name: 'منصب Custom 0040' }]
    else if (path === '/system/role/simple-list')
      data = [
        { id: 7, name: 'دور Custom 0007' },
        { id: 8, name: 'دور Custom 0008' }
      ]
    else if (path === '/system/permission/list-user-roles') data = [7]
    else if (path === '/system/user/get') data = { ...sampleUser }
    else if (path === '/system/user/list')
      data = users.filter((user) =>
        (url.searchParams.get('ids') || '').split(',').includes(String(user.id))
      )
    else if (path === '/system/user/simple-list') data = users
    else if (path === '/system/user/update-status') {
      const payload = request.postDataJSON()
      users.find((user) => user.id === payload.id).status = payload.status
      data = true
    } else if (path === '/system/user/page') {
      const rows = users
        .filter((user) =>
          ['username', 'nickname', 'mobile'].every(
            (field) =>
              !url.searchParams.get(field) || user[field].includes(url.searchParams.get(field))
          )
        )
        .filter(
          (user) =>
            !url.searchParams.has('status') ||
            user.status === Number(url.searchParams.get('status'))
        )
      const start =
        (Number(url.searchParams.get('pageNo') || 1) - 1) *
        Number(url.searchParams.get('pageSize') || 10)
      data = {
        total: rows.length,
        list: rows.slice(start, start + Number(url.searchParams.get('pageSize') || 10))
      }
    } else if (path === '/system/dict-data/simple-list')
      data = [
        { dictType: 'common_status', value: '0', label: '开启' },
        { dictType: 'common_status', value: '1', label: '关闭' },
        { dictType: 'system_user_sex', value: '1', label: '男' },
        { dictType: 'system_user_sex', value: '2', label: '女' }
      ]
    else if (path === '/system/user/export-excel') {
      await route.fulfill({
        contentType: 'application/vnd.ms-excel',
        body: Buffer.from('synthetic-user-export')
      })
      return
    } else if (
      request.method() !== 'GET' &&
      (path.startsWith('/system/user/') || path === '/system/permission/assign-user-role')
    )
      data = true
    else return route.fallback()
    await route.fulfill({ json: { code: 0, data } })
  })
  return { requests, users }
}

export const userFixtureUrl = () =>
  `${process.env.RAIN_BROWSER_BASE_URL || 'http://127.0.0.1:4174'}/tests/components/index.html?fixture=users`

export async function chooseUserLanguage(page, scope, language) {
  await scope.getByRole('button', { name: /اختيار اللغة|Choose language|选择语言/ }).click()
  await page.getByRole('menuitem', { name: language, exact: true }).click()
}
