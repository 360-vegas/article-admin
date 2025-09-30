<template>
  <div class="rules-management-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2>{{ $t("menus.domainRules") }}</h2>
        <p class="page-description">{{ $t("rules.pageDescription") }}</p>
      </div>
    </div>


    <!-- 规则管理内容区域 -->
    <div class="rules-content">
      <el-empty :description="$t('rules.comingSoon')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Monitor, Lock, Setting } from "@element-plus/icons-vue";
import { useI18n } from "vue-i18n";

defineOptions({ name: "RulesManagement" });

const { t } = useI18n();

// 响应式数据
const activeTab = ref("rules");

</script>

<style scoped>
.rules-management-page {
  padding: 20px;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.page-header {
  margin-bottom: 20px;
}

.header-left h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.page-description {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.main-nav {
  margin-bottom: 20px;
}

.nav-menu {
  border-bottom: 1px solid #e4e7ed;
}

.nav-item {
  font-weight: 500;
}

.rules-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
