<script lang="ts" setup>
import { ElMessage } from 'element-plus'
import { useClipboard, useCssVar } from '@vueuse/core'

import { CACHE_KEY, useCache } from '@/hooks/web/useCache'

import { setCssVar, trim } from '@/utils'
import { colorIsDark, hexToRGB, lighten } from '@/utils/color'
import { useAppStore } from '@/store/modules/app'
import { ThemeSwitch } from '@/layout/components/ThemeSwitch'
import ColorRadioPicker from './components/ColorRadioPicker.vue'
import InterfaceDisplay from './components/InterfaceDisplay.vue'
import LayoutRadioPicker from './components/LayoutRadioPicker.vue'
import { isHeaderNavLayout } from '@/utils/layout'
import { useSetting } from './useSetting'
import { LocaleDropdown } from '@/layout/components/LocaleDropdown'
import { useLocaleStore } from '@/store/modules/locale'

defineOptions({ name: 'Setting' })

const { t } = useI18n()
const appStore = useAppStore()
const layout = computed(() => appStore.getLayout)
const { drawerVisible } = useSetting()
const localeStore = useLocaleStore()
const drawerDirection = computed(() => (localeStore.getCurrentLocale.lang === 'ar' ? 'ltr' : 'rtl'))

// 主题色相关
const systemTheme = ref(appStore.getTheme.elColorPrimary)

const setSystemTheme = (color: string) => {
  setCssVar('--el-color-primary', color)
  appStore.setTheme({ elColorPrimary: color })
  const leftMenuBgColor = useCssVar('--left-menu-bg-color', document.documentElement)
  setMenuTheme(trim(unref(leftMenuBgColor) || ''))
}

// 头部主题相关
const headerTheme = ref(appStore.getTheme.topHeaderBgColor || '')

const setHeaderTheme = (color: string) => {
  const isDarkColor = colorIsDark(color)
  const textColor = isDarkColor ? '#fff' : 'inherit'
  const textHoverColor = isDarkColor ? lighten(color!, 6) : '#f6f6f6'
  const topToolBorderColor = isDarkColor ? color : '#eee'
  setCssVar('--top-header-bg-color', color)
  setCssVar('--top-header-text-color', textColor)
  setCssVar('--top-header-hover-color', textHoverColor)
  appStore.setTheme({
    topHeaderBgColor: color,
    topHeaderTextColor: textColor,
    topHeaderHoverColor: textHoverColor,
    topToolBorderColor
  })
  if (isHeaderNavLayout(unref(layout))) {
    setMenuTheme(color)
  }
}

// 菜单主题相关
const menuTheme = ref(appStore.getTheme.leftMenuBgColor || '')

const setMenuTheme = (color: string) => {
  const primaryColor = useCssVar('--el-color-primary', document.documentElement)
  const isDarkColor = colorIsDark(color)
  const theme: Recordable = {
    // 左侧菜单边框颜色
    leftMenuBorderColor: isDarkColor ? 'inherit' : '#eee',
    // 左侧菜单背景颜色
    leftMenuBgColor: color,
    // 左侧菜单浅色背景颜色
    leftMenuBgLightColor: isDarkColor ? lighten(color!, 6) : color,
    // 左侧菜单选中背景颜色
    leftMenuBgActiveColor: isDarkColor
      ? 'var(--el-color-primary)'
      : hexToRGB(unref(primaryColor) || '#409eff', 0.1),
    // 左侧菜单收起选中背景颜色
    leftMenuCollapseBgActiveColor: isDarkColor
      ? 'var(--el-color-primary)'
      : hexToRGB(unref(primaryColor) || '#409eff', 0.1),
    // 左侧菜单字体颜色
    leftMenuTextColor: isDarkColor ? '#bfcbd9' : '#333',
    // 左侧菜单选中字体颜色
    leftMenuTextActiveColor: isDarkColor ? '#fff' : 'var(--el-color-primary)',
    // logo字体颜色
    logoTitleTextColor: isDarkColor ? '#fff' : 'inherit',
    // logo边框颜色
    logoBorderColor: isDarkColor ? color : '#eee'
  }
  appStore.setTheme(theme)
  appStore.setCssVarTheme()
}
if (isHeaderNavLayout(layout.value) && !appStore.getIsDark) {
  headerTheme.value = '#fff'
  setHeaderTheme('#fff')
}

// 监听layout变化，重置一些主题色
watch(
  () => layout.value,
  (n) => {
    if (isHeaderNavLayout(n) && !appStore.getIsDark) {
      headerTheme.value = '#fff'
      setHeaderTheme('#fff')
    } else {
      setMenuTheme(unref(menuTheme))
    }
  }
)

// 拷贝
const copyConfig = async () => {
  const { copy, copied, isSupported } = useClipboard({
    legacy: true,
    source: `
      // ${t('setting.breadcrumb')}
      breadcrumb: ${appStore.getBreadcrumb},
      // ${t('setting.breadcrumbIcon')}
      breadcrumbIcon: ${appStore.getBreadcrumbIcon},
      // ${t('setting.hamburgerIcon')}
      hamburger: ${appStore.getHamburger},
      // ${t('setting.screenfullIcon')}
      screenfull: ${appStore.getScreenfull},
      // ${t('setting.sizeIcon')}
      size: ${appStore.getSize},
      // ${t('setting.localeIcon')}
      locale: ${appStore.getLocale},
      // ${t('setting.messageIcon')}
      message: ${appStore.getMessage},
      // ${t('setting.imIcon')}
      im: ${appStore.getIm},
      // ${t('setting.tagsView')}
      tagsView: ${appStore.getTagsView},
      // ${t('setting.tagsViewImmerse')}
      tagsViewImmerse: ${appStore.getTagsViewImmerse},
      // ${t('setting.tagsViewIcon')}
      tagsViewIcon: ${appStore.getTagsViewIcon},
      // ${t('setting.logo')}
      logo: ${appStore.getLogo},
      // ${t('setting.uniqueOpened')}
      uniqueOpened: ${appStore.getUniqueOpened},
      // ${t('setting.fixedHeader')}
      fixedHeader: ${appStore.getFixedHeader},
      // ${t('setting.footer')}
      footer: ${appStore.getFooter},
      // ${t('setting.greyMode')}
      greyMode: ${appStore.getGreyMode},
      // ${t('setting.layout')}
      layout: '${appStore.getLayout}',
      // ${t('setting.theme')}
      isDark: ${appStore.getIsDark},
      // ${t('setting.sizeIcon')}
      currentSize: '${appStore.getCurrentSize}',
      // ${t('setting.systemTheme')}
      theme: {
        // ${t('setting.systemTheme')}
        elColorPrimary: '${appStore.getTheme.elColorPrimary}',
        // ${t('shell.menuBorder')}
        leftMenuBorderColor: '${appStore.getTheme.leftMenuBorderColor}',
        // ${t('shell.menuBackground')}
        leftMenuBgColor: '${appStore.getTheme.leftMenuBgColor}',
        // ${t('shell.menuLightBackground')}
        leftMenuBgLightColor: '${appStore.getTheme.leftMenuBgLightColor}',
        // ${t('shell.menuActiveBackground')}
        leftMenuBgActiveColor: '${appStore.getTheme.leftMenuBgActiveColor}',
        // ${t('shell.menuCollapsedBackground')}
        leftMenuCollapseBgActiveColor: '${appStore.getTheme.leftMenuCollapseBgActiveColor}',
        // ${t('shell.menuText')}
        leftMenuTextColor: '${appStore.getTheme.leftMenuTextColor}',
        // ${t('shell.menuActiveText')}
        leftMenuTextActiveColor: '${appStore.getTheme.leftMenuTextActiveColor}',
        // ${t('shell.logoText')}
        logoTitleTextColor: '${appStore.getTheme.logoTitleTextColor}',
        // ${t('shell.logoBorder')}
        logoBorderColor: '${appStore.getTheme.logoBorderColor}',
        // ${t('shell.headerBackground')}
        topHeaderBgColor: '${appStore.getTheme.topHeaderBgColor}',
        // ${t('shell.headerText')}
        topHeaderTextColor: '${appStore.getTheme.topHeaderTextColor}',
        // ${t('shell.headerHover')}
        topHeaderHoverColor: '${appStore.getTheme.topHeaderHoverColor}',
        // ${t('shell.headerBorder')}
        topToolBorderColor: '${appStore.getTheme.topToolBorderColor}'
      }
    `
  })
  if (!unref(isSupported)) {
    ElMessage.error(t('setting.copyFailed'))
  } else {
    await copy()
    if (unref(copied)) {
      ElMessage.success(t('setting.copySuccess'))
    }
  }
}

// 清空缓存
const clear = () => {
  const { wsCache } = useCache()
  wsCache.delete(CACHE_KEY.LAYOUT)
  wsCache.delete(CACHE_KEY.THEME)
  wsCache.delete(CACHE_KEY.IS_DARK)
  window.location.reload()
}
</script>

<template>
  <ElDrawer
    v-model="drawerVisible"
    :direction="drawerDirection"
    size="350px"
    class="rain-settings"
    :title="t('setting.projectSetting')"
  >
    <template #header="{ titleId }">
      <div class="flex items-center justify-between gap-8px">
        <span :id="titleId" class="text-16px font-700" role="heading" aria-level="2">{{
          t('setting.projectSetting')
        }}</span>
        <LocaleDropdown />
      </div>
    </template>

    <div class="text-center">
      <!-- 主题 -->
      <ElDivider>{{ t('setting.theme') }}</ElDivider>
      <ThemeSwitch />

      <!-- 布局 -->
      <ElDivider>{{ t('setting.layout') }}</ElDivider>
      <LayoutRadioPicker />

      <!-- 系统主题 -->
      <ElDivider>{{ t('setting.systemTheme') }}</ElDivider>
      <ColorRadioPicker
        :label="t('setting.systemTheme')"
        v-model="systemTheme"
        :schema="[
          '#409eff',
          '#009688',
          '#536dfe',
          '#ff5c93',
          '#ee4f12',
          '#0096c7',
          '#9c27b0',
          '#ff9800'
        ]"
        @change="setSystemTheme"
      />

      <!-- 头部主题 -->
      <ElDivider>{{ t('setting.headerTheme') }}</ElDivider>
      <ColorRadioPicker
        :label="t('setting.headerTheme')"
        v-model="headerTheme"
        :schema="[
          '#fff',
          '#151515',
          '#5172dc',
          '#e74c3c',
          '#24292e',
          '#394664',
          '#009688',
          '#383f45'
        ]"
        @change="setHeaderTheme"
      />

      <!-- 菜单主题 -->
      <template v-if="!isHeaderNavLayout(layout)">
        <ElDivider>{{ t('setting.menuTheme') }}</ElDivider>
        <ColorRadioPicker
          :label="t('setting.menuTheme')"
          v-model="menuTheme"
          :schema="[
            '#fff',
            '#001529',
            '#212121',
            '#273352',
            '#191b24',
            '#383f45',
            '#001628',
            '#344058'
          ]"
          @change="setMenuTheme"
        />
      </template>
    </div>

    <!-- 界面显示 -->
    <ElDivider>{{ t('setting.interfaceDisplay') }}</ElDivider>
    <InterfaceDisplay />

    <ElDivider />
    <div>
      <el-button class="w-full" type="primary" @click="copyConfig">
        {{ t('setting.copy') }}
      </el-button>
    </div>
    <div class="mt-5px">
      <el-button class="w-full" type="danger" @click="clear">
        {{ t('setting.clearAndReset') }}
      </el-button>
    </div>
  </ElDrawer>
</template>

<style lang="scss">
.rain-settings {
  max-inline-size: 100vw;
}
.rain-settings button:focus-visible {
  box-shadow: 0 0 0 2px var(--el-text-color-primary);
  border-radius: 2px;
  outline: none;
}
</style>
