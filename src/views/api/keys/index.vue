<template>
  <div class="ai-config-page">
    <!-- 当前激活配置卡片 -->
    <el-card shadow="never" class="current-config-card">
      <template #header>
        <div class="card-header">
          <span>{{ $t("apiKeys.currentActiveConfig") }}</span>
          <div class="header-actions">
            <el-button type="success" @click="handleTestConnection" :loading="testingConnection"
              :disabled="!currentConfig || !currentConfig.provider || !currentConfig.api_key || !currentConfig.model">
              <el-icon>
                <Connection />
              </el-icon>
              {{ $t("apiKeys.testConnection") }}
            </el-button>
            <el-button type="primary" @click="loadCurrentConfig" :loading="loadingCurrent">
              <el-icon>
                <Refresh />
              </el-icon>
              {{ $t("apiKeys.refresh") }}
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="loadingCurrent" class="loading-container">
        <el-skeleton :rows="2" animated />
      </div>

      <div v-else-if="!currentConfig || !currentConfig.provider || !currentConfig.api_key" class="no-config">
        <div class="no-config-content">
          <el-icon size="32" color="#c0c4cc">
            <Connection />
          </el-icon>
          <span class="no-config-text">{{ $t("apiKeys.noConfig") }}</span>
        </div>
      </div>

      <div v-else class="current-config-info">
        <div class="config-details">
          <div class="config-main">
            <h3>{{ currentConfig.name }}</h3>
            <div class="config-meta">
              <el-tag type="success" size="small">{{ $t("apiKeys.activated") }}</el-tag>
              <el-tag type="info" size="small">{{ currentConfig.provider }}</el-tag>
              <el-tag size="small">{{ currentConfig.model }}</el-tag>
            </div>
          </div>
          <div class="config-actions">
            <el-button size="small" @click="editCurrentConfig">{{ $t("apiKeys.edit") }}</el-button>
            <el-button size="small" type="danger" @click="deactivateConfig">{{ $t("apiKeys.deactivate") }}</el-button>
          </div>
        </div>
        <div class="config-params"
          v-if="currentConfig.temperature !== undefined || currentConfig.max_tokens || currentConfig.api_key">
          <div v-if="currentConfig.api_key" class="param-item">
            <span class="param-label">API Key:</span>
            <span class="param-value">{{ maskApiKey(currentConfig.api_key) }}</span>
          </div>
          <div v-if="currentConfig.temperature !== undefined" class="param-item">
            <span class="param-label">{{ $t("apiKeys.temperature") }}:</span>
            <span class="param-value">{{ currentConfig.temperature }}</span>
          </div>
          <div v-if="currentConfig.max_tokens" class="param-item">
            <span class="param-label">{{ $t("apiKeys.maxTokens") }}:</span>
            <span class="param-value">{{ currentConfig.max_tokens }}</span>
          </div>
          <div v-if="currentConfig.base_url" class="param-item">
            <span class="param-label">Base URL:</span>
            <span class="param-value">{{ currentConfig.base_url }}</span>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 配置列表 -->
    <el-card shadow="never" class="config-list-card">
      <template #header>
        <div class="card-header">
          <span>{{ $t("apiKeys.configManagement") }}</span>
          <div class="header-actions">
            <el-input v-model="searchKeyword" :placeholder="$t('apiKeys.searchConfigPlaceholder')"
              style="width: 200px; margin-right: 10px;" clearable @input="handleSearch">
              <template #prefix>
                <el-icon>
                  <Search />
                </el-icon>
              </template>
            </el-input>
            <el-button type="primary" @click="showCreateDialog = true">
              <el-icon>
                <Plus />
              </el-icon>
              {{ $t("apiKeys.createConfig") }}
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="3" animated />
      </div>

      <div v-else-if="filteredConfigs.length > 0" class="config-list">
        <div v-for="config in filteredConfigs" :key="config.id" class="config-item"
          :class="{ 'active': config.isActive }">
          <div class="config-info">
            <div class="config-name">
              <h4>{{ config.name }}</h4>
              <div class="config-tags">
                <el-tag :type="config.isActive ? 'success' : 'info'" size="small">
                  {{ config.isActive ? $t("apiKeys.activated") : $t("apiKeys.notActivated") }}
                </el-tag>
                <el-tag type="info" size="small">{{ config.provider }}</el-tag>
                <el-tag size="small">{{ config.model }}</el-tag>

                <!-- 操作按钮放在标签行末尾 -->
                <div class="config-actions">
                  <el-button v-if="!config.isActive" type="primary" size="small" @click="activateConfig(config.id)"
                    :loading="activatingId === config.id">
                    {{ $t("apiKeys.activate") }}
                  </el-button>
                  <el-button size="small" @click="editConfig(config)">{{ $t("apiKeys.edit") }}</el-button>
                  <el-button v-if="!config.isActive" size="small" type="danger" @click="deleteConfig(config.id)">
                    {{ $t("apiKeys.delete") }}
                  </el-button>
                </div>
              </div>
            </div>
            <div class="config-details">
              <div v-if="config.temperature !== undefined" class="detail-item">
                <span class="label">{{ $t("apiKeys.temperature") }}:</span>
                <span class="value">{{ config.temperature }}</span>
              </div>
              <div v-if="config.max_tokens" class="detail-item">
                <span class="label">{{ $t("apiKeys.maxTokens") }}:</span>
                <span class="value">{{ config.max_tokens }}</span>
              </div>
              <div v-if="config.api_key" class="detail-item">
                <span class="label">API Key:</span>
                <span class="value">{{ maskApiKey(config.api_key) }}</span>
              </div>
              <div v-if="config.base_url" class="detail-item">
                <span class="label">Base URL:</span>
                <span class="value">{{ config.base_url }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </el-card>

    <!-- 创建/编辑配置对话框 -->
    <el-dialog v-model="showCreateDialog" :title="editingConfig ? $t('apiKeys.editConfig') : $t('apiKeys.createConfig')"
      width="600px" @close="resetForm">
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item :label="$t('apiKeys.provider')" prop="provider">
          <el-select v-model="formData.provider" :placeholder="$t('apiKeys.selectProvider')"
            @change="handleProviderChange">
            <el-option v-for="provider in providers" :key="provider.id" :label="provider.name" :value="provider.id"
              :disabled="provider.status !== 'active'" />
          </el-select>
        </el-form-item>

        <el-form-item :label="$t('apiKeys.model')" prop="model">
          <el-select v-model="formData.model"
            :placeholder="loadingModels ? $t('apiKeys.loadingModels') : (availableModels.length > 0 ? $t('apiKeys.selectModel') : $t('apiKeys.selectProviderFirst'))"
            :disabled="availableModels.length === 0 || loadingModels" :loading="loadingModels">
            <el-option v-for="model in availableModels" :key="model" :label="model" :value="model" />
          </el-select>
          <div v-if="loadingModels && formData.provider" class="model-tip">
            <el-text type="info" size="small">{{ $t("apiKeys.loadingModelList") }}</el-text>
          </div>
          <div v-else-if="availableModels.length === 0 && formData.provider && !loadingModels" class="model-tip">
            <el-text type="warning" size="small">{{ $t("apiKeys.noAvailableModels") }}</el-text>
          </div>
        </el-form-item>

        <el-form-item label="API Key" prop="api_key">
          <el-input v-model="formData.api_key" type="password" :placeholder="getApiKeyPlaceholder()" show-password
            clearable />
        </el-form-item>

        <el-form-item label="Base URL" prop="base_url">
          <el-input v-model="formData.base_url" :placeholder="$t('apiKeys.enterBaseUrl')" clearable />
        </el-form-item>

        <el-form-item :label="$t('apiKeys.temperature')" prop="temperature">
          <el-slider v-model="formData.temperature" :min="0" :max="2" :step="0.1" show-input style="width: 300px;" />
        </el-form-item>

        <el-form-item :label="$t('apiKeys.maxTokens')" prop="max_tokens">
          <el-input-number v-model="formData.max_tokens" :min="1" style="width: 200px;" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showCreateDialog = false">{{ $t("apiKeys.cancel") }}</el-button>
        <el-button type="info" @click="handleTestApiKey" :loading="testingConnection"
          :disabled="!formData.api_key || !formData.provider || !formData.model">
          {{ $t("apiKeys.testApiKey") }}
        </el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ editingConfig ? $t("apiKeys.update") : $t("apiKeys.create") }}
        </el-button>
        <el-button v-if="!editingConfig" type="success" @click="handleActivate" :loading="submitting">
          {{ $t("apiKeys.createAndActivate") }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick, watch } from "vue";
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
import { Refresh, Search, Plus, Connection } from "@element-plus/icons-vue";
import { useI18n } from "vue-i18n";
import {
  getCurrentConfig,
  saveCurrentConfig,
  activateConfig as activateConfigApi,
  getConfigList,
  createConfig,
  updateConfigById,
  deleteConfigById,
  activateConfigById,
  deactivateConfigById,
  getProviders,
  getProviderModels,
  testAiConnection,
  testApiKey,
  type AiConfig,
  type CreateAiConfigDto,
  type AiProviderInfo,
  type AiModelInfo
} from "@/api/ai";

defineOptions({ name: "AiConfig" });

const { t } = useI18n();

// 工具函数：为配置生成前端需要的字段
function enhanceConfig(config: AiConfig, index: number): AiConfig {
  return {
    ...config,
    // 使用API返回的真实ID，不需要生成
    name: `${config.provider} - ${config.model}`,
    isActive: false // 默认未激活，需要从当前配置判断
  };
}

// 工具函数：掩码API Key
function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) return apiKey;
  return apiKey.substring(0, 8) + "..." + apiKey.substring(apiKey.length - 4);
}


// 响应式数据
const loading = ref(false);
const loadingCurrent = ref(false);
const submitting = ref(false);
const activatingId = ref<string | null>(null);
const testingConnection = ref(false);

// 当前配置
const currentConfig = ref<AiConfig | null>(null);

// 配置列表
const configs = ref<AiConfig[]>([]);
const filteredConfigs = ref<AiConfig[]>([]);
const searchKeyword = ref("");

// 提供商数据
const providers = ref<AiProviderInfo[]>([]);

// 模型数据
const currentProviderModels = ref<AiModelInfo[]>([]);
const loadingModels = ref(false);

// 确保 currentProviderModels 始终是数组
watch(currentProviderModels, (newValue) => {
  if (!Array.isArray(newValue)) {
    console.warn("currentProviderModels is not an array, resetting to empty array");
    currentProviderModels.value = [];
  }
}, { immediate: true });

// 对话框相关
const showCreateDialog = ref(false);
const editingConfig = ref<AiConfig | null>(null);
const formRef = ref<FormInstance>();

// 表单数据
const formData = reactive<CreateAiConfigDto>({
  provider: "",
  api_key: "",
  model: "",
  temperature: 1,
  max_tokens: 1000,
  base_url: ""
});

// 表单验证规则
const formRules: FormRules = {
  provider: [{ required: true, message: t("apiKeys.selectProviderRequired"), trigger: "change" }],
  model: [{ required: true, message: t("apiKeys.selectModelRequired"), trigger: "change" }],
  api_key: [{ required: true, message: t("apiKeys.enterApiKeyRequired"), trigger: "blur" }],
  temperature: [{ required: true, message: t("apiKeys.setTemperatureRequired"), trigger: "blur" }],
  max_tokens: [{ required: true, message: t("apiKeys.setMaxTokensRequired"), trigger: "blur" }],
  base_url: [{ required: true, message: t("apiKeys.enterBaseUrlRequired"), trigger: "blur" }]
};

// 计算属性
const selectedProvider = computed(() => {
  return providers.value.find(p => p.id === formData.provider);
});

const availableModels = computed(() => {
  // 优先使用动态加载的模型，如果没有则使用提供商自带的模型
  if (Array.isArray(currentProviderModels.value) && currentProviderModels.value.length > 0) {
    return currentProviderModels.value.map(model => model.name);
  }
  if (selectedProvider.value?.models) {
    return selectedProvider.value.models;
  }
  return [];
});

// 根据提供商设置默认的base_url
const defaultBaseUrls = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  google: "https://generativelanguage.googleapis.com/v1",
  grok: "https://console.x.ai/v1"
};

// 根据提供商获取API Key的placeholder
function getApiKeyPlaceholder(): string {
  if (!formData.provider) return t("apiKeys.enterApiKey");

  const placeholders: Record<string, string> = {
    openai: "sk-...",
    anthropic: "sk-ant-...",
    google: "AI...",
    "x.ai": "xai-...",
    grok: "xai-..."
  };

  const placeholder = placeholders[formData.provider] || t("apiKeys.enterApiKey");
  console.log("API Key placeholder for", formData.provider, ":", placeholder); // 调试日志
  return placeholder;
}

// 方法
async function loadCurrentConfig() {
  loadingCurrent.value = true;
  try {
    currentConfig.value = await getCurrentConfig();
  } catch (error) {
    console.error("Failed to load current config:", error);
    currentConfig.value = null;
  } finally {
    loadingCurrent.value = false;
  }
}


async function loadConfigs() {
  loading.value = true;
  try {
    const response = await getConfigList();
    // 为每个配置添加前端需要的字段
    configs.value = response.map((config, index) => enhanceConfig(config, index));


    // 设置激活状态 - 优先使用ID匹配，如果没有ID则使用字段匹配
    if (currentConfig.value) {
      configs.value.forEach(config => {
        if (currentConfig.value?.id && config.id) {
          // 如果有ID，优先使用ID匹配
          config.isActive = config.id === currentConfig.value.id;
        } else {
          // 如果没有ID，使用字段匹配
          config.isActive = config.provider === currentConfig.value?.provider &&
            config.model === currentConfig.value?.model &&
            config.api_key === currentConfig.value?.api_key &&
            config.base_url === currentConfig.value?.base_url;
        }
      });
    } else {
      // 如果没有当前配置，清除所有激活状态
      configs.value.forEach(config => {
        config.isActive = false;
      });
    }


    // 强制触发响应式更新
    configs.value = [...configs.value];

    // 应用搜索过滤
    applySearchFilter();
  } catch (error) {
    console.error("Failed to load configs:", error);
    ElMessage.error(t("apiKeys.loadConfigListError"));
  } finally {
    loading.value = false;
  }
}

async function loadProviders() {
  try {
    providers.value = await getProviders();
  } catch (error) {
    console.error("Failed to load providers:", error);
    ElMessage.error(t("apiKeys.loadProviderListError"));
  }
}

// 加载指定提供商的模型列表
async function loadProviderModels(providerId: string) {
  if (!providerId) {
    currentProviderModels.value = [];
    return;
  }

  loadingModels.value = true;
  try {
    const models = await getProviderModels(providerId);

    // 确保返回的是数组
    if (Array.isArray(models)) {
      currentProviderModels.value = models;
      console.log("Loaded models for provider", providerId, ":", models); // 调试日志
    } else {
      console.warn("API returned non-array data:", models);
      currentProviderModels.value = [];
    }
  } catch (error) {
    console.error("Failed to load provider models:", error);
    ElMessage.error(t("apiKeys.loadModelListError"));
    currentProviderModels.value = [];
  } finally {
    loadingModels.value = false;
  }
}

async function handleProviderChange() {
  formData.model = "";
  currentProviderModels.value = []; // 清空当前模型列表

  if (!formData.provider) {
    return;
  }

  // 设置默认的base_url
  if (defaultBaseUrls[formData.provider as keyof typeof defaultBaseUrls]) {
    formData.base_url = defaultBaseUrls[formData.provider as keyof typeof defaultBaseUrls];
  }

  // 调整最大tokens限制
  if (selectedProvider.value?.max_tokens) {
    formData.max_tokens = Math.min(formData.max_tokens, selectedProvider.value.max_tokens);
  }

  // 调用接口获取该提供商的模型列表
  await loadProviderModels(formData.provider);

  // 如果加载到模型列表，自动选择第一个
  if (availableModels.value.length > 0) {
    formData.model = availableModels.value[0];
  }
}

// 搜索过滤函数
function applySearchFilter() {
  if (!searchKeyword.value.trim()) {
    filteredConfigs.value = configs.value;
  } else {
    const keyword = searchKeyword.value.toLowerCase();
    filteredConfigs.value = configs.value.filter(config =>
      config.provider.toLowerCase().includes(keyword) ||
      config.model.toLowerCase().includes(keyword) ||
      (config.name && config.name.toLowerCase().includes(keyword))
    );
  }
}

function handleSearch() {
  applySearchFilter();
}

function editCurrentConfig() {
  if (!currentConfig.value) return;
  editConfig(currentConfig.value);
}

async function editConfig(config: AiConfig) {
  editingConfig.value = config;
  Object.assign(formData, {
    provider: config.provider,
    model: config.model,
    api_key: config.api_key || "",
    temperature: config.temperature || 1,
    max_tokens: config.max_tokens || 1000,
    base_url: config.base_url || ""
  });

  // 加载该提供商的模型列表
  if (config.provider) {
    await loadProviderModels(config.provider);
  }

  showCreateDialog.value = true;
}

function resetForm() {
  editingConfig.value = null;
  currentProviderModels.value = []; // 清空模型列表
  Object.assign(formData, {
    provider: "",
    model: "",
    api_key: "",
    temperature: 1,
    max_tokens: 1000,
    base_url: ""
  });
  formRef.value?.resetFields();
}

async function handleSubmit() {
  if (!formRef.value) return;

  const valid = await formRef.value.validate();
  if (!valid) return;

  submitting.value = true;
  try {
    if (editingConfig.value && editingConfig.value.id) {
      // 使用API返回的真实ID进行更新
      await updateConfigById(editingConfig.value.id, formData);
      ElMessage.success(t("apiKeys.configUpdateSuccess"));
    } else {
      await createConfig(formData);
      ElMessage.success(t("apiKeys.configCreateSuccess"));
    }

    showCreateDialog.value = false;
    resetForm();
    // 先加载当前配置，再加载配置列表（确保isActive状态正确）
    await loadCurrentConfig();
    await loadConfigs();
  } catch (error) {
    console.error("Failed to save config:", error);
    ElMessage.error(editingConfig.value ? t("apiKeys.configUpdateError") : t("apiKeys.configCreateError"));
  } finally {
    submitting.value = false;
  }
}

// 创建并激活配置
async function handleActivate() {
  console.log("handleActivate called"); // 调试日志
  if (!formRef.value) return;

  const valid = await formRef.value.validate();
  if (!valid) return;

  submitting.value = true;
  try {
    console.log("Creating config:", formData); // 调试日志
    // 先创建配置
    const createdConfig = await createConfig(formData);

    console.log("Created config:", createdConfig); // 调试日志

    if (createdConfig && createdConfig.id) {
      console.log("Activating config with ID:", createdConfig.id); // 调试日志
      // 使用创建后返回的配置ID进行激活
      await activateConfigById(createdConfig.id);
    } else {
      throw new Error(t("apiKeys.configNotFound"));
    }

    ElMessage.success(t("apiKeys.configCreateAndActivateSuccess"));

    showCreateDialog.value = false;
    resetForm();

    // 先加载当前配置，再加载配置列表（确保isActive状态正确）
    await loadCurrentConfig();
    await loadConfigs();

    // 加载当前配置对应的模型列表
    if (currentConfig.value && currentConfig.value.provider) {
      await loadProviderModels(currentConfig.value.provider);
    }
  } catch (error) {
    console.error("Failed to create and activate config:", error);
    ElMessage.error("配置创建并激活失败");
  } finally {
    submitting.value = false;
  }
}

async function activateConfig(id: string) {
  activatingId.value = id;
  try {
    // 验证配置是否存在
    const config = configs.value.find(c => c.id === id);
    if (!config) {
      ElMessage.error("未找到要激活的配置");
      return;
    }
    console.log(config)
    localStorage.setItem('ai-modal', JSON.stringify(config.model))
    // console.log("Activating config with API ID:", id, "config:", config); // 调试日志

    // 使用API返回的真实ID进行激活
    await activateConfigById(id);

    ElMessage.success(t("apiKeys.configActivateSuccess"));

    // 先加载当前配置，再加载配置列表（确保isActive状态正确）
    await loadCurrentConfig();
    await loadConfigs();

    // 加载当前配置对应的模型列表
    if (currentConfig.value && currentConfig.value.provider) {
      await loadProviderModels(currentConfig.value.provider);
    }
  } catch (error) {
    console.error("Failed to activate config:", error);
    ElMessage.error(t("apiKeys.configActivateError"));
  } finally {
    activatingId.value = null;
  }
}

async function deactivateConfig() {
  try {
    await ElMessageBox.confirm(t("apiKeys.confirmDeactivateMessage"), t("apiKeys.confirmDeactivate"), {
      type: "warning"
    });

    if (currentConfig.value && currentConfig.value.id) {
      // 使用停用API
      await deactivateConfigById(currentConfig.value.id);
      ElMessage.success(t("apiKeys.configDeactivated"));
    } else {
      // 如果没有ID，使用保存空配置的方式
      await saveCurrentConfig({
        provider: "",
        api_key: "",
        model: "",
        temperature: 1,
        max_tokens: 1000,
        base_url: ""
      });
      ElMessage.success(t("apiKeys.configDeactivated"));
    }

    // 重新加载配置
    await loadCurrentConfig();
    await loadConfigs();
  } catch (error) {
    if (error !== "cancel") {
      console.error("Failed to deactivate config:", error);
      ElMessage.error(t("apiKeys.configDeactivateError"));
    }
  }
}

async function deleteConfig(id: string) {
  try {
    // 检查配置是否已激活
    const config = configs.value.find(c => c.id === id);
    if (config && config.isActive) {
      ElMessage.warning(t("apiKeys.cannotDeleteActiveConfig"));
      return;
    }

    await ElMessageBox.confirm(t("apiKeys.confirmDeleteMessage"), t("apiKeys.confirmDelete"), {
      type: "warning"
    });

    console.log("Deleting config with API ID:", id); // 调试日志

    // 使用API返回的真实ID进行删除
    await deleteConfigById(id);
    ElMessage.success(t("apiKeys.configDeleteSuccess"));
    // 先加载当前配置，再加载配置列表（确保isActive状态正确）
    await loadCurrentConfig();
    await loadConfigs();
  } catch (error) {
    if (error !== "cancel") {
      console.error("Failed to delete config:", error);
      ElMessage.error(t("apiKeys.configDeleteError"));
    }
  }
}

// 测试AI连接
async function handleTestConnection() {
  if (!currentConfig.value || !currentConfig.value.provider || !currentConfig.value.api_key || !currentConfig.value.model) {
    ElMessage.warning(t("apiKeys.activateConfigFirst"));
    return;
  }

  testingConnection.value = true;
  try {
    const result = await testApiKey({
      provider: currentConfig.value.provider,
      api_key: currentConfig.value.api_key,
      model: currentConfig.value.model,
      base_url: currentConfig.value.base_url
    });

    if (result.success) {
      ElMessage.success(`AI连接测试成功: ${result.message}`);
    } else {
      ElMessage.error(`AI连接测试失败: ${result.message}`);
    }
  } catch (error) {
    console.error("AI连接测试失败:", error);
    ElMessage.error(t("apiKeys.aiConnectionTestFailed"));
  } finally {
    testingConnection.value = false;
  }
}

// 测试API Key
async function handleTestApiKey() {
  if (!formData.api_key || !formData.provider || !formData.model) {
    ElMessage.warning(t("apiKeys.fillApiKeyFirst"));
    return;
  }

  testingConnection.value = true;
  try {
    const result = await testApiKey({
      provider: formData.provider,
      api_key: formData.api_key,
      model: formData.model,
      base_url: formData.base_url
    });

    if (result.success) {
      ElMessage.success(`API Key测试成功`);
    } else {
      ElMessage.error(`API Key测试失败`);
    }
  } catch (error) {
    console.error("API Key测试失败:", error);
    ElMessage.error(t("apiKeys.apiKeyTestFailed"));
  } finally {
    testingConnection.value = false;
  }
}

// 生命周期
onMounted(async () => {
  // 先加载当前配置和提供商列表
  await Promise.all([loadCurrentConfig(), loadProviders()]);

  // 再加载配置列表（会在内部增强当前配置信息）
  await loadConfigs();

  // 如果有当前激活配置，自动加载其模型列表
  if (currentConfig.value && currentConfig.value.provider) {
    console.log("Auto-loading models for current provider:", currentConfig.value.provider);
    await loadProviderModels(currentConfig.value.provider);
  }
});
</script>

<style scoped>
.ai-config-page {
  padding: 20px;
  height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.loading-container {
  padding: 20px;
}

.no-config {
  padding: 40px 20px;
  text-align: center;
}

.no-config-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.no-config-text {
  font-size: 14px;
  color: #909399;
}


.current-config-card {
  flex: 0 0 auto;
}

.config-list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.current-config-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.config-main h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
}

.config-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}

.config-params {
  display: flex;
  gap: 24px;
  padding: 12px 0;
  border-top: 1px solid #f0f0f0;
}

.param-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.param-label {
  color: #606266;
  font-size: 14px;
}

.param-value {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}


.config-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  overflow-y: auto;
  padding: 0 4px;
}

.config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  transition: all 0.3s ease;
  height: 120px;
  /* 固定高度 */
  min-height: 120px;
  max-height: 120px;
}

.config-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.config-item.active {
  border-color: #67c23a;
  background-color: #f0f9ff;
}

.config-info {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.config-name h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.2;
}

.config-tags {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.config-details {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  flex: 1;
  align-items: center;
}

.detail-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.detail-item .label {
  color: #606266;
  font-size: 14px;
}

.detail-item .value {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}


.config-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-left: auto;
}

.config-actions .el-button {
  height: 24px;
  padding: 4px 8px;
  font-size: 12px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.empty-list {
  text-align: center;
  padding: 40px;
}

.model-tip {
  margin-top: 4px;
}

@media (max-width: 768px) {
  .config-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .config-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .config-details {
    flex-direction: column;
    gap: 8px;
  }
}
</style>