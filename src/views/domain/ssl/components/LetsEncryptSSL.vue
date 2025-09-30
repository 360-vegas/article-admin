<template>
  <div class="letsencrypt-ssl">
    <div class="section-header">
      <div class="header-content">
        <div class="header-icon">
          <el-icon>
            <Key />
          </el-icon>
        </div>
        <div class="header-text">
          <h3>Let's Encrypt 证书</h3>
          <p>使用DNS-01验证自动申请免费SSL证书，支持通配符域名</p>
        </div>
      </div>
    </div>

    <!-- 申请新证书 -->
    <el-card shadow="hover" class="le-request-card">
      <template #header>
        <div class="card-title">
          <el-icon class="card-icon">
            <Document />
          </el-icon>
          <span>申请新证书</span>
        </div>
      </template>

      <el-form :model="leRequestForm" label-width="120px" :rules="leFormRules" ref="leFormRef">
        <el-form-item label="部署类型" prop="deploy">
          <el-radio-group v-model="leRequestForm.deploy">
            <el-radio value="edge">Edge (边缘证书，上传到Cloudflare)</el-radio>
            <el-radio value="origin">Origin (源站证书，下载后自行安装)</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="域名列表" prop="domains">
          <div class="domains-container">
            <el-select v-model="leRequestForm.domains" multiple filterable allow-create default-first-option
              :reserve-keyword="false" placeholder="请选择或输入域名，支持批量粘贴" style="width: 100%" :loading="loadingDomains"
              @focus="loadDomains" @paste="handlePaste">
              <el-option v-for="domain in availableDomains" :key="domain.name" :label="domain.name"
                :value="domain.name" />
            </el-select>
            <div class="batch-input-container">
              <el-input v-model="batchInput" type="textarea" :rows="3" placeholder="批量粘贴域名（支持逗号、换行、分号等分隔符）"
                @paste="handleBatchPaste" @blur="processBatchInput" />
              <div class="batch-actions">
                <el-button size="small" @click="processBatchInput" type="primary">解析并添加</el-button>
                <el-button size="small" @click="clearBatchInput">清空</el-button>
              </div>
            </div>
          </div>
          <div class="form-help">
            支持通配符域名，如：*.example.com。可以从现有域名中选择，也可以手动输入新域名。
            支持批量粘贴：example.com, *.example.com; test.com 或每行一个域名。
          </div>
        </el-form-item>
        <el-form-item label="邮箱地址" prop="email">
          <el-input v-model="leRequestForm.email" placeholder="用于接收证书相关通知" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="requestLeCertificate" :loading="requestingLe">
            申请证书
          </el-button>
          <el-button @click="resetLeForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 证书申请历史和状态 -->
    <el-card shadow="hover" class="le-history-card">
      <template #header>
        <div class="card-header">
          <div class="card-title">
            <el-icon class="card-icon">
              <List />
            </el-icon>
            <span>申请历史</span>
          </div>
          <div class="header-actions">
            <el-input v-model="searchKeyword" placeholder="搜索域名或邮箱" style="width: 200px; margin-right: 8px;" clearable
              @keyup.enter="handleSearch" @clear="clearSearch" />
            <el-select v-model="statusFilter" placeholder="状态过滤" style="width: 120px; margin-right: 8px;" clearable
              @change="handleStatusFilterChange">
              <el-option label="全部" value="" />
              <el-option label="排队中" value="queued" />
              <el-option label="处理中" value="pending" />
              <el-option label="已完成" value="valid" />
              <el-option label="失败" value="failed" />
            </el-select>
            <el-button @click="loadLeRequests" :loading="loadingLeRequests" size="small" type="primary" :icon="Refresh">
              {{ loadingLeRequests ? '加载中...' : '刷新' }}
            </el-button>
            <el-button @click="testWebSocketData" size="small" type="warning">
              测试WebSocket数据
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="leRequests" style="width: 100%" v-loading="loadingLeRequests">
        <el-table-column label="请求ID" prop="request_id" width="160" show-overflow-tooltip />
        <el-table-column label="域名" width="200">
          <template #default="{ row }">
            <div class="domains-cell">
              <el-tag v-for="domain in row.domains" :key="domain" size="small"
                style="margin-right: 4px; margin-bottom: 2px;">
                {{ domain }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="邮箱" prop="email" width="180" show-overflow-tooltip />
        <el-table-column label="部署类型" prop="deploy" width="100">
          <template #default="{ row }">
            <el-tag :type="row.deploy === 'edge' ? 'primary' : 'success'" size="small">
              {{ row.deploy === 'edge' ? '边缘证书' : '源站证书' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getLeStatusTagType(row.status)" size="small">
              {{ getStatusDisplayName(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="错误信息" width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <div v-if="row.error" class="error-message">
              <el-tooltip :content="row.error" placement="top" :show-after="500">
                <el-text type="danger" size="small">
                  {{ row.error.length > 50 ? row.error.substring(0, 50) + '...' : row.error }}
                </el-text>
              </el-tooltip>
            </div>
            <el-text v-else type="success" size="small">无错误</el-text>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.updated_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.error" size="small" type="warning" @click="showErrorDetails(row.error)">
              查看错误
            </el-button>
            <el-button v-if="row.status === 'valid'" size="small" type="primary"
              @click="downloadLeCertificate(row.request_id)" :loading="downloading[row.request_id]">
              下载
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50, 100]" :total="pagination.total" :page-count="pagination.totalPages"
          layout="total, sizes, prev, pager, next, jumper" @size-change="handlePageSizeChange"
          @current-change="handlePageChange" />
      </div>

      <div v-if="leRequests.length === 0" class="empty-state">
        <el-empty description="暂无申请记录" />
      </div>
    </el-card>

    <!-- 实时状态对话框 -->
    <el-dialog v-model="showRealtimeDialog" title="SSL证书实时状态" width="90%" :close-on-click-modal="false">
      <div class="realtime-status-container">
        <div class="status-header">
          <div class="status-info">
            <el-tag :type="getLeStatusTagType(realtimeStatus)" size="large">
              {{ realtimeStatus.toUpperCase() }}
            </el-tag>
            <span class="request-id">请求ID: {{ currentRequestId }}</span>
          </div>
          <div class="connection-status">
            <el-tag :type="wsConnected ? 'success' : 'danger'" size="small">
              {{ wsConnected ? '实时连接' : '连接断开' }}
            </el-tag>
          </div>
        </div>

        <div class="logs-container">
          <div class="logs-header">
            <h4>处理日志</h4>
            <el-button size="small" @click="realtimeLogs = []">清空日志</el-button>
          </div>
          <div class="logs-content">
            <div v-if="realtimeLogs.length === 0" class="no-logs">
              <el-empty description="暂无日志" />
            </div>
            <div v-else class="log-list">
              <div v-for="(log, index) in realtimeLogs" :key="index" class="log-item" :class="{ 'new-log': index < 3 }">
                <div class="log-header">
                  <div class="log-time">{{ formatDate(log.created_at) }}</div>
                  <div v-if="index < 3" class="new-indicator">NEW</div>
                </div>
                <div class="log-step">{{ getStepDisplayName(log.step) }}</div>
                <div class="log-message">{{ log.message }}</div>
                <div v-if="log.details && Object.keys(log.details).length > 0" class="log-details">
                  <el-collapse>
                    <el-collapse-item title="详细信息" :name="index">
                      <pre>{{ JSON.stringify(log.details, null, 2) }}</pre>
                    </el-collapse-item>
                  </el-collapse>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showRealtimeDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 错误详情对话框 -->
    <el-dialog v-model="showErrorDialog" title="错误详情" width="80%">
      <div class="error-details-content">
        <el-alert title="SSL证书申请失败" type="error" :closable="false" show-icon style="margin-bottom: 16px;" />
        <el-input v-model="errorDetails" type="textarea" :rows="15" readonly placeholder="错误信息"
          style="font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 12px;" />
      </div>
      <template #footer>
        <el-button @click="copyErrorToClipboard">
          复制错误信息
        </el-button>
        <el-button @click="showErrorDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 证书下载对话框 -->
    <el-dialog v-model="showCertDialog" title="证书下载" width="80%">
      <div class="cert-download-content">
        <el-tabs>
          <el-tab-pane label="证书文件 (cert.pem)">
            <el-input v-model="downloadedCert.cert_pem" type="textarea" :rows="10" readonly placeholder="证书内容" />
          </el-tab-pane>
          <el-tab-pane label="私钥文件 (key.pem)">
            <el-input v-model="downloadedCert.key_pem" type="textarea" :rows="10" readonly placeholder="私钥内容" />
          </el-tab-pane>
        </el-tabs>
      </div>
      <template #footer>
        <el-button @click="copyCertToClipboard('cert')">复制证书</el-button>
        <el-button @click="copyCertToClipboard('key')">复制私钥</el-button>
        <el-button @click="downloadCertFiles">下载文件</el-button>
        <el-button @click="showCertDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from "vue";
import { ElMessage, FormInstance, FormRules } from "element-plus";
import { Key, Document, List, Refresh } from "@element-plus/icons-vue";
import {
  requestLetsEncryptCertificate,
  getLetsEncryptStatus,
  downloadLetsEncryptCertificate,
  getLetsEncryptList,
  getCloudflareZones,
  SSLWebSocketManager,
  type LetsEncryptRequest,
  type CloudflareZone,
  type LetsEncryptLog,
  type LetsEncryptStatus,
  type LetsEncryptListParams
} from "@/api/cloudflare";

// Let's Encrypt 相关状态
const leRequestForm = reactive<LetsEncryptRequest>({
  deploy: "edge",
  domains: [],
  email: ""
});
const leFormRef = ref<FormInstance>();
const requestingLe = ref(false);

// 域名相关状态
const availableDomains = ref<CloudflareZone[]>([]);
const loadingDomains = ref(false);

// 批量输入相关状态
const batchInput = ref("");

// WebSocket 相关状态
const wsManager = ref<SSLWebSocketManager | null>(null);
const wsConnected = ref(false);
const currentRequestId = ref<string | null>(null);

// Let's Encrypt 请求历史
const leRequests = ref<any[]>([]);
const loadingLeRequests = ref(false);
const downloading = ref<Record<string, boolean>>({});

// 分页和过滤
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false
});
const statusFilter = ref<string>('');
const searchKeyword = ref('');

// 实时日志和状态
const realtimeLogs = ref<LetsEncryptLog[]>([]);
const realtimeStatus = ref<string>("");
const showRealtimeDialog = ref(false);

// 证书下载对话框
const showCertDialog = ref(false);
const downloadedCert = reactive({
  cert_pem: "",
  key_pem: ""
});

// 错误详情对话框
const showErrorDialog = ref(false);
const errorDetails = ref("");

// 表单验证规则
const leFormRules: FormRules = {
  deploy: [{ required: true, message: "请选择部署类型", trigger: "change" }],
  domains: [{ required: true, message: "请添加至少一个域名", trigger: "change" }],
  email: [
    { required: true, message: "请输入邮箱地址", trigger: "blur" },
    { type: "email", message: "请输入有效的邮箱地址", trigger: "blur" }
  ]
};

// 初始化
onMounted(() => {
  loadLeRequests();
  loadDomains();
  initWebSocket();
});

// 清理
onUnmounted(() => {
  if (wsManager.value) {
    wsManager.value.disconnect();
  }
});

// 初始化WebSocket连接
function initWebSocket() {
  try {

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}`;
    wsManager.value = new SSLWebSocketManager(url);
    // 监听WebSocket事件
    wsManager.value.on('connected', () => {
      wsConnected.value = true;
      ElMessage.success('实时连接已建立');

      // 如果有待处理的request_id，立即查询状态
      if (currentRequestId.value) {
        console.log('WebSocket connected, sending request for request_id:', currentRequestId.value);
        wsManager.value!.send({
          type: 'get_status',
          data: { request_id: currentRequestId.value }
        });
        showRealtimeDialog.value = true;
        realtimeLogs.value = [];
        realtimeStatus.value = 'queued';
      }
    });

    wsManager.value.on('disconnected', () => {
      wsConnected.value = false;
      // ElMessage.warning('实时连接已断开');
    });

    wsManager.value.on('error', (error) => {
      console.error('WebSocket error:', error);
      // ElMessage.error('实时连接出现错误');
    });

    // 监听SSL相关事件
    wsManager.value.on('ssl_status', (data) => {
      handleRealtimeStatusUpdate(data);
    });

    wsManager.value.on('ssl_log', (data) => {
      handleRealtimeLog(data);
    });

    wsManager.value.on('ssl_error', (data) => {
      handleRealtimeError(data);
    });

    wsManager.value.on('ssl_completed', (data) => {
      handleRealtimeCompleted(data);
    });

    wsManager.value.connect();
  } catch (error) {
    console.error('Failed to initialize WebSocket:', error);
  }
}

// 处理实时状态更新
function handleRealtimeStatusUpdate(data: any) {
  console.log('Received ssl_status:', data);

  // 检查是否是当前请求的状态更新
  const requestId = data.request_id || data.data?.request_id;
  if (requestId === currentRequestId.value) {
    const statusData = data.data || data;
    realtimeStatus.value = statusData.status;

    console.log('Updating status to:', statusData.status);
    console.log('Request ID:', requestId);
    console.log('Current Request ID:', currentRequestId.value);

    // 更新请求历史中的状态
    const request = leRequests.value.find(r => r.request_id === requestId);
    if (request) {
      Object.assign(request, statusData);

      // 如果状态是valid且有证书信息，更新证书信息
      if (statusData.status === 'valid' && statusData.certificate) {
        request.certificate = statusData.certificate;
      }
    }

    // 如果有日志数据，添加到实时日志中（保持原有日志，新日志添加到顶部）
    if (statusData.logs && Array.isArray(statusData.logs)) {
      // 将新日志添加到最上方
      const newLogs = statusData.logs.reverse(); // 反转顺序，让最新的在最上面
      realtimeLogs.value.unshift(...newLogs);

      // 保持日志数量在合理范围内
      if (realtimeLogs.value.length > 100) {
        realtimeLogs.value = realtimeLogs.value.slice(0, 100);
      }

      console.log('Updated logs from status:', realtimeLogs.value);
    }
  } else {
    console.log('Status update not for current request:', {
      received: requestId,
      current: currentRequestId.value
    });
  }
}

// 处理实时日志
function handleRealtimeLog(data: any) {
  console.log('Received ssl_log:', data);

  // 检查是否是当前请求的日志
  if (data.request_id === currentRequestId.value) {
    // 构造日志条目格式
    const logEntry = {
      step: data.data?.step || 'unknown',
      message: data.message || data.data?.message || '',
      details: data.data?.details || {},
      created_at: data.timestamp || new Date().toISOString()
    };

    // 添加到最上方（unshift而不是push）
    realtimeLogs.value.unshift(logEntry);

    // 保持日志数量在合理范围内
    if (realtimeLogs.value.length > 100) {
      realtimeLogs.value = realtimeLogs.value.slice(0, 100);
    }

    console.log('Added log entry to top:', logEntry);
    console.log('Total logs:', realtimeLogs.value.length);
  } else {
    console.log('Log not for current request:', {
      received: data.request_id,
      current: currentRequestId.value
    });
  }
}

// 处理实时错误
function handleRealtimeError(data: any) {
  console.log('Received ssl_error:', data);

  if (data.request_id === currentRequestId.value || data.data?.request_id === currentRequestId.value) {
    const errorData = data.data || data;
    ElMessage.error(`SSL证书处理出错: ${errorData.message || data.message}`);
    realtimeStatus.value = 'failed';
  }
}

// 处理完成
function handleRealtimeCompleted(data: any) {
  console.log('Received ssl_completed:', data);

  if (data.request_id === currentRequestId.value) {
    ElMessage.success('SSL证书处理完成');
    realtimeStatus.value = 'completed';
    loadLeRequests(); // 刷新历史记录

    // 添加完成日志到最上方
    const completedLog = {
      step: 'completed',
      message: data.message || 'SSL证书处理完成',
      details: {},
      created_at: data.timestamp || new Date().toISOString()
    };
    realtimeLogs.value.unshift(completedLog);

    // 保持日志数量在合理范围内
    if (realtimeLogs.value.length > 100) {
      realtimeLogs.value = realtimeLogs.value.slice(0, 100);
    }
  }
}

// 加载可用域名列表
async function loadDomains() {
  if (availableDomains.value.length > 0) return; // 避免重复加载

  loadingDomains.value = true;
  try {
    const response = await getCloudflareZones();
    if (response.success && response.data) {
      availableDomains.value = response.data;
    }
  } catch (error) {
    ElMessage.error("加载域名列表失败");
  } finally {
    loadingDomains.value = false;
  }
}

// 解析批量输入的域名
function parseDomainsFromText(text: string): string[] {
  if (!text || !text.trim()) return [];

  // 支持多种分隔符：逗号、分号、换行、制表符、空格
  const separators = /[,;\n\r\t\s]+/;
  const domains = text
    .split(separators)
    .map(domain => domain.trim())
    .filter(domain => domain.length > 0)
    .filter(domain => isValidDomain(domain));

  return [...new Set(domains)]; // 去重
}

// 验证域名格式
function isValidDomain(domain: string): boolean {
  if (!domain || domain.length === 0) return false;

  // 支持通配符域名和普通域名
  const domainRegex = /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainRegex.test(domain);
}

// 处理批量粘贴
function handlePaste(event: ClipboardEvent) {
  event.preventDefault();
  const pastedText = event.clipboardData?.getData('text') || '';
  const domains = parseDomainsFromText(pastedText);

  if (domains.length > 0) {
    // 合并到现有域名列表，去重
    const existingDomains = new Set(leRequestForm.domains);
    const newDomains = domains.filter(domain => !existingDomains.has(domain));

    if (newDomains.length > 0) {
      leRequestForm.domains.push(...newDomains);
      ElMessage.success(`成功添加 ${newDomains.length} 个域名`);
    } else {
      ElMessage.warning("所有域名都已存在");
    }
  }
}

// 处理批量输入框的粘贴
function handleBatchPaste(event: ClipboardEvent) {
  // 让默认粘贴行为发生，然后自动处理
  setTimeout(() => {
    processBatchInput();
  }, 100);
}

// 处理批量输入
function processBatchInput() {
  if (!batchInput.value.trim()) return;

  const domains = parseDomainsFromText(batchInput.value);

  if (domains.length === 0) {
    ElMessage.warning("未找到有效的域名格式");
    return;
  }

  // 合并到现有域名列表，去重
  const existingDomains = new Set(leRequestForm.domains);
  const newDomains = domains.filter(domain => !existingDomains.has(domain));
  const duplicateCount = domains.length - newDomains.length;

  if (newDomains.length > 0) {
    leRequestForm.domains.push(...newDomains);
    let message = `成功添加 ${newDomains.length} 个域名`;
    if (duplicateCount > 0) {
      message += `，跳过 ${duplicateCount} 个重复域名`;
    }
    ElMessage.success(message);
  } else {
    ElMessage.warning("所有域名都已存在");
  }

  // 清空批量输入框
  batchInput.value = "";
}

// 清空批量输入框
function clearBatchInput() {
  batchInput.value = "";
}

// 分页处理
function handlePageChange(page: number) {
  pagination.page = page;
  loadLeRequests();
}

function handlePageSizeChange(size: number) {
  pagination.limit = size;
  pagination.page = 1; // 重置到第一页
  loadLeRequests();
}

// 状态过滤
function handleStatusFilterChange(status: string) {
  statusFilter.value = status;
  pagination.page = 1; // 重置到第一页
  loadLeRequests();
}

// 搜索处理
function handleSearch() {
  pagination.page = 1; // 重置到第一页
  loadLeRequests();
}

// 清空搜索
function clearSearch() {
  searchKeyword.value = '';
  pagination.page = 1;
  loadLeRequests();
}

// 显示错误详情
function showErrorDetails(error: string) {
  errorDetails.value = error;
  showErrorDialog.value = true;
}

// 复制错误信息到剪贴板
function copyErrorToClipboard() {
  navigator.clipboard.writeText(errorDetails.value).then(() => {
    ElMessage.success('错误信息已复制到剪贴板');
  }).catch(() => {
    ElMessage.error('复制失败，请手动复制');
  });
}

// 测试函数 - 模拟接收WebSocket数据
function testWebSocketData() {
  // 设置当前请求ID
  currentRequestId.value = "5e88ff06-4973-4938-87c2-75218365129c";

  // 模拟日志数据
  const logData1 = {
    "type": "ssl_log",
    "message": "Starting SSL certificate generation process",
    "data": {
      "details": { "deploy": "edge", "email": "321@qq.com" },
      "step": "processing"
    },
    "timestamp": "2025-09-28T15:22:26+08:00",
    "request_id": "5e88ff06-4973-4938-87c2-75218365129c"
  };

  const logData2 = {
    "type": "ssl_log",
    "message": "Validating 2 domains",
    "data": {
      "details": { "count": 2, "domains": ["33win999.com", "33win888.net"] },
      "step": "validating_domains"
    },
    "timestamp": "2025-09-28T15:22:26+08:00",
    "request_id": "5e88ff06-4973-4938-87c2-75218365129c"
  };

  const completedData = {
    "type": "ssl_completed",
    "message": "SSL证书处理完成",
    "timestamp": "2025-09-28T15:22:27+08:00",
    "request_id": "5e88ff06-4973-4938-87c2-75218365129c"
  };

  // 模拟处理日志（按时间顺序，最新的最后处理）
  handleRealtimeLog(logData1);
  handleRealtimeLog(logData2);
  handleRealtimeCompleted(completedData);

  // 显示实时状态对话框
  showRealtimeDialog.value = true;

  console.log('Test completed. Current status:', realtimeStatus.value);
  console.log('Current logs:', realtimeLogs.value);
}

// 申请 Let's Encrypt 证书
async function requestLeCertificate() {
  if (!leFormRef.value) return;

  try {
    await leFormRef.value.validate();

    requestingLe.value = true;
    const response = await requestLetsEncryptCertificate(leRequestForm);
    if (response.success && response.data?.request_id) {
      currentRequestId.value = response.data.request_id;
      ElMessage.success(`证书申请已提交，请求ID: ${response.data.request_id}`);

      // 通过WebSocket请求状态
      if (wsManager.value && wsConnected.value) {
        console.log('Sending WebSocket request for request_id:', response.data.request_id);
        wsManager.value.send({
          type: 'get_status',
          data: { request_id: response.data.request_id }
        });
        showRealtimeDialog.value = true;
        realtimeLogs.value = [];
        realtimeStatus.value = 'queued';
      } else {
        // 如果WebSocket未连接，等待连接建立后再查询
        if (wsManager.value) {
          const checkConnection = () => {
            if (wsConnected.value) {
              wsManager.value!.send({
                type: 'get_status',
                data: { request_id: response.data.request_id }
              });
              showRealtimeDialog.value = true;
              realtimeLogs.value = [];
              realtimeStatus.value = 'queued';
            } else {
              // 如果WebSocket仍未连接，延迟重试
              setTimeout(checkConnection, 1000);
            }
          };
          checkConnection();
        }
      }

      resetLeForm();
      loadLeRequests();
    }
  } catch (error) {
    if (typeof error === "string") return; // 表单验证失败
    ElMessage.error("申请证书失败");
  } finally {
    requestingLe.value = false;
  }
}

// 重置 Let's Encrypt 表单
function resetLeForm() {
  leRequestForm.deploy = "edge";
  leRequestForm.domains = [];
  leRequestForm.email = "";
  if (leFormRef.value) {
    leFormRef.value.resetFields();
  }
}

// 加载 Let's Encrypt 请求历史
async function loadLeRequests() {
  loadingLeRequests.value = true;
  try {
    const params: LetsEncryptListParams = {
      page: pagination.page,
      limit: pagination.limit
    };

    if (statusFilter.value) {
      params.status = statusFilter.value as any;
    }

    const response = await getLetsEncryptList(params);
    if (response.success && response.data) {
      leRequests.value = response.data.requests || [];
      pagination.total = response.data.pagination.total;
      pagination.totalPages = response.data.pagination.total_pages;
      pagination.hasNext = response.data.pagination.has_next;
      pagination.hasPrev = response.data.pagination.has_prev;

      console.log('Loaded certificate requests:', {
        total: pagination.total,
        page: pagination.page,
        requests: leRequests.value.length
      });
    }
  } catch (error) {
    console.error('Failed to load certificate requests:', error);
    ElMessage.error('加载证书请求列表失败');
  } finally {
    loadingLeRequests.value = false;
  }
}


// 下载 Let's Encrypt 证书
async function downloadLeCertificate(requestId: string) {
  downloading.value[requestId] = true;
  try {
    // 首先尝试从状态查询中获取证书信息
    const statusResponse = await getLetsEncryptStatus(requestId);
    if (statusResponse.success && statusResponse.data?.certificate) {
      downloadedCert.cert_pem = statusResponse.data.certificate.cert_pem;
      downloadedCert.key_pem = statusResponse.data.certificate.key_pem;
      showCertDialog.value = true;
    } else {
      // 如果状态查询中没有证书信息，则使用下载接口
      const response = await downloadLetsEncryptCertificate(requestId);
      if (response.success && response.data) {
        downloadedCert.cert_pem = response.data.certificate.cert_pem;
        downloadedCert.key_pem = response.data.certificate.key_pem;
        showCertDialog.value = true;
      }
    }
  } catch (error) {
    ElMessage.error("下载证书失败");
  } finally {
    downloading.value[requestId] = false;
  }
}

// 复制证书到剪贴板
function copyCertToClipboard(type: 'cert' | 'key') {
  const content = type === 'cert' ? downloadedCert.cert_pem : downloadedCert.key_pem;
  navigator.clipboard.writeText(content).then(() => {
    ElMessage.success(`${type === 'cert' ? '证书' : '私钥'}已复制到剪贴板`);
  });
}

// 下载证书文件
function downloadCertFiles() {
  // 下载证书文件
  const certBlob = new Blob([downloadedCert.cert_pem], { type: 'text/plain' });
  const certUrl = URL.createObjectURL(certBlob);
  const certLink = document.createElement('a');
  certLink.href = certUrl;
  certLink.download = 'cert.pem';
  certLink.click();
  URL.revokeObjectURL(certUrl);

  // 下载私钥文件
  const keyBlob = new Blob([downloadedCert.key_pem], { type: 'text/plain' });
  const keyUrl = URL.createObjectURL(keyBlob);
  const keyLink = document.createElement('a');
  keyLink.href = keyUrl;
  keyLink.download = 'key.pem';
  keyLink.click();
  URL.revokeObjectURL(keyUrl);

  ElMessage.success("证书文件下载成功");
}

// 工具函数
function getLeStatusTagType(status: string) {
  switch (status) {
    case 'valid':
    case 'completed':
      return 'success';
    case 'pending':
      return 'warning';
    case 'failed':
      return 'danger';
    case 'queued':
      return 'info';
    default:
      return 'info';
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
}

// 获取步骤显示名称
function getStepDisplayName(step: string) {
  const stepNames: Record<string, string> = {
    'processing': '开始处理',
    'validating_domains': '验证域名',
    'configuring_dns': '配置DNS',
    'creating_acme_user': '创建ACME用户',
    'registering_acme': '注册ACME',
    'requesting_certificate': '请求证书',
    'certificate_obtained': '证书获取成功',
    'uploading_to_cloudflare': '上传到Cloudflare',
    'finding_zone': '查找区域',
    'zone_found': '找到区域',
    'uploading_certificate': '上传证书',
    'upload_success': '上传成功',
    'completed': '处理完成',
    'failed': '处理失败'
  };

  return stepNames[step] || step;
}

// 获取状态显示名称
function getStatusDisplayName(status: string) {
  const statusNames: Record<string, string> = {
    'queued': '排队中',
    'pending': '处理中',
    'valid': '已完成',
    'failed': '失败',
    'completed': '已完成'
  };

  return statusNames[status] || status;
}
</script>

<style scoped>
.letsencrypt-ssl {
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
  background: linear-gradient(135deg, #67c23a, #85ce61);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  box-shadow: 0 4px 16px rgba(103, 194, 58, 0.3);
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

.le-request-card,
.le-history-card {
  margin-bottom: 24px;
  border-radius: 16px;
  border: 1px solid rgba(103, 194, 58, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
}

.le-request-card:hover,
.le-history-card:hover {
  border-color: rgba(103, 194, 58, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(103, 194, 58, 0.15);
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
  color: #67c23a;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.header-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding: 16px 0;
}

.error-message {
  max-width: 200px;
  word-break: break-word;
  line-height: 1.4;
}

.error-details-content {
  min-height: 400px;
}

.error-details-content .el-textarea__inner {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.5;
  background: #f8f9fa;
  border: 1px solid #e4e7ed;
}

/* 域名选择器样式优化 */
:deep(.el-select) {
  width: 100%;
}

:deep(.el-select__wrapper) {
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.el-select__wrapper:hover) {
  box-shadow: 0 0 0 1px #67c23a;
}

:deep(.el-select__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(103, 194, 58, 0.2);
}

/* 批量输入容器样式 */
.domains-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.batch-input-container {
  border: 2px dashed #dcdfe6;
  border-radius: 12px;
  padding: 16px;
  background: rgba(103, 194, 58, 0.02);
  transition: all 0.3s ease;
}

.batch-input-container:hover {
  border-color: #67c23a;
  background: rgba(103, 194, 58, 0.05);
}

.batch-input-container:focus-within {
  border-color: #67c23a;
  background: rgba(103, 194, 58, 0.08);
  box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.1);
}

.batch-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

:deep(.batch-input-container .el-textarea__inner) {
  border-radius: 8px;
  border: 1px solid #dcdfe6;
  transition: all 0.3s ease;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
}

:deep(.batch-input-container .el-textarea__inner:hover) {
  border-color: #67c23a;
}

:deep(.batch-input-container .el-textarea__inner:focus) {
  border-color: #67c23a;
  box-shadow: 0 0 0 2px rgba(103, 194, 58, 0.2);
}

/* 实时状态对话框样式 */
.realtime-status-container {
  max-height: 70vh;
  overflow-y: auto;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 12px;
  margin-bottom: 20px;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.request-id {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  color: #606266;
  background: rgba(255, 255, 255, 0.8);
  padding: 4px 8px;
  border-radius: 4px;
}

.connection-status {
  display: flex;
  align-items: center;
}

.logs-container {
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  overflow: hidden;
}

.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.logs-header h4 {
  margin: 0;
  color: #303133;
  font-size: 16px;
}

.logs-content {
  max-height: 400px;
  overflow-y: auto;
}

.no-logs {
  padding: 40px;
  text-align: center;
}

.log-list {
  padding: 0;
}

.log-item {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.3s ease;
  position: relative;
}

.log-item:hover {
  background: rgba(103, 194, 58, 0.05);
}

.log-item:last-child {
  border-bottom: none;
}

.log-item.new-log {
  background: rgba(103, 194, 58, 0.08);
  border-left: 4px solid #67c23a;
  animation: slideInFromTop 0.5s ease-out;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.new-indicator {
  background: #67c23a;
  color: white;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  animation: pulse 2s infinite;
}

@keyframes slideInFromTop {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.7;
  }
}

.log-time {
  font-size: 12px;
  color: #909399;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.log-step {
  font-weight: 600;
  color: #67c23a;
  margin-bottom: 4px;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.log-message {
  color: #303133;
  margin-bottom: 8px;
  line-height: 1.5;
}

.log-details {
  margin-top: 8px;
}

.log-details pre {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  font-size: 12px;
  color: #606266;
  overflow-x: auto;
  margin: 0;
  border: 1px solid #e4e7ed;
}

/* 折叠面板样式优化 */
:deep(.el-collapse) {
  border: none;
}

:deep(.el-collapse-item__header) {
  background: transparent;
  border: none;
  padding: 8px 0;
  font-size: 13px;
  color: #67c23a;
}

:deep(.el-collapse-item__content) {
  padding: 0;
  background: transparent;
}

:deep(.el-collapse-item__wrap) {
  border: none;
  background: transparent;
}

.form-help {
  color: #909399;
  font-size: 13px;
  margin-top: 6px;
  font-style: italic;
}

.domains-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  background: rgba(245, 247, 250, 0.5);
  border-radius: 12px;
  margin: 20px 0;
}

.cert-download-content {
  min-height: 400px;
  border-radius: 12px;
  overflow: hidden;
}

/* 表单样式优化 */
:deep(.el-form-item__label) {
  font-weight: 600;
  color: #303133;
  font-size: 15px;
}

:deep(.el-radio-group) {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

:deep(.el-radio) {
  margin-right: 0;
  padding: 12px 16px;
  border: 2px solid #f0f0f0;
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.el-radio:hover) {
  border-color: #67c23a;
  background: rgba(103, 194, 58, 0.05);
}

:deep(.el-radio.is-checked) {
  border-color: #67c23a;
  background: rgba(103, 194, 58, 0.1);
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #67c23a;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(103, 194, 58, 0.2);
}

:deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #67c23a, #85ce61);
  border: none;
}

:deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, #85ce61, #67c23a);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.4);
}

/* 表格样式 */
:deep(.el-table) {
  font-size: 14px;
  border-radius: 12px;
  overflow: hidden;
}

:deep(.el-table .el-table__cell) {
  padding: 12px 8px;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.el-table__header) {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
}

:deep(.el-table__header th) {
  background: transparent;
  font-weight: 600;
  color: #303133;
}

:deep(.el-table__body tr:hover) {
  background: rgba(103, 194, 58, 0.05);
}

/* 标签样式 */
:deep(.el-tag) {
  border-radius: 6px;
  font-weight: 500;
  padding: 4px 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .letsencrypt-ssl {
    padding: 0 16px 16px;
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

  .card-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .header-actions {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }

  .header-actions .el-input,
  .header-actions .el-select {
    width: 100% !important;
  }

  :deep(.el-form-item__label) {
    font-size: 14px;
  }

  :deep(.el-radio) {
    padding: 10px 12px;
  }

  :deep(.el-table) {
    font-size: 12px;
  }

  :deep(.el-table .el-table__cell) {
    padding: 8px 6px;
  }

  .batch-input-container {
    padding: 12px;
  }

  .batch-actions {
    flex-direction: column;
    gap: 6px;
  }

  .batch-actions .el-button {
    width: 100%;
  }

  .status-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .status-info {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .logs-content {
    max-height: 300px;
  }

  .log-item {
    padding: 12px;
  }
}

@media (max-width: 480px) {
  .letsencrypt-ssl {
    padding: 0 12px 12px;
  }


  :deep(.el-radio) {
    padding: 8px 10px;
  }
}
</style>
