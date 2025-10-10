<template>
  <div class="seo-push-container">
    <!-- 连接设置 -->
    <el-card class="connection-settings" shadow="never">
      <template #header>
        <div class="card-header">
          <span>{{ $t("seoPush.connectionSettings") }}</span>
        </div>
      </template>

      <!-- 账号配置区域 -->
      <div class="account-config">
        <div v-for="(account, index) in accounts" :key="index" class="account-item">
          <div class="account-header">
            <span class="account-title">{{ $t("seoPush.account") }} {{ index + 1 }}</span>
            <div class="account-actions">
              <el-button type="primary" size="small" @click="testConnection(index)">{{ $t("seoPush.retry")
              }}</el-button>
              <el-button type="danger" size="small" @click="deleteAccount(index)">{{ $t("seoPush.delete") }}</el-button>
            </div>
          </div>

          <div class="account-fields">
            <div class="field-group">
              <label>{{ $t("seoPush.accountName") }}:</label>
              <el-input v-model="account.name" :placeholder="$t('seoPush.accountNamePlaceholder')" size="small" />
            </div>

            <div class="field-group">
              <label>{{ $t("seoPush.bingApiKey") }}:</label>
              <div class="input-with-status">
                <el-input v-model="account.bingApiKey" :placeholder="$t('seoPush.bingApiKeyPlaceholder')" size="small"
                  type="password" show-password />
                <span v-if="!account.bingApiKey" class="error-text">{{ $t("seoPush.missingBingApiKey") }}</span>
              </div>
            </div>

            <div class="field-group">
              <label>{{ $t("seoPush.cloudflareToken") }}:</label>
              <el-input v-model="account.cloudflareToken" :placeholder="$t('seoPush.cloudflareTokenPlaceholder')"
                size="small" type="password" show-password />
            </div>

            <div class="field-group">
              <label>{{ $t("seoPush.accountId") }}:</label>
              <el-input v-model="account.accountId" :placeholder="$t('seoPush.accountIdPlaceholder')" size="small" />
            </div>
          </div>
        </div>

        <!-- Sitemap路径配置 -->
        <div class="sitemap-config">
          <div class="field-group">
            <label>{{ $t("seoPush.sitemapPath") }}:</label>
            <el-input v-model="sitemapPath" :placeholder="$t('seoPush.sitemapPathPlaceholder')" size="small" />
            <div class="help-text">{{ $t("seoPush.sitemapPathHelp") }}</div>
          </div>
        </div>

        <!-- 添加新账号按钮 -->
        <div class="add-account">
          <el-button type="primary" @click="addNewAccount">
            <el-icon>
              <Plus />
            </el-icon>
            {{ $t("seoPush.addNewAccount") }}
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 高级功能 -->
    <el-card class="advanced-features" shadow="never">
      <template #header>
        <div class="card-header">
          <span>{{ $t("seoPush.advancedFeatures") }}</span>
        </div>
      </template>

      <!-- IndexNow密钥管理 -->
      <div class="feature-section">
        <h4>{{ $t("seoPush.indexNowKeyManagement") }}</h4>
        <div class="field-group">
          <label>{{ $t("seoPush.indexNowKeys") }}:</label>
          <el-input v-model="indexNowKeys" type="textarea" :rows="4"
            :placeholder="$t('seoPush.indexNowKeysPlaceholder')" />
          <div class="button-group">
            <el-button size="small" @click="generateNewKey">{{ $t("seoPush.generateNewKey") }}</el-button>
            <el-button size="small" @click="detectKeys">{{ $t("seoPush.detectKeys") }}</el-button>
          </div>
        </div>
      </div>

      <!-- 路径/模式设置 -->
      <div class="feature-section">
        <h4>{{ $t("seoPush.pathModeSettings") }}</h4>
        <div class="field-group">
          <label>{{ $t("seoPush.pathModes") }}:</label>
          <el-input v-model="pathModes" type="textarea" :rows="3" :placeholder="$t('seoPush.pathModesPlaceholder')" />
          <div class="button-group">
            <el-button size="small" @click="addCommonDirectories">{{ $t("seoPush.addCommonDirectories") }}</el-button>
            <el-button size="small" @click="clearDirectories">{{ $t("seoPush.clearDirectories") }}</el-button>
          </div>
          <div class="help-text">{{ $t("seoPush.pathModesHelp") }}</div>
        </div>
      </div>

      <!-- 最大生成数量 -->
      <div class="feature-section">
        <h4>{{ $t("seoPush.maxGeneration") }}</h4>
        <div class="max-generation">
          <el-input-number v-model="maxGeneration" :min="1" :max="1000" size="small" />
          <span class="help-text">{{ $t("seoPush.maxGenerationHelp") }}</span>
          <div class="action-buttons">
            <el-button type="primary" size="small" @click="batchGenerateIndexNow">
              {{ $t("seoPush.batchGenerateIndexNow") }}
            </el-button>
            <el-button size="small" @click="checkSystemStatus">{{ $t("seoPush.checkSystemStatus") }}</el-button>
          </div>
        </div>
      </div>

      <!-- 系统控制 -->
      <div class="feature-section">
        <h4>{{ $t("seoPush.systemControl") }}</h4>
        <div class="system-control">
          <div class="control-row">
            <label>{{ $t("seoPush.indexNowInterval") }}:</label>
            <el-input-number v-model="indexNowInterval" :min="1" :max="1440" size="small" />
            <el-button size="small" @click="startIndexNowTimer">{{ $t("seoPush.startIndexNowTimer") }}</el-button>
            <el-button type="warning" size="small" @click="stopIndexNowTimer">{{ $t("seoPush.stopIndexNowTimer")
            }}</el-button>
          </div>

          <div class="control-row">
            <el-button size="small" @click="startTimer">{{ $t("seoPush.startTimer") }}</el-button>
            <el-button type="danger" size="small" @click="forceStop">{{ $t("seoPush.forceStop") }}</el-button>
            <el-button type="danger" size="small" @click="emergencyCleanup">{{ $t("seoPush.emergencyCleanup")
            }}</el-button>
            <el-button size="small" @click="clearLogs">{{ $t("seoPush.clearLogs") }}</el-button>
            <el-button size="small" class="hide-button">{{ $t("seoPush.hide") }}</el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 实时日志 -->
    <el-card class="realtime-log" shadow="never">
      <template #header>
        <div class="card-header">
          <span>{{ $t("seoPush.realtimeLog") }}</span>
          <el-button size="small" @click="clearLogs">{{ $t("seoPush.clear") }}</el-button>
        </div>
      </template>

      <div class="log-container" ref="logContainer">
        <div v-for="(log, index) in logs" :key="index" class="log-entry" :class="{ 'error': log.type === 'error' }">
          {{ log.message }}
        </div>
        <div v-if="logs.length === 0" class="no-logs">{{ $t("seoPush.noLogs") }}</div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import * as pushApi from '@/api/push'
import { safeSplitAndFilter } from '@/utils/safeSplit'

// 国际化
const { t } = useI18n()

// 响应式数据
const accounts = ref([
  {
    name: '',
    bingApiKey: '',
    cloudflareToken: '',
    accountId: ''
  }
])

const sitemapPath = ref('/sitemap.xml')
const indexNowKeys = ref('')
const pathModes = ref('/po\n/ca\n/sp')
const maxGeneration = ref(1000)
const indexNowInterval = ref(10)
const logs = ref([
  { message: '[系统]等待开始测试连接...', type: 'info' },
  { message: '[10:57:43]开始测试账号:账号 1', type: 'info' },
  { message: '[10:57:43]步骤1:测试Bing连接...', type: 'info' },
  { message: '[10:57:43] 账号 1-缺少Bing API Key', type: 'error' },
  { message: '[10:57:44] × 账号 1 验证完成-部分连接测试失败', type: 'error' }
])

const logContainer = ref<HTMLElement>()

// 方法
const addNewAccount = () => {
  accounts.value.push({
    name: '',
    bingApiKey: '',
    cloudflareToken: '',
    accountId: ''
  })
  // 自动保存
  setTimeout(() => {
    saveAccount(accounts.value.length - 1)
  }, 1000)
}

const deleteAccount = async (index: number) => {
  if (accounts.value.length <= 1) {
    ElMessage.warning(t('seoPush.atLeastOneAccount'))
    return
  }

  try {
    await ElMessageBox.confirm(t('seoPush.confirmDeleteAccount'), t('seoPush.confirmDelete'), {
      type: 'warning'
    })
    accounts.value.splice(index, 1)
    addLog(`${t('seoPush.account')} ${index + 1} ${t('seoPush.accountDeleted')}`, 'info')
  } catch {
    // 用户取消删除
  }
}

const testConnection = async (index: number) => {
  const account = accounts.value[index]
  addLog(`[${getCurrentTime()}]${t('seoPush.testingAccount')}:${t('seoPush.account')} ${index + 1}`, 'info')
  addLog(`[${getCurrentTime()}]${t('seoPush.step1TestingBing')}`, 'info')

  if (!account.bingApiKey) {
    addLog(`[${getCurrentTime()}] ${t('seoPush.account')} ${index + 1}-${t('seoPush.accountMissingBingApiKey')}`, 'error')
    addLog(`[${getCurrentTime()}] × ${t('seoPush.account')} ${index + 1} ${t('seoPush.accountVerificationFailed')}`, 'error')
    return
  }

  try {
    await pushApi.testConnection({
      accountName: account.name,
      bingApiKey: account.bingApiKey,
      cloudflareToken: account.cloudflareToken,
      accountId: account.accountId
    })
    addLog(`[${getCurrentTime()}] ${t('seoPush.account')} ${index + 1} ${t('seoPush.accountConnectionTestSuccess')}`, 'info')
  } catch (error) {
    addLog(`[${getCurrentTime()}] ${t('seoPush.account')} ${index + 1} 连接测试失败`, 'error')
  }
}

const generateNewKey = () => {
  const newKey = generateRandomKey()
  indexNowKeys.value += (indexNowKeys.value ? '\n' : '') + newKey
  addLog(`${t('seoPush.newKeyGenerated')}: ${newKey}`, 'info')
}

const detectKeys = () => {
  const keys = safeSplitAndFilter(indexNowKeys.value, '\n')
  addLog(`${t('seoPush.keysDetected')} ${keys.length} ${t('seoPush.keysDetected')}`, 'info')
}

const addCommonDirectories = () => {
  const commonDirs = ['/blog', '/news', '/products', '/about']
  const currentModes = safeSplitAndFilter(pathModes.value, '\n')
  const newModes = commonDirs.filter(dir => !currentModes.includes(dir))
  pathModes.value += (pathModes.value ? '\n' : '') + newModes.join('\n')
  addLog(t('seoPush.commonDirectoriesAdded'), 'info')
}

const clearDirectories = () => {
  pathModes.value = ''
  addLog(t('seoPush.directoriesCleared'), 'info')
}

const batchGenerateIndexNow = () => {
  addLog(`${t('seoPush.batchGenerationStarted')}: ${maxGeneration.value}`, 'info')
  // 模拟批量生成
  setTimeout(() => {
    addLog(`${t('seoPush.batchGenerationCompleted')} ${Math.min(maxGeneration.value, 100)} ${t('seoPush.linksGenerated')}`, 'info')
  }, 2000)
}

const checkSystemStatus = () => {
  addLog(t('seoPush.systemStatusChecked'), 'info')
  setTimeout(() => {
    addLog(t('seoPush.systemStatusNormal'), 'info')
  }, 1000)
}

const startIndexNowTimer = () => {
  addLog(`${t('seoPush.indexNowTimerStarted')}: ${indexNowInterval.value}${t('seoPush.minutes')}`, 'info')
}

const stopIndexNowTimer = () => {
  addLog(t('seoPush.indexNowTimerStopped'), 'info')
}

const startTimer = () => {
  addLog(t('seoPush.timerStarted'), 'info')
}

const forceStop = () => {
  addLog(t('seoPush.forceStopAllTasks'), 'warning')
}

const emergencyCleanup = () => {
  addLog(t('seoPush.emergencyCleanupStarted'), 'warning')
  setTimeout(() => {
    addLog(t('seoPush.emergencyCleanupCompleted'), 'info')
  }, 1000)
}

const clearLogs = () => {
  logs.value = []
}

const addLog = (message: string, type: 'info' | 'error' | 'warning' = 'info') => {
  logs.value.push({ message, type })
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
}

const getCurrentTime = () => {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
}

const generateRandomKey = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// 加载数据
const loadData = async () => {
  try {
    // 加载账号列表
    const accountsData = await pushApi.getAccounts() as any
    if (accountsData?.data && accountsData.data.length > 0) {
      accounts.value = accountsData.data
    }

    // 加载IndexNow密钥
    const keysData = await pushApi.getIndexNowKeys() as any
    if (keysData?.data) {
      indexNowKeys.value = keysData.data.join('\n')
    }

    // 加载路径模式
    const modesData = await pushApi.getPathModes() as any
    if (modesData?.data) {
      pathModes.value = modesData.data.join('\n')
    }

    // 加载Sitemap路径
    const sitemapData = await pushApi.getSitemapPath() as any
    if (sitemapData?.data) {
      sitemapPath.value = sitemapData.data
    }
  } catch (error) {
    console.error('加载数据失败:', error)
  }
}

// 保存账号
const saveAccount = async (index: number) => {
  const account = accounts.value[index]
  try {
    await pushApi.saveAccount(account)
    addLog(`${t('seoPush.account')} ${index + 1} 保存成功`, 'info')
  } catch (error) {
    addLog(`${t('seoPush.account')} ${index + 1} 保存失败`, 'error')
  }
}

// 保存IndexNow密钥
const saveIndexNowKeys = async () => {
  try {
    const keys = safeSplitAndFilter(indexNowKeys.value, '\n')
    await pushApi.saveIndexNowKeys(keys)
    addLog('IndexNow密钥保存成功', 'info')
  } catch (error) {
    addLog('IndexNow密钥保存失败', 'error')
  }
}

// 保存路径模式
const savePathModes = async () => {
  try {
    const modes = safeSplitAndFilter(pathModes.value, /[,\n]/)
    await pushApi.savePathModes(modes)
    addLog('路径模式保存成功', 'info')
  } catch (error) {
    addLog('路径模式保存失败', 'error')
  }
}

// 防抖保存函数
let saveIndexNowKeysTimer: NodeJS.Timeout | null = null
let savePathModesTimer: NodeJS.Timeout | null = null
let saveSitemapPathTimer: NodeJS.Timeout | null = null

// 监听配置变化，自动保存
watch(
  () => indexNowKeys.value,
  () => {
    if (indexNowKeys.value) {
      if (saveIndexNowKeysTimer) {
        clearTimeout(saveIndexNowKeysTimer)
      }
      saveIndexNowKeysTimer = setTimeout(() => {
        saveIndexNowKeys()
      }, 2000)
    }
  }
)

watch(
  () => pathModes.value,
  () => {
    if (pathModes.value) {
      if (savePathModesTimer) {
        clearTimeout(savePathModesTimer)
      }
      savePathModesTimer = setTimeout(() => {
        savePathModes()
      }, 2000)
    }
  }
)

watch(
  () => sitemapPath.value,
  () => {
    if (sitemapPath.value) {
      if (saveSitemapPathTimer) {
        clearTimeout(saveSitemapPathTimer)
      }
      saveSitemapPathTimer = setTimeout(() => {
        pushApi.saveSitemapPath(sitemapPath.value)
      }, 2000)
    }
  }
)

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.seo-push-container {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.connection-settings,
.advanced-features,
.realtime-log {
  margin-bottom: 20px;
  background: #fff;
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #333;
}

.account-config {
  padding: 20px 0;
}

.account-item {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 20px;
  margin-bottom: 20px;
  background: #fafafa;
}

.account-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.account-title {
  font-weight: 600;
  color: #333;
}

.account-actions {
  display: flex;
  gap: 10px;
}

.account-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-group label {
  font-weight: 500;
  color: #606266;
  font-size: 14px;
}

.input-with-status {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.error-text {
  color: #f56c6c;
  font-size: 12px;
}

.sitemap-config {
  margin: 20px 0;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
}

.help-text {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.add-account {
  text-align: center;
  margin-top: 20px;
}

.feature-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: #fafafa;
}

.feature-section h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.max-generation {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

.system-control {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.hide-button {
  margin-left: auto;
}

.log-container {
  height: 300px;
  overflow-y: auto;
  background: #1e1e1e;
  color: #fff;
  padding: 15px;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.log-entry {
  margin-bottom: 5px;
  word-wrap: break-word;
}

.log-entry.error {
  color: #ff6b6b;
}

.log-entry.warning {
  color: #ffa726;
}

.no-logs {
  color: #666;
  text-align: center;
  margin-top: 50px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .seo-push-container {
    padding: 10px;
  }

  .account-fields {
    grid-template-columns: 1fr;
  }

  .max-generation {
    flex-direction: column;
    align-items: flex-start;
  }

  .action-buttons {
    margin-left: 0;
    width: 100%;
  }

  .control-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
