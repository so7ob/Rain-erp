<template>
  <ElDialog v-if="isModal" v-model="showSearch" :show-close="false" :title="t('core.search.title')">
    <el-select
      filterable
      :reserve-keyword="false"
      remote
      :placeholder="t('core.search.placeholder')"
      :aria-label="t('core.search.placeholder')"
      :remote-method="remoteMethod"
      style="width: 100%"
      @change="handleChange"
    >
      <el-option
        v-for="item in options"
        :key="item.value"
        :label="item.label"
        :value="item.value"
      />
    </el-select>
  </ElDialog>
  <div v-else class="custom-hover" @click.stop="showTopSearch = !showTopSearch">
    <Icon icon="ep:search" :color="color" />
    <el-select
      @click.stop
      filterable
      :reserve-keyword="false"
      remote
      :placeholder="t('core.search.placeholder')"
      :aria-label="t('core.search.placeholder')"
      :remote-method="remoteMethod"
      class="overflow-hidden transition-all-600"
      :class="showTopSearch ? '!w-220px ml2' : '!w-0'"
      @change="handleChange"
    >
      <el-option
        v-for="item in options"
        :key="item.value"
        :label="item.label"
        :value="item.value"
      />
    </el-select>
  </div>
</template>

<script lang="ts" setup>
import { propTypes } from '@/utils/propTypes'
import { getRouteTitle } from '@/hooks/web/useRouteTitle'
import { getAuthenticationCacheScope } from '@/hooks/web/cacheContext'
const { t } = useI18n()
defineProps({
  isModal: {
    type: Boolean,
    default: true
  },
  color: propTypes.string.def('')
})

const router = useRouter() // 路由对象
const showSearch = ref(false) // 是否显示弹框
const showTopSearch = ref(false) // 是否显示顶部搜索框
const value: Ref = ref('') // 用户输入的值

const options = computed(() => {
  // 提示选项
  if (!value.value) {
    return []
  }
  const list = router.getRoutes().filter((item) => {
    if (item.meta.menuContext && item.meta.menuContext !== getAuthenticationCacheScope()) return false
    if (getRouteTitle(item.meta).includes(value.value) || item.path.includes(value.value)) {
      return true
    }
  })
  return list.map((item) => {
    return {
      label: `${getRouteTitle(item.meta)} ${item.path}`,
      value: item.path
    }
  })
})

function remoteMethod(data) {
  // 这里可以执行相应的操作（例如打开搜索框等）
  value.value = data
}

function handleChange(path) {
  router.push({ path })
  hiddenSearch()
  hiddenTopSearch()
}

function hiddenSearch() {
  showSearch.value = false
}

function hiddenTopSearch() {
  showTopSearch.value = false
}

onMounted(() => {
  window.addEventListener('keydown', listenKey)
  window.addEventListener('click', hiddenTopSearch)
})

onUnmounted(() => {
  window.removeEventListener('keydown', listenKey)
  window.removeEventListener('click', hiddenTopSearch)
})

// 监听 ctrl + k
function listenKey(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    // 阻止触发浏览器默认事件
    event.preventDefault()
    showSearch.value = !showSearch.value
    // 这里可以执行相应的操作（例如打开搜索框等）
  }
}

defineExpose({
  openSearch: () => {
    showSearch.value = true
  }
})
</script>
