<template>
  <div class="cloudflare-ssl">
    <div class="section-header">
      <div class="header-content">
        <div class="header-icon">
          <el-icon>
            <Connection />
          </el-icon>
        </div>
        <div class="header-text">
          <h3>Cloudflare Universal SSL</h3>
          <p>免费的边缘证书，适合大多数在Cloudflare边缘终止TLS的场景</p>
        </div>
      </div>
    </div>

    <!-- 域名选择器 -->
    <div class="domain-selector-wrapper">
      <el-card class="domain-selector" shadow="hover">
        <template #header>
          <div class="card-title">
            <el-icon class="card-icon">
              <Monitor />
            </el-icon>
            <span>域名选择</span>
          </div>
        </template>
        <div class="selector-content">
          <div class="selector-item">
            <label class="selector-label">选择域名：</label>
            <el-select v-model="selectedZoneId" placeholder="请选择要管理的域名" filterable clearable @change="onZoneChange"
              class="domain-select">
              <el-option v-for="zone in zones" :key="zone.id" :label="zone.name" :value="zone.id">
                <span class="option-text">{{ zone.name }}</span>
              </el-option>
            </el-select>
          </div>
          <el-button @click="$emit('load-zones')" :loading="loadingZones" type="primary" :icon="Refresh"
            class="refresh-btn">
            {{ loadingZones ? '加载中...' : '刷新域名列表' }}
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- Universal SSL 状态和操作 -->
    <el-card v-if="selectedZoneId" shadow="hover" class="ssl-status-card">
      <template #header>
        <div class="card-header">
          <div class="card-title">
            <el-icon class="card-icon">
              <Lock />
            </el-icon>
            <span>Universal SSL 状态</span>
          </div>
          <el-button @click="checkUniversalSslStatus" :loading="loadingUniversalStatus" size="small" type="primary"
            :icon="Refresh">
            {{ loadingUniversalStatus ? '检查中...' : '刷新状态' }}
          </el-button>
        </div>
      </template>

      <div class="ssl-status-content">
        <div v-if="universalSslStatus" class="status-info">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="状态">
              <el-tag :type="getStatusTagType(universalSslStatus.status)">
                {{ universalSslStatus.status }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="类型">
              {{ universalSslStatus.type || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="验证方式">
              {{ universalSslStatus.validation_method || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="证书颁发机构">
              {{ universalSslStatus.certificate_authority || '-' }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="ssl-actions">
          <el-button type="primary" @click="enableUniversalSsl" :loading="operatingUniversal"
            :disabled="universalSslStatus?.status === 'active'">
            启用 Universal SSL
          </el-button>
          <el-button type="danger" @click="disableUniversalSsl" :loading="operatingUniversal"
            :disabled="!universalSslStatus || universalSslStatus.status !== 'active'">
            禁用 Universal SSL
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 自定义证书上传 -->
    <el-card v-if="selectedZoneId" shadow="hover" class="custom-cert-card">
      <template #header>
        <div class="card-title">
          <el-icon class="card-icon">
            <Upload />
          </el-icon>
          <span>上传自定义证书</span>
        </div>
      </template>

      <el-form :model="customCertForm" label-width="120px">
        <el-form-item label="证书内容 (PEM)">
          <el-input v-model="customCertForm.cert_pem" type="textarea" :rows="6" placeholder="-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----" />
        </el-form-item>
        <el-form-item label="私钥 (PEM)">
          <el-input v-model="customCertForm.key_pem" type="textarea" :rows="6" placeholder="-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----" />
        </el-form-item>
        <el-form-item label="证书链 (可选)">
          <el-input v-model="customCertForm.bundle_pem" type="textarea" :rows="4" placeholder="证书链内容 (可选)" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="uploadCustomCertificate" :loading="uploadingCustom"
            :disabled="!customCertForm.cert_pem || !customCertForm.key_pem">
            上传证书
          </el-button>
          <el-button @click="resetCustomCertForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Connection,
  Monitor,
  Lock,
  Upload,
  Refresh,
  Check,
  Close
} from "@element-plus/icons-vue";
import {
  enableCloudflareUniversalSsl,
  getCloudflareUniversalSsl,
  disableCloudflareUniversalSsl,
  uploadCustomSslCertificate,
  type CloudflareZone,
  type CustomSslRequest
} from "@/api/cloudflare";

interface Props {
  zones: CloudflareZone[];
  loadingZones: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'load-zones': [];
}>();

// 状态
const selectedZoneId = ref<string>("");
const universalSslStatus = ref<any>(null);
const loadingUniversalStatus = ref(false);
const operatingUniversal = ref(false);

// 自定义证书表单
const customCertForm = reactive<CustomSslRequest>({
  cert_pem: "",
  key_pem: "",
  bundle_pem: ""
});
const uploadingCustom = ref(false);

// 域名切换
function onZoneChange() {
  universalSslStatus.value = null;
  if (selectedZoneId.value) {
    checkUniversalSslStatus();
  }
}

// 检查 Universal SSL 状态
async function checkUniversalSslStatus() {
  if (!selectedZoneId.value) return;

  loadingUniversalStatus.value = true;
  try {
    const response = await getCloudflareUniversalSsl(selectedZoneId.value);
    if (response.success) {
      universalSslStatus.value = response.data;
    }
  } catch (error: any) {
    if (error?.response?.status !== 404) {
      ElMessage.error("获取SSL状态失败");
    }
  } finally {
    loadingUniversalStatus.value = false;
  }
}

// 启用 Universal SSL
async function enableUniversalSsl() {
  if (!selectedZoneId.value) return;

  operatingUniversal.value = true;
  try {
    const response = await enableCloudflareUniversalSsl(selectedZoneId.value);
    if (response.success) {
      ElMessage.success("Universal SSL 启用成功");
      checkUniversalSslStatus();
    }
  } catch (error) {
    ElMessage.error("启用 Universal SSL 失败");
  } finally {
    operatingUniversal.value = false;
  }
}

// 禁用 Universal SSL
async function disableUniversalSsl() {
  if (!selectedZoneId.value) return;

  try {
    await ElMessageBox.confirm("确认禁用 Universal SSL？", "确认操作", {
      type: "warning"
    });

    operatingUniversal.value = true;
    const response = await disableCloudflareUniversalSsl(selectedZoneId.value);
    if (response.success) {
      ElMessage.success("Universal SSL 禁用成功");
      checkUniversalSslStatus();
    }
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error("禁用 Universal SSL 失败");
    }
  } finally {
    operatingUniversal.value = false;
  }
}

// 上传自定义证书
async function uploadCustomCertificate() {
  if (!selectedZoneId.value) return;

  uploadingCustom.value = true;
  try {
    const response = await uploadCustomSslCertificate(selectedZoneId.value, customCertForm);
    if (response.success) {
      ElMessage.success("自定义证书上传成功");
      resetCustomCertForm();
    }
  } catch (error) {
    ElMessage.error("上传自定义证书失败");
  } finally {
    uploadingCustom.value = false;
  }
}

// 重置自定义证书表单
function resetCustomCertForm() {
  customCertForm.cert_pem = "";
  customCertForm.key_pem = "";
  customCertForm.bundle_pem = "";
}

// 工具函数
function getStatusTagType(status: string) {
  switch (status) {
    case 'active':
      return 'success';
    case 'pending':
      return 'warning';
    case 'failed':
      return 'danger';
    default:
      return 'info';
  }
}
</script>

<style scoped>
.cloudflare-ssl {
  padding: 0 24px 24px;
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
  background: transparent;
}

.section-header {
  margin-bottom: 32px;
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 1);
  backdrop-filter: blur(10px);
  z-index: 30;
  padding: 16px 0 20px;
  border-radius: 12px;
}

.header-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.header-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ff7849, #ff9a56);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  box-shadow: 0 4px 16px rgba(255, 120, 73, 0.3);
}

.header-text h3 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}

.header-text p {
  margin: 0;
  color: #606266;
  font-size: 15px;
  line-height: 1.5;
  opacity: 0.8;
}

.domain-selector-wrapper {
  margin-bottom: 24px;
}

.domain-selector {
  border-radius: 16px;
  border: 1px solid rgba(64, 158, 255, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
}

.domain-selector:hover {
  border-color: rgba(64, 158, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(64, 158, 255, 0.15);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  font-size: 16px;
  color: #303133;
}

.card-icon {
  font-size: 18px;
  color: #409eff;
}

.selector-content {
  display: flex;
  align-items: flex-end;
  gap: 20px;
  flex-wrap: wrap;
}

.selector-item {
  flex: 1;
  min-width: 280px;
}

.selector-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #606266;
  font-size: 14px;
}

.domain-select {
  width: 100%;
}

.option-text {
  font-weight: 500;
}

.refresh-btn {
  border-radius: 8px;
  font-weight: 500;
  min-width: 140px;
  height: 40px;
}

.ssl-status-card,
.custom-cert-card {
  margin-bottom: 24px;
  border-radius: 16px;
  border: 1px solid rgba(64, 158, 255, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
}

.ssl-status-card:hover,
.custom-cert-card:hover {
  border-color: rgba(64, 158, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(64, 158, 255, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ssl-status-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.status-info {
  background: rgba(245, 247, 250, 0.6);
  border-radius: 12px;
  padding: 20px;
}

.ssl-actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  padding: 16px;
  background: rgba(245, 247, 250, 0.3);
  border-radius: 12px;
}

.action-btn {
  border-radius: 10px;
  font-weight: 600;
  padding: 12px 24px;
  transition: all 0.3s ease;
  min-width: 180px;
  height: 48px;
}

.enable-btn {
  background: linear-gradient(135deg, #67c23a, #85ce61);
  border: none;
}

.enable-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #85ce61, #67c23a);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(103, 194, 58, 0.4);
}

.disable-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(245, 108, 108, 0.4);
}

/* 表单样式优化 */
:deep(.el-form-item__label) {
  font-weight: 500;
  color: #606266;
}

:deep(.el-textarea__inner) {
  border-radius: 8px;
  border: 1px solid #dcdfe6;
  transition: all 0.3s ease;
}

:deep(.el-textarea__inner:focus) {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
}

:deep(.el-descriptions) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-descriptions__header) {
  background: #f8f9fa;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .cloudflare-ssl {
    padding: 16px;
  }

  .section-header {
    margin-bottom: 24px;
    padding: 12px 0 16px;
  }

  .header-content {
    gap: 12px;
  }

  .header-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }

  .header-text h3 {
    font-size: 20px;
  }

  .header-text p {
    font-size: 14px;
  }

  .selector-content {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .selector-item {
    min-width: auto;
  }

  .refresh-btn {
    width: 100%;
  }

  .ssl-actions {
    flex-direction: column;
    gap: 12px;
  }

  .action-btn {
    width: 100%;
    min-width: auto;
  }

  .card-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
}

@media (max-width: 480px) {
  .cloudflare-ssl {
    padding: 12px;
  }

  .status-info {
    padding: 16px;
  }

  .ssl-actions {
    padding: 12px;
  }
}
</style>
