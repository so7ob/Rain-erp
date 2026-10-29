<template>
  <!-- TODO @芋艿：可优化，对标 vben 版本 -->
  <div class="profile-layout">
    <el-card class="user" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>{{ t('profile.user.title') }}</span>
        </div>
      </template>
      <ProfileUser ref="profileUserRef" />
    </el-card>
    <el-card class="user" shadow="hover">
      <div>
        <el-tabs v-model="activeName" class="profile-tabs" tab-position="top">
          <el-tab-pane :label="t('profile.info.basicInfo')" name="basicInfo">
            <BasicInfo @success="handleBasicInfoSuccess" />
          </el-tab-pane>
          <el-tab-pane :label="t('profile.info.resetPwd')" name="resetPwd">
            <ResetPwd />
          </el-tab-pane>
          <el-tab-pane :label="t('profile.info.userSocial')" name="userSocial">
            <UserSocial v-model:activeName="activeName" />
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-card>
  </div>
</template>
<script lang="ts" setup>
import { BasicInfo, ProfileUser, ResetPwd, UserSocial } from './components'

const { t } = useI18n()
defineOptions({ name: 'Profile' })
const activeName = ref('basicInfo')
const profileUserRef = ref()

// 处理基本信息更新成功
const handleBasicInfoSuccess = async () => {
  await profileUserRef.value?.refresh()
}
</script>
<style scoped>
.profile-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: 12px;
}

.profile-tabs {
  min-height: 400px;
}

@media (max-width: 767px) {
  .profile-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .profile-tabs :deep(.el-tabs__nav) {
    display: flex;
    flex-wrap: wrap;
    float: none;
    white-space: normal;
  }

  .profile-tabs :deep(.el-tabs__item) {
    flex: 1 0 auto;
    padding-inline: 8px;
  }

  .profile-tabs :deep(.el-tabs__active-bar) {
    display: none;
  }

  .profile-tabs :deep(.el-tabs__item.is-active) {
    box-shadow: inset 0 -2px var(--el-color-primary);
  }
}

.user {
  min-width: 0;
  max-height: 960px;
  padding: 15px 20px 20px;
}

.card-header {
  display: flex;
  justify-content: center;
  align-items: center;
}

:deep(.el-card .el-card__header, .el-card .el-card__body) {
  padding: 15px !important;
}

.profile-tabs > .el-tabs__content {
  padding: 32px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.el-tabs--left .el-tabs__content {
  height: 100%;
}
</style>
