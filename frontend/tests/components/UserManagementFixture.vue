<script setup lang="ts">
import { useLocaleStore } from '@/store/modules/locale'
import { useAppStore } from '@/store/modules/app'
import { isDark } from '@/utils/is'
import { LocaleDropdown } from '@/layout/components/LocaleDropdown'
import UserPage from '@/views/system/user/index.vue'
import UserForm from '@/views/system/user/UserForm.vue'
import UserAssignRoleForm from '@/views/system/user/UserAssignRoleForm.vue'
import UserSelect from '@/views/system/user/components/UserSelect.vue'
import UserSelectV2 from '@/views/system/user/components/UserSelectV2.vue'
import UserSelectDialogV2 from '@/views/system/user/components/UserSelectDialogV2.vue'
import type { UserVO } from '@/api/system/user'

const locale = useLocaleStore()
useAppStore().setIsDark(isDark())
const pageVisible = ref(false)
const form = ref<InstanceType<typeof UserForm>>()
const roles = ref<InstanceType<typeof UserAssignRoleForm>>()
const selector = ref<InstanceType<typeof UserSelectDialogV2>>()
const selected = ref<UserVO[]>([])
const simple = ref<number>()
const single = ref<number>()
const multiple = ref<number[]>([])
const saved = ref(0)
const customTitle = ref('')
const disabledIds = ref<number[]>([2])
const user = { id: 1, username: 'user0001', nickname: 'عميل ACME 00123' } as UserVO
</script>
<template>
  <el-config-provider :locale="locale.currentLocale.elLocale">
    <main style="padding: 16px">
      <h1>User management fixture</h1>
      <LocaleDropdown />
      <button type="button" @click="pageVisible = !pageVisible">Toggle user page fixture</button>
      <button type="button" @click="form?.open('create')">Create user fixture</button>
      <button type="button" @click="form?.open('update', 1)">Edit user fixture</button>
      <button type="button" @click="roles?.open(user)">Assign roles fixture</button>
      <button type="button" @click="selector?.open([1], disabledIds)"
        >Open multiple selector fixture</button
      >
      <label>Fixture custom title <input v-model="customTitle" /></label>
      <output aria-label="Fixture saved users">{{ saved }}</output>
      <output aria-label="Fixture selected users">{{ JSON.stringify(selected) }}</output>
      <label>Fixture simple selector</label
      ><UserSelect v-model="simple" aria-label="Fixture simple selector" />
      <label>Fixture single selector</label
      ><UserSelectV2 v-model="single" aria-label="Fixture single selector" :multiple="false" />
      <label>Fixture multiple selector</label
      ><UserSelectV2 v-model="multiple" aria-label="Fixture multiple selector" :multiple="true" />
      <output aria-label="Fixture single value">{{ JSON.stringify(single) }}</output>
      <output aria-label="Fixture multiple value">{{ JSON.stringify(multiple) }}</output>
      <UserForm ref="form" @success="saved++" />
      <UserAssignRoleForm ref="roles" @success="saved++" />
      <UserSelectDialogV2
        ref="selector"
        :title="customTitle || undefined"
        :multiple="true"
        @selected="selected = $event"
      />
      <UserPage v-if="pageVisible" />
    </main>
  </el-config-provider>
</template>
