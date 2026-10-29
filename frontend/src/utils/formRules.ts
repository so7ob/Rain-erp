// 必填项
export const required = {
  required: true,
  get message() {
    return useI18n().t('common.required')
  }
}
