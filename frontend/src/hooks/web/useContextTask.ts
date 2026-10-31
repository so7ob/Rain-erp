import { computed, onBeforeUnmount, watch } from 'vue'
import { getAuthenticationCacheScope } from './cacheContext'
import { createScopedTask } from '@/utils/scopedTask'

export const useContextTask = (reset?: () => void) => {
  const context = computed(getAuthenticationCacheScope)
  const task = createScopedTask(() => context.value)
  watch(context, () => {
    task.invalidate()
    reset?.()
  })
  onBeforeUnmount(task.dispose)
  return { ...task, context }
}
