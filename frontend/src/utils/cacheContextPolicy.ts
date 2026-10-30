interface IdentityStorage {
  credential(): unknown
  read(): unknown
  write(identity: string): void
  continuation?(): unknown
}

export function randomCacheIdentity(cryptography: Pick<Crypto, 'getRandomValues'>) {
  // getRandomValues is available on HTTP development origins where randomUUID is unavailable.
  const bytes = cryptography.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** Persist only an opaque login identity; credentials stay in the existing auth storage. */
export function createCacheIdentity(storage: IdentityStorage, randomId: () => string) {
  const unseen = Symbol('unseen')
  let previous: unknown = unseen
  let previousContinuation: unknown = unseen
  const valid = (value: unknown): value is string =>
    typeof value === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value)
  const rotate = () => {
    const identity = randomId()
    storage.write(identity)
    previous = storage.credential()
    previousContinuation = (storage.continuation?.() as { nonce?: unknown } | undefined)?.nonce
    return identity
  }
  const current = () => {
    const credential = storage.credential()
    if (!credential) {
      previous = credential
      previousContinuation = (storage.continuation?.() as { nonce?: unknown } | undefined)?.nonce
      return 'public'
    }
    const saved = storage.read()
    const receipt = storage.continuation?.() as { identity?: unknown; nonce?: unknown } | undefined
    const continued =
      receipt?.identity === saved && valid(receipt?.nonce) && receipt.nonce !== previousContinuation
    if ((previous !== unseen && previous !== credential && !continued) || !valid(saved))
      return rotate()
    previous = credential
    previousContinuation = receipt?.nonce
    return saved
  }
  return { current, rotate }
}

export function authenticationCacheScope(
  identity: string,
  tenant: unknown,
  visitedTenant: unknown
) {
  return JSON.stringify([identity, tenant ?? null, visitedTenant ?? null])
}

export function displayCacheScope(authentication: string, userId: number, locale: string) {
  return JSON.stringify([authentication, userId, locale])
}

/** Share reads within a context, but never commit an old context's response. */
export function createContextLoader<T>(context: () => string, load: () => Promise<T>) {
  const pending = new Map<string, Promise<T>>()
  let generation = 0
  const execute = async (commit: (value: T, captured: string) => void): Promise<boolean> => {
    const captured = context()
    const version = generation
    const key = JSON.stringify([captured, version])
    let request = pending.get(key)
    if (!request) {
      request = Promise.resolve()
        .then(load)
        .finally(() => {
          pending.delete(key)
        })
      pending.set(key, request)
    }
    const value = await request
    if (context() !== captured || generation !== version) return false
    commit(value, captured)
    return true
  }
  return Object.assign(execute, {
    invalidate: () => {
      generation++
    }
  })
}
