<template>
  <div class="ssl-management-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-title">
          <el-icon class="title-icon">
            <Lock />
          </el-icon>
          <h2>SSL证书管理</h2>
        </div>
        <p class="page-description">支持Cloudflare Universal SSL和Let's Encrypt自动申请，一站式SSL证书管理解决方案</p>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="ssl-content">
      <el-tabs v-model="activeTab" class="ssl-tabs">
        <!-- Cloudflare Universal SSL -->
        <el-tab-pane label="Cloudflare Universal SSL" name="cloudflare">
          <CloudflareSSL :zones="zones" @load-zones="loadZones" :loading-zones="loadingZones" />
        </el-tab-pane>

        <!-- Let's Encrypt -->
        <el-tab-pane label="Let's Encrypt" name="letsencrypt">
          <LetsEncryptSSL />
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { Lock } from "@element-plus/icons-vue";
import { getCloudflareZones, type CloudflareZone } from "@/api/cloudflare";
import CloudflareSSL from "./components/CloudflareSSL.vue";
import LetsEncryptSSL from "./components/LetsEncryptSSL.vue";

defineOptions({ name: "SslManagement" });

// 基础状态
const activeTab = ref("cloudflare");
const zones = ref<CloudflareZone[]>([]);
const loadingZones = ref(false);

// 初始化
onMounted(() => {
  loadZones();
});

// 加载域名列表
async function loadZones() {
  loadingZones.value = true;
  try {
    const response = await getCloudflareZones();
    if (response.success) {
      zones.value = response.data || [];
    }
  } catch (error) {
    ElMessage.error("加载域名列表失败");
  } finally {
    loadingZones.value = false;
  }
}
</script>

<style scoped>
.ssl-management-page {
  padding: 24px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
}

.page-header {
  margin-bottom: 32px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.title-icon {
  font-size: 28px;
  color: #409eff;
  background: linear-gradient(135deg, #409eff, #67c23a);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-left h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #409eff, #67c23a);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
}

.page-description {
  margin: 0;
  color: #606266;
  font-size: 16px;
  line-height: 1.6;
  opacity: 0.8;
}

.ssl-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.ssl-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.ssl-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 20px 24px 0;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 20;
}

.ssl-tabs :deep(.el-tabs__nav-wrap) {
  padding: 0;
}

.ssl-tabs :deep(.el-tabs__nav) {
  display: flex;
  gap: 8px;
}

.ssl-tabs :deep(.el-tabs__item) {
  font-size: 16px;
  font-weight: 600;
  padding-left: 24px !important;
  padding-right: 24px !important;
  height: 48px;
  line-height: 48px;
  border-radius: 12px 12px 0 0;
  margin-right: 0;
  transition: all 0.3s ease;
  color: #606266;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.ssl-tabs :deep(.el-tabs__item.is-active) {
  background: linear-gradient(135deg, #409eff, #67c23a);
  color: white;
  border: none;
}

.ssl-tabs :deep(.el-tabs__item:hover) {
  color: #409eff;
  background: rgba(64, 158, 255, 0.1);
}

.ssl-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  background: transparent;
}

.ssl-tabs :deep(.el-tab-pane) {
  height: 100%;
  overflow-y: auto;
}

.ssl-tabs :deep(.el-tabs__active-bar) {
  display: none;
}

.ssl-tabs :deep(.el-tabs__nav-scroll) {
  overflow: visible;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .ssl-management-page {
    padding: 16px;
  }

  .page-header {
    padding: 20px;
    margin-bottom: 24px;
  }

  .header-left h2 {
    font-size: 24px;
  }

  .title-icon {
    font-size: 24px;
  }

  .page-description {
    font-size: 14px;
  }

  .ssl-tabs :deep(.el-tabs__item) {
    font-size: 14px;
    padding: 0 16px;
    height: 40px;
    line-height: 40px;
  }
}
</style>
