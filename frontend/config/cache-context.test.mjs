import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createCacheIdentity,
  authenticationCacheScope,
  displayCacheScope,
  createContextLoader
} from '../src/utils/cacheContextPolicy.ts'

test('cache identities survive reloads, rotate across users and never contain credentials', () => {
  let credential = 'fixture-user-a-refresh'
  let saved
  let counter = 0
  const port = {
    credential: () => credential,
    read: () => saved,
    write: (value) => {
      saved = value
    }
  }
  const randomId = () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`
  const identity = createCacheIdentity(port, randomId)
  const first = identity.current()
  assert.equal(identity.current(), first)
  assert.equal(createCacheIdentity(port, randomId).current(), first)
  credential = 'fixture-user-b-refresh'
  assert.notEqual(identity.current(), first)
  assert.ok(!saved.includes('fixture'))
  credential = undefined
  assert.equal(identity.current(), 'public')
  saved = 'untrusted-nonce-value'
  credential = 'fixture-user-c-refresh'
  assert.match(identity.current(), /^[0-9a-f-]{36}$/)
})

test('a verified credential continuation preserves both tabs while stale receipts cannot adopt a different login', () => {
  let credential = 'fixture-old-credential'
  let saved
  let receipt
  let counter = 0
  const randomId = () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`
  const port = {
    credential: () => credential,
    read: () => saved,
    write: (id) => {
      saved = id
    },
    continuation: () => receipt
  }
  const first = createCacheIdentity(port, randomId)
  const other = createCacheIdentity(port, randomId)
  const login = first.current()
  assert.equal(other.current(), login)
  receipt = { identity: login, nonce: randomId() }
  credential = 'fixture-refreshed-credential'
  assert.equal(first.current(), login)
  assert.equal(other.current(), login)
  assert.equal(JSON.stringify(receipt).includes('fixture'), false)
  credential = 'fixture-other-user-credential'
  assert.notEqual(first.current(), login)
  assert.notEqual(other.current(), login)
  credential = undefined
  first.current()
  const afterLogout = saved
  credential = 'fixture-unrelated-login'
  assert.notEqual(first.current(), afterLogout)
})

test('display caches separate languages, users, tenant and visited-tenant context', () => {
  const auth = authenticationCacheScope('opaque', 1, undefined)
  const base = displayCacheScope(auth, 1, 'ar')
  for (const candidate of [
    displayCacheScope(auth, 1, 'en'),
    displayCacheScope(auth, 2, 'ar'),
    displayCacheScope(authenticationCacheScope('opaque', 2, undefined), 1, 'ar'),
    displayCacheScope(authenticationCacheScope('opaque', 1, 2), 1, 'ar'),
    displayCacheScope(authenticationCacheScope('other-session', 1, undefined), 1, 'ar')
  ])
    assert.notEqual(candidate, base)
})

test('context reads share a request and discard old language or tenant responses', async () => {
  let context = 'ar:tenant1'
  const pending = []
  const loader = createContextLoader(
    () => context,
    () => new Promise((resolve) => pending.push(resolve))
  )
  const committed = []
  const old = loader((value) => committed.push(value))
  const second = loader((value) => committed.push(value))
  await Promise.resolve()
  assert.equal(pending.length, 1)
  context = 'en:tenant2'
  const current = loader((value) => committed.push(value))
  await Promise.resolve()
  pending[1]('current')
  assert.equal(await current, true)
  pending[0]('old')
  assert.deepEqual(await Promise.all([old, second]), [false, false])
  assert.deepEqual(committed, ['current'])
})

test('an explicit dictionary reload cannot commit a pending response from before an edit', async () => {
  const pending = []
  const loader = createContextLoader(
    () => 'same-context',
    () => new Promise((resolve) => pending.push(resolve))
  )
  const committed = []
  const old = loader((value) => committed.push(value))
  await Promise.resolve()
  loader.invalidate()
  const current = loader((value) => committed.push(value))
  await Promise.resolve()
  pending[1]('edited label')
  assert.equal(await current, true)
  pending[0]('old default label')
  assert.equal(await old, false)
  assert.deepEqual(committed, ['edited label'])
})
