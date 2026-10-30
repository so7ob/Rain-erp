import { useI18n } from '@/hooks/web/useI18n'
import { FormItemRule } from 'element-plus'

interface LengthRange {
  min: number
  max: number
  message?: string
}

export const useValidator = () => {
  const required = (message?: string): FormItemRule => {
    return {
      required: true,
      get message() {
        return message || useI18n().t('common.required')
      }
    }
  }

  const lengthRange = (options: LengthRange): FormItemRule => {
    const { min, max, message } = options

    return {
      min,
      max,
      get message() {
        return message || useI18n().t('common.lengthRange', { min, max })
      }
    }
  }

  const notSpace = (message?: string): FormItemRule => {
    return {
      validator: ((_, val) => {
        if (val?.indexOf(' ') !== -1) {
          return Promise.reject(new Error(message || useI18n().t('common.notSpace')))
        }
        return Promise.resolve()
      }) as any
    }
  }

  const notSpecialCharacters = (message?: string): FormItemRule => {
    return {
      validator: ((_, val) => {
        if (/[`~!@#$%^&*()_+<>?:"{},.\/;'[\]]/gi.test(val)) {
          return Promise.reject(new Error(message || useI18n().t('common.notSpecialCharacters')))
        }
        return Promise.resolve()
      }) as any
    }
  }

  return {
    required,
    lengthRange,
    notSpace,
    notSpecialCharacters
  }
}
