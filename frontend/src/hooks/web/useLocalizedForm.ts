import { watch } from 'vue'
import type { FormInstance } from 'element-plus'
import { useLocaleStore } from '@/store/modules/locale'

// Refresh existing validation errors without marking untouched fields invalid.
export const useLocalizedForm = (getForm: () => FormInstance | undefined) => {
  const localeStore = useLocaleStore()
  watch(
    () => localeStore.getCurrentLocale.lang,
    () => {
      for (const field of getForm()?.fields ?? []) {
        if (field.validateState === 'error') void field.validate('').catch(() => false)
      }
    },
    { flush: 'post' }
  )
}
