<script lang="ts" setup>
import { formatDate } from '@/utils/formatTime'
import * as NotifyMessageApi from '@/api/system/notify/message'
import { useUserStoreWithOut } from '@/store/modules/user'
import { propTypes } from '@/utils/propTypes'
import { getAuthenticationCacheScope } from '@/hooks/web/cacheContext'

defineOptions({ name: 'Message' })

defineProps({
  color: propTypes.string.def('')
})

const { push } = useRouter()
const userStore = useUserStoreWithOut()
const { t } = useI18n()
const visible = ref(false)
const activeName = ref('notice')
const unreadCount = ref(0) // 未读消息数量
const list = ref<any[]>([]) // 消息列表
let unreadCountTimer: ReturnType<typeof setInterval> | undefined

// 获得消息列表
const getList = async () => {
  const context = getAuthenticationCacheScope()
  try {
    const records = await NotifyMessageApi.getUnreadNotifyMessageList()
    if (context !== getAuthenticationCacheScope()) return
    list.value = records
    // 强制设置 unreadCount 为 0，避免小红点因为轮询太慢，不消除
    unreadCount.value = 0
  } catch {
    // The request layer reports API failures and rejects obsolete session responses.
    if (context === getAuthenticationCacheScope()) list.value = []
  }
}

// 获得未读消息数
const getUnreadCount = async () => {
  const context = getAuthenticationCacheScope()
  NotifyMessageApi.getUnreadNotifyMessageCount()
    .then((data) => {
      if (context === getAuthenticationCacheScope()) unreadCount.value = data
    })
    .catch(() => {})
}
watch(getAuthenticationCacheScope, () => {
  list.value = []
  unreadCount.value = 0
  visible.value = false
  void getUnreadCount()
})

// 跳转我的站内信
const goMyList = () => {
  push({
    name: 'MyNotifyMessage'
  })
}

// ========== 初始化 =========
onMounted(() => {
  // 首次加载小红点
  getUnreadCount()
  // 轮询刷新小红点
  unreadCountTimer = setInterval(
    () => {
      if (userStore.getIsSetUser) {
        getUnreadCount()
      } else {
        unreadCount.value = 0
      }
    },
    1000 * 60 * 2
  )
})

onBeforeUnmount(() => {
  if (unreadCountTimer) {
    clearInterval(unreadCountTimer)
    unreadCountTimer = undefined
  }
})
</script>
<template>
  <div class="message">
    <ElPopover
      v-model:visible="visible"
      :width="400"
      :popper-style="{ maxWidth: 'calc(100vw - 24px)' }"
      placement="bottom"
      popper-class="rain-notifications"
      trigger="click"
      @show="getList"
    >
      <template #reference>
        <button
          type="button"
          class="inline-flex items-center justify-center border-0 bg-transparent p-8px text-inherit"
          :aria-label="t('shell.unreadNotifications', { count: unreadCount }, unreadCount)"
          :aria-expanded="visible"
        >
          <ElBadge :is-dot="unreadCount > 0" class="item"
            ><Icon :size="18" icon="ep:bell" :color="color"
          /></ElBadge>
        </button>
      </template>
      <ElTabs v-model="activeName">
        <ElTabPane :label="t('shell.myNotifications')" name="notice">
          <el-scrollbar class="message-list">
            <template v-for="item in list" :key="item.id">
              <div class="message-item">
                <img alt="" class="message-icon" src="@/assets/imgs/avatar.gif" />
                <div class="message-content">
                  <span class="message-title">
                    <bdi>{{ item.templateNickname }}</bdi
                    >: <span dir="auto">{{ item.templateContent }}</span>
                  </span>
                  <span class="message-date">
                    {{ formatDate(item.createTime) }}
                  </span>
                </div>
              </div>
            </template>
          </el-scrollbar>
        </ElTabPane>
      </ElTabs>
      <!-- 更多 -->
      <div style="margin-top: 10px; text-align: end">
        <el-button type="primary" @click="goMyList">
          <Icon icon="ep:view" /> {{ t('shell.viewAll') }}
        </el-button>
      </div>
    </ElPopover>
  </div>
</template>
<style lang="scss" scoped>
// 铃铛对齐修复：
// DOM 链路 div.message > ElPopover > ElBadge(inline-block) > Icon
// 默认 ElBadge 是 inline-block，在父 flex 容器里按 baseline 对齐，导致图标比其他 ElIcon 视觉偏下 1-2px
// 解法：让 .message 本身变 flex-center 容器，且穿透设置内部 .el-badge 也为 flex-center
// 这样从父到子整条链路都走几何中心对齐，不再受 inline-block baseline 影响
.message {
  display: flex;
  align-items: center;
  height: 100%;

  :deep(.el-badge) {
    display: flex;
    align-items: center;
  }
}

.message-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 260px;
  line-height: 45px;
}

.message-list {
  display: flex;
  height: 400px;
  flex-direction: column;

  .message-item {
    display: flex;
    align-items: center;
    padding: 20px 0;
    border-bottom: 1px solid var(--el-border-color-light);

    &:last-child {
      border: none;
    }

    .message-icon {
      width: 40px;
      height: 40px;
      margin-inline: 20px 5px;
    }

    .message-content {
      display: flex;
      flex-direction: column;

      .message-title {
        margin-bottom: 5px;
      }

      .message-date {
        font-size: 12px;
        color: var(--el-text-color-regular);
      }
    }
  }
}
</style>
