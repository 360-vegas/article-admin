<template>
  <div class="article-generator-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">
            <el-icon class="title-icon">
              <Star />
            </el-icon>
            {{ $t("menus.generateArticle") }}
          </h1>
          <p class="page-description">{{ $t("generator.pageDescription") }}</p>
        </div>
        <div class="header-stats">
          <div class="stat-item">
            <div class="stat-value">{{ extractedEntities.length }}</div>
            <div class="stat-label">{{ $t("generator.extractedEntities") }}</div>
          </div>

          <!-- WebSocket连接状态 -->
          <div class="stat-item">
            <div class="stat-value">
              <el-tag :type="wsConnected ? 'success' : 'danger'" size="large">
                {{ wsConnected ? '已连接' : '未连接' }}
              </el-tag>
            </div>
            <div class="stat-label">WebSocket状态</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 合并的操作和设置区域 -->
      <div class="combined-actions-section">
        <el-card shadow="never" class="combined-card">
          <template #header>
            <div class="card-header">
              <el-icon>
                <Setting />
              </el-icon>
              <span>{{ $t("generator.urlAndEntity") }}</span>
            </div>
          </template>

          <div class="combined-content">
            <!-- 优化的布局：分为输入区域、设置区域和控制区域 -->
            <div class="optimized-layout">
              <!-- 输入区域 -->
              <div class="input-section">
                <div class="section-header">
                  <el-icon class="section-icon">
                    <Edit />
                  </el-icon>
                  <span class="section-title">内容输入</span>
                </div>
                <div class="input-grid">
                  <!-- URL输入 -->
                  <div class="input-item url-input">
                    <div class="input-header">
                      <el-icon class="input-icon">
                        <Link />
                      </el-icon>
                      <span class="input-title">{{ $t("generator.urlLabel") }}</span>
                    </div>
                    <el-input v-model="urlInput" :placeholder="$t('generator.urlPlaceholder')" clearable size="large"
                      class="full-width-input" :disabled="!!entityNameInput.trim()" @input="handleUrlInput">
                    </el-input>
                  </div>

                  <!-- 词条输入 -->
                  <div class="input-item entity-input">
                    <div class="input-header">
                      <el-icon class="input-icon">
                        <Edit />
                      </el-icon>
                      <span class="input-title">{{ $t("generator.entityNameLabel") }}</span>
                    </div>
                    <el-input v-model="entityNameInput" :placeholder="$t('generator.entityNamePlaceholder')" clearable
                      size="large" class="full-width-input" :disabled="!!urlInput.trim()" @input="handleEntityInput">
                    </el-input>
                  </div>
                </div>
              </div>

              <!-- 设置区域 -->
              <div class="settings-section">
                <div class="section-header">
                  <el-icon class="section-icon">
                    <Setting />
                  </el-icon>
                  <span class="section-title">生成设置</span>
                </div>
                <div class="settings-grid">
                  <!-- 最大词条数 -->
                  <div class="setting-item">
                    <label class="setting-label">
                      <el-icon>
                        <Collection />
                      </el-icon>
                      {{ $t("generator.maxEntities") }}
                    </label>
                    <el-input-number v-model="maxEntities" :min="1" :max="50" controls-position="right" size="large"
                      class="setting-input" />
                  </div>

                  <!-- 提示词选择 -->
                  <div class="setting-item prompt-setting">
                    <label class="setting-label required">
                      <el-icon>
                        <Key />
                      </el-icon>
                      选择提示词
                    </label>
                    <el-select v-model="selectedPrompts" placeholder="请选择提示词（可多选）" size="large"
                      class="setting-input prompt-select" @change="handlePromptChange"
                      :class="{ 'is-error': selectedPrompts.length === 0 }" multiple collapse-tags collapse-tags-tooltip
                      :max-collapse-tags="2">
                      <el-option v-for="prompt in promptList" :key="prompt.code" :label="prompt.name"
                        :value="prompt.code">
                        <div class="prompt-option">
                          <div class="prompt-name">{{ prompt.name }}</div>
                          <div class="prompt-code">{{ prompt.code }}</div>
                        </div>
                      </el-option>
                    </el-select>
                  </div>

                  <!-- 模板选择 -->
                  <div class="setting-item template-setting">
                    <label class="setting-label">
                      <el-icon>
                        <Document />
                      </el-icon>
                      选择模板
                      <el-tag v-if="templateList.length > 0" type="info" size="small" style="margin-left: 8px;">
                        {{ templateList.length }} 个可用
                      </el-tag>
                    </label>
                    <div class="template-select-container">
                      <el-select v-model="selectedTemplate" placeholder="请选择文章模板" size="large"
                        class="setting-input template-select" @change="handleTemplateChange" clearable>
                        <el-option v-for="template in templateList" :key="template.id" :label="template.name"
                          :value="template.id">
                          <div class="template-option">
                            <div class="template-name">{{ template.name }}</div>
                            <div class="template-id">ID: {{ template.id }}</div>
                          </div>
                        </el-option>
                      </el-select>
                      <div class="template-actions">
                        <el-button v-if="selectedTemplate" size="large" @click="previewTemplate" type="info" plain>
                          <el-icon>
                            <View />
                          </el-icon>
                          预览
                        </el-button>
                        <el-button size="large" @click="loadTemplateList" type="primary" plain>
                          <el-icon>
                            <Refresh />
                          </el-icon>
                          刷新
                        </el-button>
                      </div>
                    </div>
                  </div>

                  <!-- 生成控制按钮 -->
                  <div class="setting-item controls-setting">
                    <label class="setting-label">
                      <el-icon>
                        <TrendCharts />
                      </el-icon>
                      生成控制
                    </label>
                    <div class="controls-container">
                      <div class="generate-controls">
                        <el-button type="primary" @click="startGenerate" :loading="generateRunning"
                          :disabled="generateRunning || !wsConnected" size="large" class="primary-action">
                          <el-icon>
                            <Star />
                          </el-icon>
                          开始生成
                        </el-button>
                        <el-button type="danger" @click="stopGenerate" :disabled="!generateRunning"
                          :loading="generateStatus === 'stopping'" size="large" class="danger-action">
                          <el-icon>
                            <VideoPause />
                          </el-icon>
                          {{ generateStatus === 'stopping' ? '正在停止...' : '停止生成' }}
                        </el-button>
                      </div>
                      <div class="utility-controls">
                        <el-button @click="connectWebSocket" :disabled="wsConnected" size="large"
                          class="utility-action">
                          <el-icon>
                            <Refresh />
                          </el-icon>
                          重新连接
                        </el-button>
                        <el-button @click="clearPersistedData" type="info" size="large" class="utility-action">
                          <el-icon>
                            <Delete />
                          </el-icon>
                          清除数据
                        </el-button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 词条和预览区域 -->
      <div class="entities-preview-section">
        <!-- 抽取的词条列表 -->
        <div class="entities-panel">
          <el-card shadow="never" class="entities-card">
            <template #header>
              <div class="card-header">
                <div class="header-left">
                  <el-icon>
                    <Collection />
                  </el-icon>
                  <span>{{ $t("generator.extractedEntities") }}</span>
                  <el-tag type="primary" size="large">{{ extractedEntities.length }} {{ $t("generator.items")
                  }}</el-tag>
                </div>
              </div>
            </template>

            <div class="entities-container">
              <div v-for="entity in extractedEntities" :key="entity.id" class="entity-card"
                @click="previewEntity(entity)">
                <div class="entity-content">
                  <div class="entity-header">
                    <span class="entity-name">{{ entity.name }}</span>
                    <div class="entity-tags">
                      <el-tag :type="getEntityTagType(entity.type)" size="small">{{ entity.type }}</el-tag>
                      <el-tag v-if="entity.category_name" type="info" size="small">{{ entity.category_name }}</el-tag>
                      <el-tag v-if="entity.is_verified" type="success" size="small">已验证</el-tag>
                    </div>
                  </div>
                  <div v-if="entity.short_description || entity.description" class="entity-description">
                    {{ entity.short_description || entity.description }}
                  </div>
                  <div v-if="entity.aliases && entity.aliases.length > 0" class="entity-aliases">
                    <span class="aliases-label">别名:</span>
                    <span class="aliases-text">{{ entity.aliases.join(', ') }}</span>
                  </div>
                  <div class="entity-meta">
                    <span class="entity-id">ID: {{ entity.id }}</span>
                    <span v-if="entity.confidence" class="entity-confidence">置信度: {{ Math.round((entity.confidence || 0)
                      *
                      100) }}%</span>
                    <span class="entity-time">{{ formatTime(entity.createdAt) }}</span>
                    <span v-if="entity.sourceUrl" class="entity-source" :title="entity.sourceUrl">
                      {{ $t("generator.sourceLabel") }}: {{ entity.sourceTitle || entity.sourceUrl }}
                    </span>
                  </div>
                </div>
                <div class="entity-actions" @click.stop>
                  <el-button size="small" circle @click="previewEntity(entity)">
                    <el-icon>
                      <View />
                    </el-icon>
                  </el-button>
                  <el-button size="small" type="danger" circle @click="removeEntity(entity.id)">
                    <el-icon>
                      <Delete />
                    </el-icon>
                  </el-button>
                </div>
              </div>

              <div v-if="extractedEntities.length === 0" class="empty-entities">
                <el-empty :description="$t('generator.noEntities')">
                  <template #image>
                    <el-icon size="60" color="#c0c4cc">
                      <Collection />
                    </el-icon>
                  </template>
                </el-empty>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 预览区域 -->
        <div class="preview-panel">
          <el-card shadow="never" class="preview-card">
            <template #header>
              <div class="card-header">
                <div class="header-left">
                  <el-icon>
                    <View />
                  </el-icon>
                  <span>{{ $t("generator.previewTitle") }}</span>
                  <div class="preview-controls">
                    <el-button-group>
                      <el-button size="small" :type="!showHtml ? 'primary' : ''" @click="showHtml = false">
                        {{ $t("generator.preview") }}
                      </el-button>
                      <el-button size="small" :type="showHtml ? 'primary' : ''" @click="showHtml = true">
                        <el-icon>
                          <Document />
                        </el-icon>
                        HTML
                      </el-button>
                    </el-button-group>
                  </div>
                </div>
              </div>
            </template>

            <div class="preview-container">
              <div v-if="content && !showHtml" class="preview-content" v-html="content"></div>
              <div v-else-if="content && showHtml" class="html-content">
                <pre class="html-code">{{ content }}</pre>
              </div>
              <div v-else class="empty-preview">
                <el-empty :description="$t('generator.noPreview')">
                  <template #image>
                    <el-icon size="60" color="#c0c4cc">
                      <View />
                    </el-icon>
                  </template>
                </el-empty>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Search,
  Edit,
  Star,
  Refresh,
  VideoPause,
  Close,
  View,
  Delete,
  Document,
  Link,
  Setting,
  Collection,
  TrendCharts,
  Key
} from "@element-plus/icons-vue";
import { useI18n } from "vue-i18n";
import {
  type BatchCopyWebSocketRequest,
  type BatchCopyWebSocketResponse
} from "@/api/generation";
import { useWebSocketTaskStore } from "@/store/modules/websocketTask";
import { listPresets, type PromptPreset } from "@/api/prompts";
import { listTemplates, type TemplateItem } from "@/api/templates";

defineOptions({ name: "ArticleGenerator" });

const { t } = useI18n();

// 使用全局WebSocket任务管理器
const taskStore = useWebSocketTaskStore();

// 本地页面状态（表单相关）
const urlInput = ref("");
const entityNameInput = ref("");
const showHtml = ref(false);

// 提示词相关状态
const promptList = ref<PromptPreset[]>([]);
const selectedPrompts = ref<string[]>([]);

// 模板相关状态
const templateList = ref<TemplateItem[]>([]);
const selectedTemplate = ref<string>("");

// 从store映射的计算属性
const generateRunning = computed(() => taskStore.taskRunning);
const generateStatus = computed(() => taskStore.taskStatus);
const generateProgress = computed(() => taskStore.taskProgress);
const generateStats = computed(() => taskStore.taskStats);
const generateId = computed(() => taskStore.taskId);
const queueId = computed(() => taskStore.queueId);
const wsConnected = computed(() => taskStore.wsConnected);
const extractedEntities = computed(() => taskStore.extractedEntities);
const generatedArticles = computed(() => taskStore.generatedArticles);
const content = computed(() => taskStore.currentContent);

// 复制设置（优先使用store中的配置）
const maxEntities = ref(taskStore.taskConfig.maxEntities || 20);

// 持久化相关（现在主要保存表单数据）
const STORAGE_KEYS = {
  FORM_DATA: 'article_generator_form_data',
  // 注意：实体、内容和任务状态现在由全局store管理
};

// 保存表单数据到localStorage
function saveFormData() {
  const formData = {
    urlInput: urlInput.value,
    entityNameInput: entityNameInput.value,
    maxEntities: maxEntities.value,
    showHtml: showHtml.value,
    selectedPrompts: selectedPrompts.value,
    selectedTemplate: selectedTemplate.value
  };
  localStorage.setItem(STORAGE_KEYS.FORM_DATA, JSON.stringify(formData));
}

// 恢复表单数据
function restoreFormData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.FORM_DATA);
    if (saved) {
      const formData = JSON.parse(saved);
      urlInput.value = formData.urlInput || "";
      entityNameInput.value = formData.entityNameInput || "";
      maxEntities.value = formData.maxEntities || 20;
      showHtml.value = formData.showHtml || false;
      selectedTemplate.value = formData.selectedTemplate || "";
      // 兼容旧数据格式
      if (formData.selectedPrompts) {
        selectedPrompts.value = formData.selectedPrompts;
      } else if (formData.selectedPrompt) {
        selectedPrompts.value = [formData.selectedPrompt];
      } else {
        selectedPrompts.value = [];
      }
    }
  } catch (error) {
    console.warn('恢复表单数据失败:', error);
  }
}

// 清除表单数据
function clearPersistedData() {
  localStorage.removeItem(STORAGE_KEYS.FORM_DATA);
  ElMessage.success('已清除表单数据');
}

// 方法
// 处理URL输入，清空词条输入
function handleUrlInput() {
  if (urlInput.value.trim()) {
    entityNameInput.value = "";
  }
  saveFormData(); // 自动保存表单数据
}

// 处理词条输入，清空URL输入
function handleEntityInput() {
  if (entityNameInput.value.trim()) {
    urlInput.value = "";
  }
  saveFormData(); // 自动保存表单数据
}

// 加载提示词列表
async function loadPromptList() {
  try {
    const prompts = await listPresets();
    promptList.value = Array.isArray(prompts) ? prompts : [];
  } catch (error) {
    console.error('加载提示词列表失败:', error);
    ElMessage.error('加载提示词列表失败');
  }
}

// 处理提示词选择变化
function handlePromptChange() {
  saveFormData(); // 自动保存表单数据
}

// 处理模板选择变化
function handleTemplateChange() {
  saveFormData(); // 自动保存表单数据

  // 如果选择了模板，显示模板信息
  if (selectedTemplate.value) {
    const template = templateList.value.find(t => t.id === selectedTemplate.value);
    if (template) {
      console.log('已选择模板:', template.name, 'ID:', template.id);
      ElMessage.success(`已选择模板: ${template.name}`);
    }
  }
}

// 预览模板
function previewTemplate() {
  if (!selectedTemplate.value) {
    ElMessage.warning('请先选择一个模板');
    return;
  }

  const template = templateList.value.find(t => t.id === selectedTemplate.value);
  if (!template) {
    ElMessage.error('模板不存在');
    return;
  }

  // 使用Element Plus的MessageBox显示模板内容
  ElMessageBox.alert(template.body, `模板预览: ${template.name}`, {
    confirmButtonText: '关闭',
    dangerouslyUseHTMLString: true,
    customClass: 'template-preview-dialog'
  });
}

// 加载模板列表
async function loadTemplateList() {
  try {
    const templates = await listTemplates();
    templateList.value = Array.isArray(templates) ? templates : [];
    console.log('已加载模板列表:', templateList.value.length, '个模板');
    console.log('模板数据结构:', templateList.value);
  } catch (error) {
    console.error('加载模板列表失败:', error);
    ElMessage.error('加载模板列表失败');
    templateList.value = [];
  }
}



// 生成词条ID
function generateEntityId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `entity_${timestamp}_${random}`;
}


// URL内容生成API接口已移动到 @/api/generation


// WebSocket连接管理
function connectWebSocket() {
  taskStore.initWebSocket();
}

// 开始生成
function startGenerate() {
  // 验证输入
  const hasUrl = urlInput.value && urlInput.value.trim();
  const hasEntity = entityNameInput.value && entityNameInput.value.trim();

  if (!hasUrl && !hasEntity) {
    ElMessage.error("请输入URL或词条名称");
    return;
  }

  // 验证提示词选择
  if (selectedPrompts.value.length === 0) {
    ElMessage.error("请选择至少一个提示词");
    return;
  }

  // 使用store的方法启动任务
  const taskConfig = {
    urlInput: urlInput.value,
    entityNameInput: entityNameInput.value,
    maxEntities: maxEntities.value,
    preset_codes: selectedPrompts.value,
    template_id: selectedTemplate.value || undefined
  };

  console.log('启动生成任务，配置:', taskConfig);
  if (selectedTemplate.value) {
    console.log('选择的模板ID:', selectedTemplate.value);
    const template = templateList.value.find(t => t.id === selectedTemplate.value);
    if (template) {
      console.log('模板信息:', { id: template.id, name: template.name });
    }
  }

  const success = taskStore.startTask(taskConfig);

  if (success) {
    ElMessage.info('批量生成请求已发送');
  }
}

// 停止生成
function stopGenerate() {
  // 如果当前有任务在运行，显示确认对话框
  if (generateRunning.value && generateStatus.value === "running") {
    ElMessageBox.confirm(
      '确定要停止当前的批量生成任务吗？这将取消所有正在进行和等待中的操作。',
      '确认停止',
      {
        confirmButtonText: '确定停止',
        cancelButtonText: '取消',
        type: 'warning',
      }
    ).then(() => {
      taskStore.stopTask();
    }).catch(() => {
      ElMessage.info('已取消停止操作');
    });
  } else {
    taskStore.stopTask();
  }
}


function startLoop() {
  startGenerate();
}

function stopLoop() {
  stopGenerate();
}

function previewEntity(entity: any) {
  // 实体预览逻辑
}

function removeEntity(entityId: string) {
  // 从store中移除实体
  const index = taskStore.extractedEntities.findIndex(e => e.id === entityId);
  if (index > -1) {
    taskStore.extractedEntities.splice(index, 1);
    ElMessage.success(t("generator.entityRemoved"));
    taskStore.saveTaskState(); // 保存更新后的状态
  }
}

function toggleHtmlView() {
  showHtml.value = !showHtml.value;
  saveFormData(); // 保存HTML显示状态
}

function getEntityTagType(type: string): "primary" | "success" | "warning" | "info" | "danger" {
  const typeMap: Record<string, "primary" | "success" | "warning" | "info" | "danger"> = {
    'generated': 'success',
    'extracted': 'primary',
    'manual': 'info',
    'auto': 'warning',
    'title': 'info',
    'organization': 'primary',
    'person': 'success',
    'place': 'warning',
    'technology': 'primary',
    'event': 'info',
    'product': 'danger'
  };
  return typeMap[type] || 'primary';
}

// 获取状态标签类型

function formatTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) { // 1分钟内
    return '刚刚';
  } else if (diff < 3600000) { // 1小时内
    return `${Math.floor(diff / 60000)}分钟前`;
  } else if (diff < 86400000) { // 1天内
    return `${Math.floor(diff / 3600000)}小时前`;
  } else {
    return date.toLocaleDateString('zh-CN');
  }
}

// 生命周期
onMounted(() => {
  restoreFormData(); // 恢复表单数据
  loadPromptList(); // 加载提示词列表
  loadTemplateList(); // 加载模板列表

  // 确保WebSocket连接（如果还没有连接的话）
  if (!taskStore.wsConnected) {
    taskStore.initWebSocket();
  }

  // 注册页面级的消息处理器（可选，用于页面特定的UI更新）
  const unregisterMessageHandler = taskStore.registerMessageHandler((data) => {
    // 这里可以添加页面特定的消息处理逻辑
    console.log('页面收到WebSocket消息:', data);
  });

  // 保存注销函数，在组件卸载时使用
  (window as any).__articlePageMessageUnregister = unregisterMessageHandler;
});

onUnmounted(() => {
  saveFormData(); // 保存表单数据

  // 注销消息处理器
  if ((window as any).__articlePageMessageUnregister) {
    (window as any).__articlePageMessageUnregister();
    delete (window as any).__articlePageMessageUnregister;
  }

  // 注意：不关闭WebSocket，因为它是全局的，可能其他页面还在使用
});

// 监听设置变化，自动保存并更新store配置
watch([maxEntities], () => {
  saveFormData();
  // 更新store中的任务配置
  taskStore.taskConfig.maxEntities = maxEntities.value;
}, { immediate: false });

// 监听页面可见性变化，在页面隐藏时保存表单数据
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    saveFormData();
  }
});

// 监听页面刷新前，保存表单数据
window.addEventListener('beforeunload', () => {
  saveFormData();
});
</script>

<style scoped>
.article-generator-page {
  padding: 24px;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  display: flex;
  flex-direction: column;
}

/* 页面头部 */
.page-header {
  margin-bottom: 20px;
  flex-shrink: 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: white;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.header-left {
  flex: 1;
}

.page-title {
  display: flex;
  align-items: center;
  margin: 0 0 12px 0;
  font-size: 32px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  gap: 12px;
}

.title-icon {
  color: var(--el-color-primary);
  font-size: 36px;
}

.page-description {
  margin: 0;
  color: var(--el-text-color-regular);
  font-size: 16px;
  line-height: 1.6;
}

.header-stats {
  display: flex;
  gap: 32px;
}

.stat-item {
  text-align: center;
  padding: 16px 24px;
  background: var(--el-color-primary-light-9);
  border-radius: 12px;
  border: 2px solid var(--el-color-primary-light-7);
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--el-color-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  font-weight: 500;
}


/* 主要内容区域 */
.main-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
}

/* 合并的操作和设置区域 */
.combined-actions-section {
  margin-bottom: 8px;
  flex-shrink: 0;
}

.combined-card {
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: none;
}

.combined-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 优化的布局结构 */
.optimized-layout {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px 0;
}

/* 区域标题 */
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--el-color-primary-light-8);
}

.section-icon {
  color: var(--el-color-primary);
  font-size: 18px;
}

.section-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
  font-size: 16px;
}

/* 输入区域 */
.input-section {
  background: var(--el-color-primary-light-9);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--el-color-primary-light-7);
}

.input-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.input-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.input-icon {
  color: var(--el-color-primary);
  font-size: 16px;
}

.input-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
  font-size: 14px;
}

.full-width-input {
  width: 100%;
}

/* 设置区域 */
.settings-section {
  background: var(--el-color-success-light-9);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--el-color-success-light-7);
}

.settings-grid {
  display: grid;
  grid-template-columns: 180px 1fr 1fr 1fr;
  gap: 16px;
  align-items: start;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  font-size: 14px;
  text-align: left;
}

.setting-label .el-icon {
  color: var(--el-color-primary);
  font-size: 16px;
}

.setting-label.required::after {
  content: " *";
  color: var(--el-color-danger);
  font-weight: bold;
}

.setting-input {
  width: 100%;
  min-width: 0;
}

/* 提示词设置特殊样式 */
.prompt-setting {
  grid-column: 2 / 3;
}

.template-setting {
  grid-column: 3 / 4;
}

.controls-setting {
  grid-column: 4 / 5;
}

.template-select-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.template-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-start;
}

/* 按钮样式 */
.primary-action {
  min-width: 100px;
  font-weight: 600;
}

.danger-action {
  min-width: 100px;
  font-weight: 600;
}

.utility-action {
  min-width: 80px;
}

/* 清理重复的样式，保留在优化布局中定义的样式 */

/* 词条和预览区域 */
.entities-preview-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex: 1;
  min-height: 0;
}

.entities-panel,
.preview-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.entities-card,
.preview-card {
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: none;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Element Plus 卡片内容区域样式 */
.entities-card :deep(.el-card__body),
.preview-card :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 16px;
}

.entities-card :deep(.el-card__header),
.preview-card :deep(.el-card__header) {
  flex-shrink: 0;
  padding: 16px 16px 0 16px;
}

.card-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  font-weight: 600;
  color: var(--el-text-color-primary);
  font-size: 18px;
  gap: 8px;
}

.card-header .header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-header .el-icon {
  color: var(--el-color-primary);
  font-size: 20px;
}

/* 设置区域 */
.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  font-size: 16px;
  text-align: left;
}

.setting-label .el-icon {
  color: var(--el-color-primary);
  font-size: 18px;
}

.setting-input {
  width: 100%;
  min-width: 0;
}

.generate-controls {
  display: flex;
  gap: 8px;
  justify-content: flex-start;
  flex-wrap: wrap;
}

/* 提示词选项样式 */
.prompt-option {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.prompt-name {
  font-weight: 600;
  color: var(--el-text-color-primary);
  font-size: 14px;
}

.prompt-code {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
}

/* 模板选项样式 */
.template-option {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.template-name {
  font-weight: 600;
  color: var(--el-text-color-primary);
  font-size: 14px;
}

.template-id {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
}

/* 错误状态样式 */
.setting-input.is-error {
  border-color: var(--el-color-danger);
}

.setting-input.is-error:focus {
  border-color: var(--el-color-danger);
  box-shadow: 0 0 0 2px var(--el-color-danger-light-8);
}

/* 多选下拉框特殊样式 */
.setting-input[multiple] {
  min-height: 40px;
}

/* 提示词选择框样式 */
.prompt-select {
  min-height: 48px !important;
  min-width: 200px !important;
  width: 100% !important;
  max-width: 100% !important;
}

/* 模板选择框样式 */
.template-select {
  min-height: 48px !important;
  min-width: 200px !important;
  width: 100% !important;
  max-width: 100% !important;
}

/* 控制容器样式 */
.controls-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.controls-container .generate-controls {
  display: flex;
  gap: 8px;
  justify-content: flex-start;
  flex-wrap: wrap;
}

.controls-container .utility-controls {
  display: flex;
  gap: 6px;
  justify-content: flex-start;
  flex-wrap: wrap;
}

/* 模板选择容器 */
.template-select-container {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
}

.template-select-container .template-select {
  flex: 1;
  min-width: 0;
}

/* 模板预览对话框样式 */
:deep(.template-preview-dialog) {
  max-width: 80vw;
  max-height: 80vh;
}

:deep(.template-preview-dialog .el-message-box__content) {
  max-height: 60vh;
  overflow-y: auto;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

:deep(.template-preview-dialog .el-message-box__content pre) {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
}

/* 提示词选择框容器对齐 */
.setting-item:has(.prompt-select) {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: stretch;
  justify-content: flex-end;
}

.prompt-select .el-select__tags {
  min-height: 40px !important;
  padding: 6px 10px !important;
}

.prompt-select .el-select__input {
  height: 40px !important;
  line-height: 40px !important;
}

.setting-input[multiple] .el-select__tags {
  min-height: 32px;
  padding: 4px 8px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.setting-input[multiple] .el-tag {
  margin: 2px 4px 2px 0;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.setting-input[multiple] .el-tag .el-tag__content {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 确保多选下拉框与其他输入框对齐 */
.setting-input[multiple] .el-select__input {
  height: 32px;
  line-height: 32px;
}

/* 多选下拉框在网格中的对齐 */
.setting-item:has(.setting-input[multiple]) {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: stretch;
}

.setting-item:has(.setting-input[multiple]) .setting-input {
  width: 100%;
  min-width: 0;
}

.error-message {
  color: var(--el-color-danger);
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.4;
}

.selected-count {
  color: var(--el-color-success);
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.4;
  font-weight: 500;
}

/* 多选下拉框的响应式优化 */
@media (max-width: 1200px) {
  .setting-input[multiple] .el-tag {
    max-width: 100px;
  }

  .setting-input[multiple] .el-tag .el-tag__content {
    max-width: 80px;
  }
}

@media (max-width: 768px) {
  .setting-input[multiple] {
    min-height: 36px;
  }

  .setting-input[multiple] .el-select__tags {
    min-height: 28px;
    padding: 2px 6px;
  }

  .setting-input[multiple] .el-tag {
    margin: 1px 2px 1px 0;
    max-width: 80px;
  }
}

/* 词条区域 */
.entities-container {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px;
  scrollbar-width: thin;
  scrollbar-color: var(--el-color-primary-light-3) var(--el-fill-color-lighter);
  -webkit-overflow-scrolling: touch;
  /* iOS 平滑滚动 */
  /* 确保滚动条始终可见 */
  scrollbar-gutter: stable;
}

.entity-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  margin-bottom: 12px;
  background: var(--el-bg-color-page);
  border: 2px solid var(--el-border-color-light);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.entity-card:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
  transform: translateY(-2px);
}

.entity-content {
  flex: 1;
  min-width: 0;
}

.entity-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.entity-name {
  font-weight: 600;
  color: var(--el-text-color-primary);
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.entity-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.entity-description {
  font-size: 13px;
  color: var(--el-text-color-regular);
  margin-bottom: 6px;
  line-height: 1.4;
  max-height: 2.8em;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.entity-aliases {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}

.aliases-label {
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.aliases-text {
  margin-left: 4px;
}

.entity-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.entity-id {
  font-size: 11px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
}

.entity-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.entity-confidence {
  font-size: 11px;
  color: var(--el-color-warning);
  background: var(--el-color-warning-light-9);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
}

.entity-source {
  font-size: 11px;
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
  padding: 2px 6px;
  border-radius: 4px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: help;
}

.entity-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.empty-entities {
  text-align: center;
  padding: 60px 20px;
}

/* 预览区域 */
.preview-section {
  margin-top: 8px;
}

.preview-card {
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: none;
}

.preview-controls {
  display: flex;
  gap: 8px;
  margin-left: 16px;
}

.preview-container {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--el-color-primary-light-3) var(--el-fill-color-lighter);
  -webkit-overflow-scrolling: touch;
  /* iOS 平滑滚动 */
  /* 确保滚动条始终可见 */
  scrollbar-gutter: stable;
}

.preview-content {
  padding: 24px;
  border: 2px solid var(--el-border-color-light);
  border-radius: 12px;
  background: var(--el-bg-color-page);
  line-height: 1.8;
  font-size: 16px;
}

.html-content {
  height: 100%;
}

.html-code {
  background: var(--el-bg-color-page);
  padding: 24px;
  border-radius: 12px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  border: 2px solid var(--el-border-color-light);
  height: 100%;
  min-height: 300px;
  scrollbar-width: thin;
  scrollbar-color: var(--el-color-primary-light-3) var(--el-fill-color-lighter);
  -webkit-overflow-scrolling: touch;
  /* iOS 平滑滚动 */
  /* 确保滚动条始终可见 */
  scrollbar-gutter: stable;
}

.empty-preview {
  text-align: center;
  padding: 60px 20px;
}

/* 响应式设计 */
@media (max-width: 1600px) {
  .settings-grid {
    grid-template-columns: 160px 1fr 1fr 1fr;
    gap: 14px;
  }
}

@media (max-width: 1400px) {
  .settings-grid {
    grid-template-columns: 140px 1fr 1fr 1fr;
    gap: 12px;
  }
}

@media (max-width: 1200px) {
  .entities-preview-section {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }

  .input-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .settings-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .prompt-setting,
  .template-setting,
  .controls-setting {
    grid-column: 1 / -1;
  }

  .entities-card,
  .preview-card {
    min-height: 300px;
  }
}

@media (max-width: 900px) {
  .optimized-layout {
    gap: 16px;
    padding: 16px 0;
  }

  .input-section,
  .settings-section,
  .controls-section {
    padding: 16px;
  }

  .settings-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .template-select-container {
    flex-direction: column;
    gap: 8px;
  }

  .template-actions {
    flex-direction: column;
    gap: 6px;
  }
}

@media (max-width: 600px) {
  .input-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .generate-controls,
  .utility-controls {
    flex-direction: column;
    gap: 8px;
  }

  .primary-action,
  .danger-action,
  .utility-action {
    min-width: auto;
    width: 100%;
  }
}

@media (max-width: 768px) {
  .article-generator-page {
    padding: 16px;
    min-height: 100vh;
  }

  .header-content {
    flex-direction: column;
    gap: 24px;
    padding: 24px;
  }

  .header-stats {
    flex-direction: row;
    gap: 16px;
    width: 100%;
    justify-content: space-around;
  }

  .stat-item {
    flex: 1;
    min-width: 0;
  }

  .page-title {
    font-size: 24px;
  }

  .title-icon {
    font-size: 28px;
  }

  .entities-preview-section {
    grid-template-rows: 1fr;
    gap: 16px;
  }

  .entities-card,
  .preview-card {
    min-height: 250px;
  }

  /* 优化移动端布局 */
  .optimized-layout {
    gap: 12px;
    padding: 12px 0;
  }

  .input-section,
  .settings-section,
  .controls-section {
    padding: 12px;
  }

  .section-header {
    margin-bottom: 12px;
    padding-bottom: 6px;
  }

  .section-title {
    font-size: 14px;
  }
}

/* 超小屏幕适配 */
@media (max-width: 480px) {
  .article-generator-page {
    padding: 12px;
  }

  .header-content {
    padding: 16px;
  }

  .page-title {
    font-size: 20px;
  }

  .title-icon {
    font-size: 24px;
  }

  .header-stats {
    flex-direction: column;
    gap: 12px;
  }

  .stat-item {
    padding: 12px 16px;
  }

  .entities-card,
  .preview-card {
    min-height: 200px;
  }

  /* 超小屏幕的优化布局 */
  .optimized-layout {
    gap: 8px;
    padding: 8px 0;
  }

  .input-section,
  .settings-section,
  .controls-section {
    padding: 8px;
  }

  .section-header {
    margin-bottom: 8px;
    padding-bottom: 4px;
  }

  .section-title {
    font-size: 13px;
  }

  .input-grid,
  .settings-grid {
    gap: 8px;
  }
}

/* 高屏幕设备优化 */
@media (min-height: 900px) {

  .entities-card,
  .preview-card {
    min-height: 400px;
  }
}

/* 超高屏幕设备优化 */
@media (min-height: 1200px) {

  .entities-card,
  .preview-card {
    min-height: 500px;
  }
}

/* 滚动条样式 */
.entities-container::-webkit-scrollbar,
.preview-container::-webkit-scrollbar,
.html-code::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.entities-container::-webkit-scrollbar-track,
.preview-container::-webkit-scrollbar-track,
.html-code::-webkit-scrollbar-track {
  background: var(--el-fill-color-lighter);
  border-radius: 4px;
  margin: 4px 0;
}

.entities-container::-webkit-scrollbar-thumb,
.preview-container::-webkit-scrollbar-thumb,
.html-code::-webkit-scrollbar-thumb {
  background: var(--el-color-primary-light-3);
  border-radius: 4px;
  border: 1px solid var(--el-border-color-lighter);
  transition: background-color 0.2s ease;
}

.entities-container::-webkit-scrollbar-thumb:hover,
.preview-container::-webkit-scrollbar-thumb:hover,
.html-code::-webkit-scrollbar-thumb:hover {
  background: var(--el-color-primary);
}

.entities-container::-webkit-scrollbar-corner,
.preview-container::-webkit-scrollbar-corner,
.html-code::-webkit-scrollbar-corner {
  background: var(--el-fill-color-lighter);
}

/* 动画效果 */
.entity-card,
.input-section,
.settings-section,
.controls-section {
  animation: fadeInUp 0.3s ease-out;
}

.input-item,
.setting-item {
  animation: fadeInUp 0.4s ease-out;
}

.input-item:nth-child(1) {
  animation-delay: 0.1s;
}

.input-item:nth-child(2) {
  animation-delay: 0.2s;
}

.setting-item:nth-child(1) {
  animation-delay: 0.1s;
}

.setting-item:nth-child(2) {
  animation-delay: 0.2s;
}

.setting-item:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 区域悬停效果 */
.input-section:hover,
.settings-section:hover,
.controls-section:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

/* 按钮悬停效果 */
.primary-action:hover,
.danger-action:hover,
.utility-action:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

/* 输入框焦点效果 */
.full-width-input:focus-within {
  transform: scale(1.02);
  transition: transform 0.2s ease;
}

/* 加载状态 */
.full-process-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: 0 4px 15px rgba(64, 158, 255, 0.3) !important;
}
</style>
