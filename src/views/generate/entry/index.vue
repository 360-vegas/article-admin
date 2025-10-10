<template>
  <div class="entry-generator-page">
    <el-card shadow="never" class="full-card">
      <template #header>
        <div class="card-header">
          <span>词条生成器</span>
          <div class="right">
            <el-tag :type="wsConnected ? 'success' : 'danger'">{{ wsConnected ? '已连接' : '未连接' }}</el-tag>
            <el-button size="small" @click="connectWebSocket" :disabled="wsConnected">连接</el-button>
            <el-button size="small" type="danger" @click="disconnectWebSocket" :disabled="!wsConnected">断开</el-button>
          </div>
        </div>
      </template>

      <div class="form-grid">
        <el-form :model="form" label-width="120px" :rules="rules" ref="formRef">
          <el-form-item label="词条名称" prop="entry_name">
            <el-input v-model="form.entry_name" placeholder="请输入词条名称" />
          </el-form-item>
          <el-form-item label="JSON提示词" prop="json_preset_code">
            <el-select v-model="form.json_preset_code" placeholder="请选择JSON提示词" clearable filterable
              style="width: 100%">
              <el-option v-for="p in promptList" :key="p.code" :label="p.name + ' (' + p.code + ')'" :value="p.code" />
            </el-select>
          </el-form-item>
          <!-- <el-form-item label="HTML提示词" prop="html_preset_code">
            <el-select v-model="form.html_preset_code" placeholder="请选择HTML提示词" clearable filterable
              style="width: 100%">
              <el-option v-for="p in promptList" :key="p.code" :label="p.name + ' (' + p.code + ')'" :value="p.code" />
            </el-select>
          </el-form-item> -->
          <el-form-item label="语言" prop="lang">
            <el-input v-model="form.lang" placeholder="如 zh、en" />
          </el-form-item>
          <el-form-item label="国家/地区" prop="country_code">
            <el-input v-model="form.country_code" placeholder="如 CN、US" />
          </el-form-item>
          <!-- <el-form-item label="项目ID" prop="project_id">
            <el-input v-model="form.project_id" placeholder="如 1" />
          </el-form-item> -->

          <el-divider>批量参数（可选）</el-divider>
          <el-row :gutter="12">
            <el-col :span="8">
              <el-form-item label="最大文章数">
                <el-input v-model.number="form.max_articles" type="number" placeholder="如 10" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="最大实体数">
                <el-input v-model.number="form.max_entities" type="number" placeholder="如 50" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="循环生成">
                <el-switch v-model="form.enable_post_extract" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="相关实体预设">
            <el-input v-model="form.related_preset_code" placeholder="如 tp" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="sendSingle" :loading="sending">单篇生成</el-button>
            <el-button type="success" @click="sendBatch" :loading="sending">批量生成</el-button>
            <el-divider direction="vertical" />
            <el-button @click="pauseBatch" :disabled="!queueId">暂停</el-button>
            <el-button @click="resumeBatch" :disabled="!queueId">恢复</el-button>
            <el-button type="danger" @click="stopBatch" :disabled="!queueId">停止</el-button>
            <span v-if="queueId" style="margin-left: 8px; color:#909399;">队列: {{ queueId }}</span>
          </el-form-item>
        </el-form>
      </div>

      <div class="log-area">
        <el-card shadow="never" header="消息日志">
          <div class="logs">
            <div v-for="(line, idx) in logs" :key="idx" class="log-line">{{ line }}</div>
          </div>
        </el-card>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, FormInstance } from "element-plus";
import { listPresets, type PromptPreset } from "@/api/prompts";

defineOptions({ name: "EntryGenerator" });

const promptList = ref<PromptPreset[]>([]);
const formRef = ref<FormInstance>();
const form = reactive({
  entry_name: "",
  json_preset_code: "",
  html_preset_code: "",
  lang: "zh",
  country_code: "CN",
  project_id: "1",
  // 批量相关
  max_articles: undefined as number | undefined,
  max_entities: undefined as number | undefined,
  enable_post_extract: false,
  related_preset_code: ""
});
const rules = {
  entry_name: [{ required: true, message: "请输入词条名称", trigger: "blur" }],
  json_preset_code: [{ required: true, message: "请选择JSON提示词", trigger: "change" }],
  html_preset_code: [{ required: true, message: "请选择HTML提示词", trigger: "change" }]
} as any;

// 简单独立的 WebSocket 连接
const ws = ref<WebSocket | null>(null);
const wsConnected = ref(false);
const sending = ref(false);
const logs = ref<string[]>([]);
const queueId = ref<string | null>(null);
const progress = ref<{ current: number; total: number } | null>(null);

function appendLog(text: string) {
  const ts = new Date();
  const time = `${ts.getHours().toString().padStart(2, '0')}:${ts.getMinutes().toString().padStart(2, '0')}:${ts.getSeconds().toString().padStart(2, '0')}`;
  logs.value.unshift(`[${time}] ${text}`);
}

function connectWebSocket() {
  if (ws.value && wsConnected.value) return;
  try {
    const host = window.location.hostname;
    const url = import.meta.env.MODE == 'development' ? `ws://${host}:8848/v1/generation/entry` : `wss://${host}/v1/generation/entry`;
    if (ws.value) ws.value.close();
    ws.value = new WebSocket(url);
    ws.value.onopen = () => { wsConnected.value = true; appendLog('WebSocket 已连接'); };
    ws.value.onclose = () => { wsConnected.value = false; appendLog('WebSocket 已断开'); };
    ws.value.onerror = () => { wsConnected.value = false; appendLog('WebSocket 出错'); };
    ws.value.onmessage = ev => { handleMessage(ev.data); };
  } catch {
    ElMessage.error('无法连接WebSocket');
  }
}

function disconnectWebSocket() {
  try {
    ws.value?.close();
  } finally {
    wsConnected.value = false;
  }
}

async function loadPrompts() {
  try {
    const arr = await listPresets();
    promptList.value = Array.isArray(arr) ? arr : [];
  } catch {
    promptList.value = [];
  }
}

function buildBaseData() {
  return {
    entry_name: form.entry_name,
    json_preset_code: form.json_preset_code,
    lang: form.lang,
    country_code: form.country_code,
    project_id: form.project_id
  } as Record<string, any>;
}

async function sendSingle() {
  const valid = await new Promise<boolean>(resolve => formRef.value?.validate(v => resolve(v)));
  if (!valid) return;
  if (!wsConnected.value) connectWebSocket();
  if (!wsConnected.value) { ElMessage.error('请先连接WebSocket'); return; }

  const payload = {
    type: 'start_entry_generation',
    data: {
      ...buildBaseData(),
      // 单篇也允许传 html_preset_code（保持兼容）
      html_preset_code: form.html_preset_code
    }
  };
  try {
    sending.value = true;
    ws.value?.send(JSON.stringify(payload));
    appendLog(`已发送: ${JSON.stringify(payload)}`);
    ElMessage.success('请求已发送');
  } catch {
    ElMessage.error('发送失败');
  } finally {
    sending.value = false;
  }
}

async function sendBatch() {
  const valid = await new Promise<boolean>(resolve => formRef.value?.validate(v => resolve(v)));
  if (!valid) return;
  if (!wsConnected.value) connectWebSocket();
  if (!wsConnected.value) { ElMessage.error('请先连接WebSocket'); return; }

  const data: Record<string, any> = {
    ...buildBaseData(),
  };
  if (form.max_articles) data.max_articles = form.max_articles;
  if (form.max_entities) data.max_entities = form.max_entities;
  if (form.enable_post_extract) data.enable_post_extract = form.enable_post_extract;
  if (form.related_preset_code) data.related_preset_code = form.related_preset_code;

  const payload = {
    type: 'start_entry_generation',
    data
  };
  try {
    sending.value = true;
    ws.value?.send(JSON.stringify(payload));
    appendLog(`已发送: ${JSON.stringify(payload)}`);
    ElMessage.success('批量请求已发送');
  } catch {
    ElMessage.error('发送失败');
  } finally {
    sending.value = false;
  }
}

function sendControl(action: 'pause' | 'resume' | 'stop') {
  if (!wsConnected.value) { ElMessage.error('请先连接WebSocket'); return; }
  if (!queueId.value) { ElMessage.error('无有效队列'); return; }
  const payload = {
    type: 'start_entry_generation',
    data: { action, queue_id: queueId.value }
  };
  ws.value?.send(JSON.stringify(payload));
  appendLog(`已发送控制: ${JSON.stringify(payload)}`);
}

const pauseBatch = () => sendControl('pause');
const resumeBatch = () => sendControl('resume');
const stopBatch = () => sendControl('stop');

function handleMessage(raw: string) {
  appendLog(`收到: ${raw}`);
  try {
    const msg = JSON.parse(raw);
    const type = msg?.type as string;
    switch (type) {
      case 'entry_generation_started': {
        // 单篇开始
        break;
      }
      case 'entry_generation_completed': {
        // 单篇完成
        break;
      }
      case 'entry_batch_started': {
        queueId.value = msg?.data?.queue_id || null;
        progress.value = null;
        break;
      }
      case 'entities_extracted': {
        // 可根据需要展示实体列表
        break;
      }
      case 'entry_progress': {
        const p = msg?.data?.progress;
        if (p) progress.value = { current: p.current, total: p.total };
        break;
      }
      case 'entry_batch_completed': {
        progress.value = null;
        // 批量完成后保留 queueId 以便后续控制，如需清空可设置为 null
        break;
      }
      case 'entry_batch_paused':
      case 'entry_batch_resumed':
      case 'entry_batch_stopped': {
        // 控制反馈
        break;
      }
      default:
        break;
    }
  } catch {
    // 非 JSON 文本
  }
}

onMounted(() => { loadPrompts(); });
</script>

<style scoped>
.entry-generator-page {
  padding: 16px;
}

.full-card {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-grid {
  padding: 12px 12px 0 12px;
}

.log-area {
  padding: 12px;
}

.logs {
  max-height: 300px;
  overflow: auto;
  display: flex;
  flex-direction: column-reverse;
  gap: 6px;
}

.log-line {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #555;
}
</style>
