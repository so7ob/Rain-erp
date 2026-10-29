<script lang="ts" setup>
import { useLocaleStore } from '@/store/modules/locale'
import { useLocale } from '@/hooks/web/useLocale'
import { propTypes } from '@/utils/propTypes'
import { useDesign } from '@/hooks/web/useDesign'

defineOptions({ name: 'LocaleDropdown' })

const { getPrefixCls } = useDesign()

const prefixCls = getPrefixCls('locale-dropdown')

defineProps({
  color: propTypes.string.def('')
})

const localeStore = useLocaleStore()

const langMap = computed(() => localeStore.getLocaleMap)

const currentLang = computed(() => localeStore.getCurrentLocale)
const { changeLocale } = useLocale()
const { t } = useI18n()
const switching = ref(false)

const setLang = async (lang: LocaleType) => {
  if (lang === unref(currentLang).lang) return
  switching.value = true
  try {
    await changeLocale(lang)
  } catch {
    ElMessage.error(t('sys.api.apiRequestFailed'))
  } finally {
    switching.value = false
  }
}
</script>

<template>
  <ElDropdown :class="prefixCls" trigger="click" :disabled="switching" @command="setLang">
    <button
      type="button"
      :aria-label="t('auth.language')"
      :disabled="switching"
      class="inline-flex cursor-pointer items-center border-0 bg-transparent p-5px text-inherit"
    >
      <Icon :class="$attrs.class" :color="color" :size="18" icon="ion:language-sharp" />
    </button>
    <template #dropdown>
      <ElDropdownMenu>
        <ElDropdownItem
          v-for="item in langMap"
          :key="item.lang"
          :command="item.lang"
          :disabled="item.lang === currentLang.lang"
        >
          {{ item.name }}
        </ElDropdownItem>
      </ElDropdownMenu>
    </template>
  </ElDropdown>
</template>
