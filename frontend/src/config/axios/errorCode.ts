import { useI18n } from '@/hooks/web/useI18n'

const keys: Record<string, string> = {
  '401': 'api.error.unauthorized',
  '403': 'api.error.forbidden',
  '404': 'api.error.notFound',
  default: 'api.error.unknown'
}

export const getErrorMessage = (code: string | number): string =>
  useI18n().t(keys[String(code)] || keys.default)
