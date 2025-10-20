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
          <el-form-item label="语言" prop="lang">
            <el-select v-model="form.lang" placeholder="请选择语言" style="width: 100%">
              <el-option v-for="lang in languageOptions" :key="lang.code" :label="lang.label" :value="lang.code" />
            </el-select>
          </el-form-item>
          <el-form-item label="词条分类" prop="category">
            <el-select v-model="form.category" placeholder="请选择词条分类" clearable style="width: 100%">
              <el-option v-for="cat in categoryOptions" :key="cat.slug" :label="cat.label" :value="cat.slug" />
            </el-select>
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

// 语言选项列表
const languageOptions = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ru', label: 'Русский' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'hi', label: 'हिन्दी' }
];

// 词条分类列表
const categoryOptions = [
  { slug: 'person', label: '人物' },
  { slug: 'geography', label: '地理' },
  { slug: 'history', label: '历史' },
  { slug: 'culture-art', label: '文化与艺术' },
  { slug: 'science-tech', label: '科学与技术' },
  { slug: 'society-politics', label: '社会与政治' },
  { slug: 'brand-company', label: '品牌与企业' },
  { slug: 'life-health', label: '生活与健康' },
  { slug: 'religion-philosophy', label: '宗教与哲学' },
  { slug: 'education-academic', label: '教育与学术' },
  { slug: 'entertainment-media', label: '娱乐与媒体' },
  { slug: 'internet-digital', label: '互联网与数字文化' },
  { slug: 'nature-environment', label: '自然与环境' },
  { slug: 'transport-architecture', label: '交通与建筑' },
  { slug: 'military-defense', label: '军事与国防' }
];

// 多语言分类标签映射
const categoryLabels = {
  'person': {
    'zh': '人物',
    'en': 'Person',
    'ja': '人物',
    'ko': '인물',
    'es': 'Persona',
    'fr': 'Personne',
    'de': 'Person',
    'ru': 'Персона',
    'vi': 'Nhân vật',
    'hi': 'व्यक्ति'
  },
  'geography': {
    'zh': '地理',
    'en': 'Geography',
    'ja': '地理',
    'ko': '지리',
    'es': 'Geografía',
    'fr': 'Géographie',
    'de': 'Geographie',
    'ru': 'География',
    'vi': 'Địa lý',
    'hi': 'भूगोल'
  },
  'history': {
    'zh': '历史',
    'en': 'History',
    'ja': '歴史',
    'ko': '역사',
    'es': 'Historia',
    'fr': 'Histoire',
    'de': 'Geschichte',
    'ru': 'История',
    'vi': 'Lịch sử',
    'hi': 'इतिहास'
  },
  'culture-art': {
    'zh': '文化与艺术',
    'en': 'Culture & Art',
    'ja': '文化と芸術',
    'ko': '문화와 예술',
    'es': 'Cultura y Arte',
    'fr': 'Culture et Art',
    'de': 'Kultur und Kunst',
    'ru': 'Культура и искусство',
    'vi': 'Văn hóa & Nghệ thuật',
    'hi': 'संस्कृति और कला'
  },
  'science-tech': {
    'zh': '科学与技术',
    'en': 'Science & Technology',
    'ja': '科学と技術',
    'ko': '과학과 기술',
    'es': 'Ciencia y Tecnología',
    'fr': 'Science et Technologie',
    'de': 'Wissenschaft und Technologie',
    'ru': 'Наука и технологии',
    'vi': 'Khoa học & Công nghệ',
    'hi': 'विज्ञान और प्रौद्योगिकी'
  },
  'society-politics': {
    'zh': '社会与政治',
    'en': 'Society & Politics',
    'ja': '社会と政治',
    'ko': '사회와 정치',
    'es': 'Sociedad y Política',
    'fr': 'Société et Politique',
    'de': 'Gesellschaft und Politik',
    'ru': 'Общество и политика',
    'vi': 'Xã hội & Chính trị',
    'hi': 'समाज और राजनीति'
  },
  'brand-company': {
    'zh': '品牌与企业',
    'en': 'Brand & Company',
    'ja': 'ブランドと企業',
    'ko': '브랜드와 기업',
    'es': 'Marca y Empresa',
    'fr': 'Marque et Entreprise',
    'de': 'Marke und Unternehmen',
    'ru': 'Бренд и компания',
    'vi': 'Thương hiệu & Doanh nghiệp',
    'hi': 'ब्रांड और कंपनी'
  },
  'life-health': {
    'zh': '生活与健康',
    'en': 'Life & Health',
    'ja': '生活と健康',
    'ko': '생활과 건강',
    'es': 'Vida y Salud',
    'fr': 'Vie et Santé',
    'de': 'Leben und Gesundheit',
    'ru': 'Жизнь и здоровье',
    'vi': 'Cuộc sống & Sức khỏe',
    'hi': 'जीवन और स्वास्थ्य'
  },
  'religion-philosophy': {
    'zh': '宗教与哲学',
    'en': 'Religion & Philosophy',
    'ja': '宗教と哲学',
    'ko': '종교와 철학',
    'es': 'Religión y Filosofía',
    'fr': 'Religion et Philosophie',
    'de': 'Religion und Philosophie',
    'ru': 'Религия и философия',
    'vi': 'Tôn giáo & Triết học',
    'hi': 'धर्म और दर्शन'
  },
  'education-academic': {
    'zh': '教育与学术',
    'en': 'Education & Academic',
    'ja': '教育と学術',
    'ko': '교육과 학술',
    'es': 'Educación y Academia',
    'fr': 'Éducation et Académie',
    'de': 'Bildung und Wissenschaft',
    'ru': 'Образование и наука',
    'vi': 'Giáo dục & Học thuật',
    'hi': 'शिक्षा और शैक्षणिक'
  },
  'entertainment-media': {
    'zh': '娱乐与媒体',
    'en': 'Entertainment & Media',
    'ja': 'エンターテインメントとメディア',
    'ko': '엔터테인먼트와 미디어',
    'es': 'Entretenimiento y Medios',
    'fr': 'Divertissement et Médias',
    'de': 'Unterhaltung und Medien',
    'ru': 'Развлечения и медиа',
    'vi': 'Giải trí & Truyền thông',
    'hi': 'मनोरंजन और मीडिया'
  },
  'internet-digital': {
    'zh': '互联网与数字文化',
    'en': 'Internet & Digital Culture',
    'ja': 'インターネットとデジタル文化',
    'ko': '인터넷과 디지털 문화',
    'es': 'Internet y Cultura Digital',
    'fr': 'Internet et Culture Numérique',
    'de': 'Internet und Digitale Kultur',
    'ru': 'Интернет и цифровая культура',
    'vi': 'Internet & Văn hóa số',
    'hi': 'इंटरनेट और डिजिटल संस्कृति'
  },
  'nature-environment': {
    'zh': '自然与环境',
    'en': 'Nature & Environment',
    'ja': '自然と環境',
    'ko': '자연과 환경',
    'es': 'Naturaleza y Medio Ambiente',
    'fr': 'Nature et Environnement',
    'de': 'Natur und Umwelt',
    'ru': 'Природа и окружающая среда',
    'vi': 'Thiên nhiên & Môi trường',
    'hi': 'प्रकृति और पर्यावरण'
  },
  'transport-architecture': {
    'zh': '交通与建筑',
    'en': 'Transport & Architecture',
    'ja': '交通と建築',
    'ko': '교통과 건축',
    'es': 'Transporte y Arquitectura',
    'fr': 'Transport et Architecture',
    'de': 'Verkehr und Architektur',
    'ru': 'Транспорт и архитектура',
    'vi': 'Giao thông & Kiến trúc',
    'hi': 'परिवहन और वास्तुकला'
  },
  'military-defense': {
    'zh': '军事与国防',
    'en': 'Military & Defense',
    'ja': '軍事と国防',
    'ko': '군사와 국방',
    'es': 'Militar y Defensa',
    'fr': 'Militaire et Défense',
    'de': 'Militär und Verteidigung',
    'ru': 'Военное дело и оборона',
    'vi': 'Quân sự & Quốc phòng',
    'hi': 'सैन्य और रक्षा'
  }
};

// 获取分类的本地化标签
function getCategoryLabel(slug: string, lang: string): string {
  const labels = categoryLabels[slug];
  if (!labels) return slug;
  return labels[lang] || labels['en'] || slug;
}

const form = reactive({
  entry_name: "",
  category: "", // 新增分类字段
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
  lang: [{ required: true, message: "请选择语言", trigger: "change" }],
  entry_name: [{ required: true, message: "请输入词条名称", trigger: "blur" }],
  category: [{ required: true, message: "请选择词条分类", trigger: "change" }],
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
  // 根据语言获取分类的本地化标签
  const categoryLabel = form.category ? getCategoryLabel(form.category, form.lang) : '';

  return {
    entry_name: form.entry_name,
    category: form.category,
    category_label: categoryLabel, // 添加本地化的分类标签
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
