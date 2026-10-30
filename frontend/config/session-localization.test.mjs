import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createSingleRefresh,
  isSilentRefreshError,
  isSessionAuthenticationError
} from '../src/config/axios/session.ts'

test('simultaneous unauthorized requests share one refresh and all receive its result', async () => {
  let finish
  let calls = 0
  const refresh = createSingleRefresh(() => {
    calls++
    return new Promise((resolve) => {
      finish = resolve
    })
  })
  const first = refresh()
  const second = refresh()
  await Promise.resolve()
  assert.equal(calls, 1)
  finish('fixture-result')
  assert.deepEqual(await Promise.all([first, second]), ['fixture-result', 'fixture-result'])
})

test('failed refresh settles every waiter and permits a later fresh attempt', async () => {
  let calls = 0
  const error = new Error('fixture failure')
  const refresh = createSingleRefresh(async () => {
    if (++calls === 1) throw error
    return 'later-session'
  })
  const result = await Promise.allSettled([refresh(), refresh(), refresh()])
  assert.equal(calls, 1)
  assert.ok(result.every((item) => item.status === 'rejected' && item.reason === error))
  assert.equal(await refresh(), 'later-session')
  assert.equal(calls, 2)
})

test('synchronous refresh failures reject callers without leaving a stuck request', async () => {
  let calls = 0
  const refresh = createSingleRefresh(() => {
    calls++
    throw new Error('fixture synchronous failure')
  })
  await assert.rejects(refresh(), /fixture synchronous failure/)
  await assert.rejects(refresh(), /fixture synchronous failure/)
  assert.equal(calls, 2)
})

test('refreshes for different user and tenant identities never share a pending result', async () => {
  const complete = new Map()
  const calls = []
  const refresh = createSingleRefresh(
    (identity) => {
      calls.push(identity)
      return new Promise((resolve) => complete.set(identity, resolve))
    },
    (identity) => identity
  )
  const first = refresh('tenant-a-user-a')
  const same = refresh('tenant-a-user-a')
  const other = refresh('tenant-b-user-b')
  await Promise.resolve()
  assert.deepEqual(calls, ['tenant-a-user-a', 'tenant-b-user-b'])
  complete.get('tenant-b-user-b')('second')
  complete.get('tenant-a-user-a')('first')
  assert.deepEqual(await Promise.all([first, same, other]), ['first', 'first', 'second'])
})

test('silent refresh errors use semantic identities independently of translated text or shared codes', () => {
  assert.equal(isSilentRefreshError('system.oauth2.refreshToken.invalid'), true)
  assert.equal(isSilentRefreshError('system.oauth2.refreshToken.expired'), true)
  for (const value of [
    undefined,
    400,
    401,
    'crm.customer.notFound',
    '无效的刷新令牌',
    'انتهت الجلسة'
  ]) {
    assert.equal(isSilentRefreshError(value), false)
  }
})

test('a domain error using 401 does not expire the current authenticated session', () => {
  assert.equal(isSessionAuthenticationError(401, 'common.error.unauthorized'), true)
  assert.equal(isSessionAuthenticationError(401, undefined), true)
  assert.equal(isSessionAuthenticationError(401, 'system.oauth2.accessToken.expired'), false)
  assert.equal(isSessionAuthenticationError(401, 'crm.customer.notFound'), false)
  assert.equal(isSessionAuthenticationError(400, 'common.error.unauthorized'), false)
})
