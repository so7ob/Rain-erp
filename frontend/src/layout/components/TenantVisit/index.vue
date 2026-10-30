<template>
  <div>
    <el-select
      filterable
      :placeholder="t('shell.selectTenant')"
      :aria-label="t('shell.selectTenant')"
      class="!w-180px"
      v-model="value"
      @change="handleChange"
      clearable
    >
      <el-option v-for="item in tenants" :key="item.id" :label="item.name" :value="item.id" />
    </el-select>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import { getAuthenticationCacheScope } from '@/hooks/web/cacheContext'
import * as TenantApi from '@/api/system/tenant'
import { getVisitTenantId, setVisitTenantId } from '@/utils/auth'
import { useMessage } from '@/hooks/web/useMessage'
import { useTagsView } from '@/hooks/web/useTagsView'

const message = useMessage() // 消息弹窗
const tagsView = useTagsView() // 标签页操作
const { t } = useI18n()
const { currentRoute } = useRouter()

const value = ref(getVisitTenantId()) // 当前选中的租户 ID
const tenants = ref<any[]>([]) // 租户列表

const handleChange = (id: number) => {
  const tenant = tenants.value.find((item) => item.id === id)
  // 设置访问租户 ID
  setVisitTenantId(id)
  // 关闭其他标签页，只保留当前页
  tagsView.closeOther(undefined, currentRoute.value)
  // 刷新当前页面
  tagsView.refreshPage()
  // 提示切换成功
  if (tenant) {
    message.success(t('shell.visitingTenant', { name: tenant.name }))
  }
}

watch(
  getAuthenticationCacheScope,
  async () => {
    const context = getAuthenticationCacheScope()
    tenants.value = []
    value.value = getVisitTenantId()
    try {
      const records = await TenantApi.getTenantList()
      if (context === getAuthenticationCacheScope()) tenants.value = records
    } catch {
      // API failures are reported by the request layer; stale contexts cannot restore options.
    }
  },
  { immediate: true }
)
</script>
