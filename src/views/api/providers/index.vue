<template>
  <div class="providers-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>AI 服务提供商状态</span>
          <el-button type="primary" @click="loadProviders" :loading="loading">
            <el-icon>
              <Refresh />
            </el-icon>
            刷新
          </el-button>
        </div>
      </template>

      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="3" animated />
      </div>

      <div v-else-if="providers.length === 0" class="empty-container">
        <el-empty description="暂无提供商数据" />
      </div>

      <div v-else class="providers-grid">
        <el-card v-for="provider in providers" :key="provider.id" class="provider-card"
          :class="{ 'inactive': provider.status !== 'active' }">
          <template #header>
            <div class="provider-header">
              <div class="provider-info">
                <h3>{{ provider.name }}</h3>
                <el-tag :type="getStatusType(provider.status)" size="small">
                  {{ getStatusText(provider.status) }}
                </el-tag>
              </div>
              <div class="provider-type">
                <el-tag type="info" size="small">{{ provider.type }}</el-tag>
              </div>
            </div>
          </template>

          <div class="provider-details">
            <div class="detail-row">
              <span class="label">成本 (每token):</span>
              <span class="value">${{ provider.cost_per_token.toFixed(6) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">最大tokens:</span>
              <span class="value">{{ provider.max_tokens.toLocaleString() }}</span>
            </div>
            <div class="detail-row">
              <span class="label">延迟:</span>
              <span class="value">{{ provider.latency }}ms</span>
            </div>
            <div class="detail-row">
              <span class="label">成功率:</span>
              <span class="value">
                <el-progress :percentage="Math.round(provider.success_rate * 100)"
                  :color="getSuccessRateColor(provider.success_rate)" :show-text="false"
                  style="width: 60px; display: inline-block; margin-right: 8px;" />
                {{ Math.round(provider.success_rate * 100) }}%
              </span>
            </div>
          </div>
        </el-card>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { Refresh } from "@element-plus/icons-vue";
import { getProviders, type AiProviderInfo } from "@/api/ai";

defineOptions({ name: "ApiProviders" });

const loading = ref(false);
const providers = ref<AiProviderInfo[]>([]);

function getStatusType(status: string) {
  switch (status) {
    case 'active': return 'success';
    case 'inactive': return 'danger';
    case 'maintenance': return 'warning';
    default: return 'info';
  }
}

function getStatusText(status: string) {
  switch (status) {
    case 'active': return '活跃';
    case 'inactive': return '停用';
    case 'maintenance': return '维护中';
    default: return status;
  }
}

function getSuccessRateColor(rate: number) {
  if (rate >= 0.95) return '#67c23a';
  if (rate >= 0.85) return '#e6a23c';
  return '#f56c6c';
}

async function loadProviders() {
  loading.value = true;
  try {
    const data = await getProviders();
    providers.value = data;
    ElMessage.success(`成功加载 ${data.length} 个提供商`);
  } catch (error) {
    console.error('Failed to load providers:', error);
    ElMessage.error('加载提供商数据失败');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadProviders();
});
</script>

<style scoped>
.providers-page {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.loading-container {
  padding: 20px;
}

.empty-container {
  padding: 40px;
  text-align: center;
}

.providers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.provider-card {
  transition: all 0.3s ease;
}

.provider-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.provider-card.inactive {
  opacity: 0.6;
  background-color: #f5f7fa;
}

.provider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.provider-info h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
}

.provider-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-row:last-child {
  border-bottom: none;
}

.label {
  font-weight: 500;
  color: #606266;
  font-size: 14px;
}

.value {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
  display: flex;
  align-items: center;
}

@media (max-width: 768px) {
  .providers-grid {
    grid-template-columns: 1fr;
  }

  .provider-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
