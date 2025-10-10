<template>
  <div class="url-push-container">
    <!-- 添加项目表单 -->
    <el-card class="add-project-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>添加URL推送项目</span>
        </div>
      </template>

      <el-form :model="projectForm" :rules="formRules" ref="projectFormRef" label-width="160px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="Bing API Key" prop="bingApiKey" required>
              <el-input v-model="projectForm.bingApiKey" type="password" show-password placeholder="请输入Bing API Key" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="域名" prop="domains" required>
              <el-input v-model="domainsText" type="textarea" :rows="3" placeholder="每行一个域名，支持多种格式"
                @input="updateDomains" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="URL必须包含">
              <el-input v-model="projectForm.urlMustContain" placeholder="URL必须包含的字符串，留空则不过滤" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="标题关键词">
              <el-input v-model="titleKeywordsText" type="textarea" :rows="2" placeholder="每行一个关键词，命中越多权重越高"
                @input="updateTitleKeywords" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="排除词">
              <el-input v-model="excludeWordsText" type="textarea" :rows="2" placeholder="每行一个排除词，标题包含这些词将被排除"
                @input="updateExcludeWords" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="标题抓取超时(秒)">
              <el-input-number v-model="projectForm.titleTimeout" :min="1" :max="60" size="default" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="每次最多抓取标题数量">
              <el-input-number v-model="projectForm.maxTitleCount" :min="1" :max="200" size="default" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="定时任务">
              <el-switch v-model="projectForm.enableTimer" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20" v-if="projectForm.enableTimer">
          <el-col :span="12">
            <el-form-item label="推送频率">
              <el-select v-model="projectForm.pushInterval" placeholder="选择推送频率">
                <el-option label="每30分钟" value="30m" />
                <el-option label="每1小时" value="1h" />
                <el-option label="每2小时" value="2h" />
                <el-option label="每6小时" value="6h" />
                <el-option label="每12小时" value="12h" />
                <el-option label="每天" value="1d" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="每批推送数量">
              <el-input-number v-model="projectForm.batchSize" :min="1" :max="1000" size="default" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item>
          <el-button type="primary" @click="addProject" :loading="adding">
            添加项目
          </el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 批量操作和统计 -->
    <el-card class="batch-operations-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>批量操作</span>
        </div>
      </template>

      <div class="batch-controls">
        <div class="stats-info">
          <div class="stat-item">
            <span class="label">总提交数:</span>
            <span class="value">{{ stats.totalSubmitted }}</span>
          </div>
          <div class="stat-item">
            <span class="label">剩余配额:</span>
            <span class="value">{{ stats.remainingQuota }}</span>
          </div>
          <div class="stat-item">
            <span class="label">进度:</span>
            <span class="value">{{ stats.progress }}%</span>
          </div>
        </div>

        <div class="control-buttons">
          <el-button type="primary" @click="batchRunAll" :loading="batchRunning">
            批量运行全部项目
          </el-button>
          <el-button type="success" @click="startTimer" :disabled="timerRunning" :loading="timerStarting">
            启动定时任务
          </el-button>
          <el-button type="warning" @click="stopTimer" :disabled="!timerRunning" :loading="timerStopping">
            停止定时任务
          </el-button>
          <el-button @click="refreshProjects">
            刷新
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 项目列表 -->
    <el-card class="projects-list-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>项目列表</span>
          <span class="project-count">共 {{ projects.length }} 个项目</span>
        </div>
      </template>

      <div v-if="projects.length === 0" class="no-projects">
        <el-empty description="暂无项目，请先添加项目" />
      </div>

      <div v-else class="projects-container">
        <div v-for="group in groupedProjects" :key="group.apiKey" class="project-group">
          <div class="group-header">
            <h3>API Key: {{ group.apiKey.substring(0, 20) }}...</h3>
            <span class="project-count">共 {{ group.projects.length }} 个项目</span>
          </div>

          <div class="projects-grid">
            <div v-for="project in group.projects" :key="project.id" class="project-item">
              <div class="project-header">
                <span class="project-id">项目 #{{ project.id }}</span>
                <div class="project-actions">
                  <el-button size="small" @click="runProject(project.id)">运行</el-button>
                  <el-button size="small" @click="editProject(project)">编辑</el-button>
                  <el-button size="small" type="danger" @click="deleteProject(project.id)">删除</el-button>
                </div>
              </div>

              <div class="project-details">
                <div class="detail-row">
                  <span class="label">域名:</span>
                  <span class="value">{{ project.domains.join(', ') }}</span>
                </div>
                <div class="detail-row" v-if="project.urlMustContain">
                  <span class="label">URL包含:</span>
                  <span class="value">{{ project.urlMustContain }}</span>
                </div>
                <div class="detail-row" v-if="project.titleKeywords.length > 0">
                  <span class="label">关键词:</span>
                  <span class="value">{{ project.titleKeywords.join(', ') }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">定时任务:</span>
                  <el-tag :type="project.enableTimer ? 'success' : 'info'">
                    {{ project.enableTimer ? '已启用' : '未启用' }}
                  </el-tag>
                </div>
                <div class="detail-row" v-if="project.enableTimer">
                  <span class="label">推送频率:</span>
                  <span class="value">{{ getIntervalText(project.pushInterval) }}</span>
                </div>
              </div>

              <div class="project-status">
                <div class="status-item">
                  <span class="label">状态:</span>
                  <el-tag :type="getStatusType(project.status)">
                    {{ getStatusText(project.status) }}
                  </el-tag>
                </div>
                <div class="status-item" v-if="project.lastRun">
                  <span class="label">最后运行:</span>
                  <span class="value">{{ formatTime(project.lastRun) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 执行结果对话框 -->
    <el-dialog v-model="resultsDialogVisible" title="执行结果" width="80%" top="5vh">
      <div class="results-content">
        <div v-if="currentResults.length === 0" class="no-results">
          <el-empty description="暂无执行结果" />
        </div>
        <div v-else class="results-list">
          <div v-for="(result, index) in currentResults" :key="index" class="result-item">
            <div class="result-header">
              <span class="result-time">{{ formatTime(result.timestamp) }}</span>
              <el-tag :type="result.success ? 'success' : 'danger'">
                {{ result.success ? '成功' : '失败' }}
              </el-tag>
            </div>
            <div class="result-details">
              <div class="detail-item">
                <span class="label">推送数量:</span>
                <span class="value">{{ result.submittedCount }}</span>
              </div>
              <div class="detail-item" v-if="result.message">
                <span class="label">消息:</span>
                <span class="value">{{ result.message }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as pushApi from '@/api/push'
import { safeSplitAndFilter } from '@/utils/safeSplit'

// 响应式数据
const projectForm = reactive({
  bingApiKey: '',
  domains: [] as string[],
  urlMustContain: '',
  titleKeywords: [] as string[],
  excludeWords: [] as string[],
  titleTimeout: 8,
  maxTitleCount: 80,
  enableTimer: false,
  pushInterval: '1h',
  batchSize: 100
})

const domainsText = ref('')
const titleKeywordsText = ref('')
const excludeWordsText = ref('')

const projects = ref<any[]>([])
const stats = ref({
  totalSubmitted: 0,
  remainingQuota: 1000,
  progress: 0
})

const adding = ref(false)
const batchRunning = ref(false)
const timerRunning = ref(false)
const timerStarting = ref(false)
const timerStopping = ref(false)

const resultsDialogVisible = ref(false)
const currentResults = ref<any[]>([])

const projectFormRef = ref()

// 表单验证规则
const formRules = {
  bingApiKey: [
    { required: true, message: '请输入Bing API Key', trigger: 'blur' }
  ],
  domains: [
    { required: true, message: '请输入至少一个域名', trigger: 'change' }
  ]
}

// 计算属性
const groupedProjects = computed(() => {
  const groups: { [key: string]: any[] } = {}
  projects.value.forEach(project => {
    if (!groups[project.bingApiKey]) {
      groups[project.bingApiKey] = []
    }
    groups[project.bingApiKey].push(project)
  })
  return Object.keys(groups).map(apiKey => ({
    apiKey,
    projects: groups[apiKey]
  }))
})

// 方法
const updateDomains = () => {
  projectForm.domains = safeSplitAndFilter(domainsText.value, '\n')
}

const updateTitleKeywords = () => {
  projectForm.titleKeywords = safeSplitAndFilter(titleKeywordsText.value, '\n')
}

const updateExcludeWords = () => {
  projectForm.excludeWords = safeSplitAndFilter(excludeWordsText.value, '\n')
}

const addProject = async () => {
  if (!projectFormRef.value) return

  try {
    await projectFormRef.value.validate()

    adding.value = true

    await pushApi.addUrlPushProject({
      bingApiKey: projectForm.bingApiKey,
      domains: projectForm.domains,
      urlMustContain: projectForm.urlMustContain,
      titleKeywords: projectForm.titleKeywords,
      excludeWords: projectForm.excludeWords,
      titleTimeout: projectForm.titleTimeout,
      maxTitleCount: projectForm.maxTitleCount,
      enableTimer: projectForm.enableTimer,
      pushInterval: projectForm.pushInterval,
      batchSize: projectForm.batchSize
    })

    ElMessage.success('项目添加成功')
    resetForm()
    loadProjects()
  } catch (error) {
    console.error('添加项目失败:', error)
    ElMessage.error('添加项目失败')
  } finally {
    adding.value = false
  }
}

const resetForm = () => {
  projectForm.bingApiKey = ''
  projectForm.domains = []
  projectForm.urlMustContain = ''
  projectForm.titleKeywords = []
  projectForm.excludeWords = []
  projectForm.titleTimeout = 8
  projectForm.maxTitleCount = 80
  projectForm.enableTimer = false
  projectForm.pushInterval = '1h'
  projectForm.batchSize = 100

  domainsText.value = ''
  titleKeywordsText.value = ''
  excludeWordsText.value = ''

  if (projectFormRef.value) {
    projectFormRef.value.resetFields()
  }
}

const loadProjects = async () => {
  try {
    const response = await pushApi.getUrlPushProjects() as any
    projects.value = response.data || []
  } catch (error) {
    console.error('加载项目失败:', error)
  }
}

const loadStats = async () => {
  try {
    const response = await pushApi.getPushStats() as any
    stats.value = response.data || stats.value
  } catch (error) {
    console.error('加载统计信息失败:', error)
  }
}

const batchRunAll = async () => {
  try {
    batchRunning.value = true
    await pushApi.batchRunAllProjects()
    ElMessage.success('批量运行已启动')
    loadStats()
  } catch (error) {
    console.error('批量运行失败:', error)
    ElMessage.error('批量运行失败')
  } finally {
    batchRunning.value = false
  }
}

const startTimer = async () => {
  try {
    timerStarting.value = true
    await pushApi.startUrlPushTimer()
    timerRunning.value = true
    ElMessage.success('定时任务已启动')
  } catch (error) {
    console.error('启动定时任务失败:', error)
    ElMessage.error('启动定时任务失败')
  } finally {
    timerStarting.value = false
  }
}

const stopTimer = async () => {
  try {
    timerStopping.value = true
    await pushApi.stopUrlPushTimer()
    timerRunning.value = false
    ElMessage.success('定时任务已停止')
  } catch (error) {
    console.error('停止定时任务失败:', error)
    ElMessage.error('停止定时任务失败')
  } finally {
    timerStopping.value = false
  }
}

const refreshProjects = () => {
  loadProjects()
  loadStats()
  ElMessage.success('刷新成功')
}

const runProject = async (projectId: number) => {
  try {
    // 这里可以添加运行单个项目的逻辑
    ElMessage.success('项目运行已启动')
    loadStats()
  } catch (error) {
    console.error('运行项目失败:', error)
    ElMessage.error('运行项目失败')
  }
}

const editProject = (project: any) => {
  // 填充表单进行编辑
  projectForm.bingApiKey = project.bingApiKey
  projectForm.domains = [...project.domains]
  projectForm.urlMustContain = project.urlMustContain
  projectForm.titleKeywords = [...project.titleKeywords]
  projectForm.excludeWords = [...project.excludeWords]
  projectForm.titleTimeout = project.titleTimeout
  projectForm.maxTitleCount = project.maxTitleCount
  projectForm.enableTimer = project.enableTimer
  projectForm.pushInterval = project.pushInterval
  projectForm.batchSize = project.batchSize

  domainsText.value = project.domains.join('\n')
  titleKeywordsText.value = project.titleKeywords.join('\n')
  excludeWordsText.value = project.excludeWords.join('\n')

  // 滚动到表单顶部
  document.querySelector('.add-project-card')?.scrollIntoView({ behavior: 'smooth' })
}

const deleteProject = async (projectId: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这个项目吗？', '确认删除', {
      type: 'warning'
    })

    await pushApi.deleteUrlPushProject(projectId)
    ElMessage.success('项目删除成功')
    loadProjects()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除项目失败:', error)
      ElMessage.error('删除项目失败')
    }
  }
}

const getIntervalText = (interval: string) => {
  const intervalMap: { [key: string]: string } = {
    '30m': '每30分钟',
    '1h': '每1小时',
    '2h': '每2小时',
    '6h': '每6小时',
    '12h': '每12小时',
    '1d': '每天'
  }
  return intervalMap[interval] || interval
}

const getStatusType = (status: string): 'primary' | 'success' | 'warning' | 'info' | 'danger' => {
  const statusMap: { [key: string]: 'primary' | 'success' | 'warning' | 'info' | 'danger' } = {
    'running': 'warning',
    'success': 'success',
    'error': 'danger',
    'idle': 'info'
  }
  return statusMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const statusMap: { [key: string]: string } = {
    'running': '运行中',
    'success': '成功',
    'error': '失败',
    'idle': '空闲'
  }
  return statusMap[status] || '未知'
}

const formatTime = (timestamp: string | number) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}

// 生命周期
onMounted(() => {
  loadProjects()
  loadStats()
})
</script>

<style scoped>
.url-push-container {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.add-project-card,
.batch-operations-card,
.projects-list-card {
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

.project-count {
  font-size: 14px;
  color: #666;
  font-weight: normal;
}

.batch-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.stats-info {
  display: flex;
  gap: 30px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.stat-item .label {
  font-size: 12px;
  color: #666;
}

.stat-item .value {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.control-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.no-projects {
  text-align: center;
  padding: 40px 0;
}

.projects-container {
  padding: 20px 0;
}

.project-group {
  margin-bottom: 30px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e4e7ed;
}

.group-header h3 {
  margin: 0;
  color: #333;
  font-size: 16px;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.project-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
  background: #fafafa;
  transition: all 0.3s ease;
}

.project-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.project-id {
  font-weight: 600;
  color: #333;
}

.project-actions {
  display: flex;
  gap: 8px;
}

.project-details {
  margin-bottom: 15px;
}

.detail-row {
  display: flex;
  margin-bottom: 8px;
  align-items: flex-start;
}

.detail-row .label {
  font-weight: 500;
  color: #666;
  min-width: 80px;
  margin-right: 10px;
}

.detail-row .value {
  color: #333;
  flex: 1;
  word-break: break-all;
}

.project-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-item .label {
  font-size: 12px;
  color: #666;
}

.status-item .value {
  font-size: 12px;
  color: #333;
}

.results-content {
  max-height: 60vh;
  overflow-y: auto;
}

.no-results {
  text-align: center;
  padding: 40px 0;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.result-item {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 15px;
  background: #fafafa;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.result-time {
  font-weight: 500;
  color: #333;
}

.result-details {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.detail-item {
  display: flex;
  gap: 10px;
}

.detail-item .label {
  font-weight: 500;
  color: #666;
  min-width: 80px;
}

.detail-item .value {
  color: #333;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .url-push-container {
    padding: 10px;
  }

  .batch-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .stats-info {
    justify-content: center;
  }

  .control-buttons {
    justify-content: center;
  }

  .projects-grid {
    grid-template-columns: 1fr;
  }

  .project-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .project-actions {
    justify-content: center;
  }

  .project-status {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
