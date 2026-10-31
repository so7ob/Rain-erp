/** Keep the latest operation only, within the same authenticated user/tenant context. */
export const createScopedTask = (context: () => string) => {
  let generation = 0
  let invalidation = 0
  let disposed = false
  return {
    capture() {
      const captured = context()
      const version = invalidation
      return () => !disposed && invalidation === version && context() === captured
    },
    begin() {
      const captured = context()
      const version = ++generation
      return () => !disposed && generation === version && context() === captured
    },
    invalidate() {
      generation++
      invalidation++
    },
    dispose() {
      disposed = true
      generation++
    }
  }
}
