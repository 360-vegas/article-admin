<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { emitter } from "@/utils/mitt";
import { useNav } from "@/layout/hooks/useNav";
import { responsiveStorageNameSpace } from "@/config";
import { storageLocal, isAllEmpty } from "@pureadmin/utils";
import { findRouteByPath, getParentPaths } from "@/router/utils";
import { usePermissionStoreHook } from "@/store/modules/permission";
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { transformI18n } from "@/plugins/i18n";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import LaySidebarLogo from "../lay-sidebar/components/SidebarLogo.vue";

const route = useRoute();
const router = useRouter();
const isShow = ref(false);
const showLogo = ref(
  storageLocal().getItem<StorageConfigs>(
    `${responsiveStorageNameSpace()}configure`
  )?.showLogo ?? true
);

const {
  device,
  pureApp,
  isCollapse,
  tooltipEffect,
  menuSelect
} = useNav();

// 双栏模式折叠状态
const isDualColumnCollapsed = ref(false);

// 监听折叠状态变化
watch(isCollapse, (newVal) => {
  isDualColumnCollapsed.value = newVal;
});

// 当前选中的父菜单
const activeParentMenu = ref(null);
// 当前选中的子菜单
const activeChildMenu = ref(null);

const menuData = computed(() => {
  return usePermissionStoreHook().wholeMenus;
});

const loading = computed(() =>
  menuData.value.length === 0 ? true : false
);

const defaultActive = computed(() =>
  !isAllEmpty(route.meta?.activePath) ? route.meta.activePath : route.path
);

// 获取当前路由对应的父菜单和子菜单
function getCurrentMenus() {
  const currentPath = defaultActive.value;
  const wholeMenus = usePermissionStoreHook().wholeMenus;
  
  for (const parentMenu of wholeMenus) {
    if (parentMenu.children && parentMenu.children.length > 0) {
      for (const childMenu of parentMenu.children) {
        if (childMenu.path === currentPath) {
          activeParentMenu.value = parentMenu;
          activeChildMenu.value = childMenu;
          return;
        }
      }
    }
  }
  
  // 如果没有找到匹配的子菜单，尝试找到父菜单
  for (const parentMenu of wholeMenus) {
    if (parentMenu.path === currentPath) {
      activeParentMenu.value = parentMenu;
      activeChildMenu.value = parentMenu.children?.[0] || null;
      return;
    }
  }
  
  // 默认选择第一个有子菜单的父菜单
  const firstParentWithChildren = wholeMenus.find(menu => menu.children && menu.children.length > 0);
  if (firstParentWithChildren) {
    activeParentMenu.value = firstParentWithChildren;
    activeChildMenu.value = firstParentWithChildren.children[0];
  }
}

// 点击父菜单
function handleParentMenuClick(parentMenu) {
  activeParentMenu.value = parentMenu;
  if (parentMenu.children && parentMenu.children.length > 0) {
    // 自动选中第一个子菜单
    activeChildMenu.value = parentMenu.children[0];
    // 跳转到第一个子菜单
    const firstChild = parentMenu.children[0];
    if (firstChild.path) {
      router.push(firstChild.path);
    }
  }
}

// 点击子菜单
function handleChildMenuClick(childMenu) {
  activeChildMenu.value = childMenu;
  router.push(childMenu.path);
}

onMounted(() => {
  getCurrentMenus();
});

watch(
  () => route.path,
  () => {
    getCurrentMenus();
  }
);

onBeforeUnmount(() => {
  emitter.off("logoChange");
});
</script>

<template>
  <div
    v-loading="loading"
    :class="['sidebar-container', 'dual-column-sidebar', showLogo ? 'has-logo' : 'no-logo']"
    @mouseenter.prevent="isShow = true"
    @mouseleave.prevent="isShow = false"
  >
    <LaySidebarLogo v-if="showLogo" :collapse="isCollapse" />
    
    <div class="dual-column-container">
      <!-- 左侧父菜单 -->
      <div 
        :class="[
          'parent-menu-container',
          { 'is-collapsed': isDualColumnCollapsed }
        ]"
      >
        <el-scrollbar wrap-class="scrollbar-wrapper">
          <div class="parent-menu-list">
            <div
              v-for="parentMenu in menuData"
              :key="parentMenu.path"
              :class="[
                'parent-menu-item',
                { 'is-active': activeParentMenu?.path === parentMenu.path }
              ]"
              @click="handleParentMenuClick(parentMenu)"
            >
              <div class="parent-menu-icon">
                <component
                  v-if="parentMenu.meta?.icon"
                  :is="useRenderIcon(parentMenu.meta.icon)"
                />
              </div>
              <div 
                v-if="!isDualColumnCollapsed"
                class="parent-menu-title"
              >
                {{ transformI18n(parentMenu.meta?.title) }}
              </div>
            </div>
          </div>
        </el-scrollbar>
      </div>
      
      <!-- 右侧子菜单 -->
      <div 
        v-if="!isDualColumnCollapsed"
        class="child-menu-container"
      >
        <div class="child-menu-header">
          <h3 class="child-menu-header-title">
            {{ transformI18n(activeParentMenu?.meta?.title) }}
          </h3>
        </div>
        <el-scrollbar wrap-class="scrollbar-wrapper">
          <div class="child-menu-list">
            <div
              v-for="childMenu in activeParentMenu?.children || []"
              :key="childMenu.path"
              :class="[
                'child-menu-item',
                { 'is-active': activeChildMenu?.path === childMenu.path }
              ]"
              @click="handleChildMenuClick(childMenu)"
            >
              <div class="child-menu-title">
                {{ transformI18n(childMenu.meta?.title) }}
              </div>
            </div>
          </div>
        </el-scrollbar>
      </div>
    </div>
    
    
  </div>
</template>

<style scoped>
:deep(.el-loading-mask) {
  opacity: 0.45;
}

.dual-column-sidebar {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.dual-column-container {
  display: flex;
  flex: 1;
  height: 0;
}

.parent-menu-container {
  width: 100px;
  background: var(--pure-theme-menu-bg);
  border-right: 1px solid var(--pure-border-color);
  flex-shrink: 0;
  transition: width 0.3s ease;
  position: relative;
  overflow: visible;
  padding-left: 8px;
}

.parent-menu-container .el-scrollbar {
  overflow: visible !important;
}

.parent-menu-container .scrollbar-wrapper {
  overflow: visible !important;
}

.parent-menu-container.is-collapsed {
  width: 54px;
}

.child-menu-container {
  flex: 1;
  background: var(--pure-theme-sub-menu-bg);
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.child-menu-header {
  padding: 16px 20px 8px;
  border-bottom: 1px solid var(--pure-border-color);
  background: var(--pure-theme-sub-menu-bg);
}

.child-menu-header-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--pure-theme-menu-text);
  line-height: 1.2;
}

.parent-menu-list {
  padding: 8px 0;
}

.parent-menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60px;
  margin: 4px 6px;
  padding: 8px 6px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.3s ease;
  color: var(--pure-theme-menu-text);
  position: relative;
  min-width: 80px;
}

.parent-menu-item:hover {
  background: var(--pure-theme-menu-hover);
  color: var(--pure-theme-menu-title-hover);
}

.parent-menu-item.is-active {
  background: #fff;
  color: var(--el-color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.parent-menu-item.is-active .parent-menu-icon,
.parent-menu-item.is-active .parent-menu-icon svg {
  color: #409eff !important;
}

.parent-menu-item.is-active .parent-menu-title {
  color: #409eff !important;
}

.parent-menu-item.is-active::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 24px;
  background: #409eff;
  border-radius: 0 2px 2px 0;
  z-index: 1;
}

.parent-menu-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-bottom: 4px;
  font-size: 18px;
  color: inherit;
}

.parent-menu-icon svg {
  width: 18px;
  height: 18px;
  color: inherit;
}

.parent-menu-title {
  font-size: 12px;
  text-align: center;
  line-height: 1.2;
  word-break: break-all;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: inherit;
  min-width: 60px;
  padding: 0 2px;
}

.child-menu-list {
  padding: 8px 0;
  flex: 1;
  overflow: hidden;
}

.child-menu-item {
  display: flex;
  align-items: center;
  height: 40px;
  margin: 2px 12px;
  padding: 0 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s ease;
  color: var(--pure-theme-menu-text);
  position: relative;
}

.child-menu-item:hover {
  background: var(--pure-theme-menu-hover);
  color: var(--pure-theme-menu-title-hover);
}

.child-menu-item.is-active {
  background: var(--el-color-primary);
  color: #fff;
}

.child-menu-item.is-active .child-menu-title {
  color: #fff !important;
}

.child-menu-title {
  font-size: 14px;
  line-height: 40px;
}

.scrollbar-wrapper {
  overflow-x: hidden !important;
}

:deep(.el-scrollbar__bar.is-vertical) {
  right: 0;
}
</style>
