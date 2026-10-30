<script setup lang="ts">
import { ref } from 'vue'
import { TableSelectForm } from '@/components/Table'
import { Error } from '@/components/Error'
import { LocaleDropdown } from '@/layout/components/LocaleDropdown'
import { useLocaleStore } from '@/store/modules/locale'
import { useAppStore } from '@/store/modules/app'
import { isDark } from '@/utils/is'

const locale = useLocaleStore()
useAppStore().setIsDark(isDark())
const selection = ref<any[]>([])
const selector = ref<InstanceType<typeof TableSelectForm>>()
const requested = ref<number[]>([])
const customTitle = ref('')
const selectionEntered = ref(false)
const open = () => {
  selectionEntered.value = false
  return selector.value?.open(async ({ pageNo }: { pageNo: number }) => {
    requested.value.push(pageNo)
    return { total: 20, list: [{ id: pageNo, name: `عميل Test 00${pageNo}` }] }
  })
}
</script>

<template>
  <el-config-provider :locale="locale.currentLocale.elLocale">
    <main style="padding: 16px">
      <h1>Shared component fixture</h1>
      <LocaleDropdown />
      <button type="button" @click="open">Open selection fixture</button>
      <label>Fixture title <input v-model="customTitle" /></label>
      <output aria-label="Fixture selection">{{ JSON.stringify(selection) }}</output>
      <output aria-label="Fixture requested pages">{{ JSON.stringify(requested) }}</output>
      <output aria-label="Fixture selection entered">{{ selectionEntered }}</output>
      <TableSelectForm
        ref="selector"
        v-model="selection"
        :title="customTitle"
        @opened="selectionEntered = true"
        @closed="selectionEntered = false"
      >
        <el-table-column prop="id" label="ID" />
        <el-table-column prop="name" label="Fixture name" />
      </TableSelectForm>
      <Error type="403" />
    </main>
  </el-config-provider>
</template>
