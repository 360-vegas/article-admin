<template>
  <div class="main">
    <el-card shadow="never" class="full-card">
      <template #header>
        <div class="card-header flex-bc header-controls">
          <span class="font-medium">项目管理</span>
          <div class="header-actions">
            <el-button type="primary" @click="openForm()">新增项目</el-button>
            <el-button @click="loadList">刷新</el-button>
          </div>
        </div>
      </template>

      <div class="list-body">
        <div class="toolbar">
          <el-input v-model="keyword" placeholder="搜索项目名称" clearable style="max-width: 260px;" />
          <div>
            <el-button type="danger" :disabled="multipleSelection.length === 0" @click="batchRemove">批量删除</el-button>
          </div>
        </div>

        <el-table :data="filteredList" @selection-change="onSelectionChange" height="100%" style="width: 100%">
          <el-table-column type="selection" width="48" />
          <el-table-column prop="name" label="项目名称" min-width="200" />
          <el-table-column prop="country" label="国家" width="120" />
          <el-table-column prop="templateTitle" label="模板" min-width="180" />
          <el-table-column prop="updatedAt" label="更新时间" width="200">
            <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="240">
            <template #default="{ row }">
              <el-button size="small" @click="openForm(row)">编辑</el-button>
              <el-button size="small" @click="preview(row)">预览</el-button>
              <el-button size="small" type="danger" @click="removeOne(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- 项目表单 -->
    <el-dialog v-model="dialogVisible" :title="current?.id ? '编辑项目' : '新增项目'" width="720px">
      <el-form :model="form" label-width="100px" :rules="rules" ref="formRef">
        <el-form-item label="项目名称" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="分类" prop="category"><el-input v-model="form.category" placeholder="请输入分类" /></el-form-item>
        <el-form-item label="国家" prop="country">
          <el-select v-model="form.country" filterable placeholder="请选择国家">
            <el-option v-for="c in countries" :key="c.code" :label="c.name" :value="c.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="模板" prop="templateId">
          <el-select v-model="form.templateId" filterable placeholder="请选择模板">
            <el-option v-for="t in templates" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="JS脚本" prop="script">
          <el-input v-model="form.script" type="textarea" :rows="5" placeholder="可粘贴 script 标签内部的 JS 代码，保存时会自动包裹" />
        </el-form-item>
        <el-form-item label="HTML头部" prop="headHtml">
          <el-input v-model="form.headHtml" type="textarea" :rows="5" placeholder="粘贴 head 标签中需要追加的 HTML 片段" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox, FormInstance } from "element-plus";
import { listTemplates, renderTemplateHtml, type TemplateItem } from "@/api/templates";

defineOptions({ name: "TemplateProjects" });

const keyword = ref("");
const list = ref<any[]>([]);
const multipleSelection = ref<any[]>([]);
const dialogVisible = ref(false);
const formRef = ref<FormInstance>();
const current = ref<any>(null);

const form = reactive({
  id: "",
  name: "",
  category: "",
  country: "",
  templateId: "",
  script: "",
  headHtml: ""
});

const rules = {
  name: [{ required: true, message: "请输入项目名称", trigger: "blur" }],
  country: [{ required: true, message: "请选择国家", trigger: "change" }],
  templateId: [{ required: true, message: "请选择模板", trigger: "change" }]
} as any;

// 示例国家数据（可替换为接口）
const countries = ref([
  { code: "CN", name: "中国" },
  { code: "US", name: "美国" },
  { code: "JP", name: "日本" },
  { code: "VI", name: "越南" }
]);

// 模板下拉：来自后端模板列表
const templates = ref<TemplateItem[]>([]);
async function loadTemplates() {
  try {
    const res = await listTemplates();
    templates.value = Array.isArray(res?.items) ? res.items : [];
  } catch { templates.value = []; }
}

function loadList() {
  try { list.value = JSON.parse(localStorage.getItem('html_projects') || '[]'); }
  catch { list.value = []; }
}

const filteredList = computed(() => list.value.filter(i => (i.name || '').toLowerCase().includes(keyword.value.toLowerCase())));

function onSelectionChange(rows: any[]) { multipleSelection.value = rows; }
function formatTime(ts: number) { if (!ts) return '-'; const d = new Date(ts); return `${d.getFullYear()}-${(d.getMonth() + 1 + '').padStart(2, '0')}-${(d.getDate() + '').padStart(2, '0')} ${('' + d.getHours()).padStart(2, '0')}:${('' + d.getMinutes()).padStart(2, '0')}`; }

function openForm(row?: any) {
  if (row) { current.value = row; Object.assign(form, row); } else { current.value = null; Object.assign(form, { id: "", name: "", category: "", country: "", templateId: "", script: "", headHtml: "" }); }
  dialogVisible.value = true;
}

function save() {
  formRef.value?.validate((valid) => {
    if (!valid) return;
    const arr: any[] = JSON.parse(localStorage.getItem('html_projects') || '[]');
    const item = { ...form, id: form.id || ('proj_' + Date.now()), updatedAt: Date.now(), templateTitle: templates.value.find(t => t.id === form.templateId)?.title || "" };
    const idx = arr.findIndex(i => i.id === item.id);
    if (idx > -1) arr[idx] = item; else arr.unshift(item);
    localStorage.setItem('html_projects', JSON.stringify(arr));
    loadList();
    dialogVisible.value = false;
    ElMessage.success('保存成功');
  });
}

function removeOne(row: any) {
  ElMessageBox.confirm('确定删除该项目吗？', '提示', { type: 'warning' }).then(() => {
    const arr: any[] = JSON.parse(localStorage.getItem('html_projects') || '[]');
    const idx = arr.findIndex(i => i.id === row.id);
    if (idx > -1) { arr.splice(idx, 1); localStorage.setItem('html_projects', JSON.stringify(arr)); loadList(); }
    ElMessage.success('已删除');
  });
}

function batchRemove() {
  if (multipleSelection.value.length === 0) return;
  ElMessageBox.confirm('确定批量删除所选项目吗？', '提示', { type: 'warning' }).then(() => {
    const ids = new Set(multipleSelection.value.map(i => i.id));
    const arr: any[] = JSON.parse(localStorage.getItem('html_projects') || '[]');
    const next = arr.filter(i => !ids.has(i.id));
    localStorage.setItem('html_projects', JSON.stringify(next));
    loadList();
    multipleSelection.value = [];
    ElMessage.success('批量删除完成');
  });
}

async function preview(row: any) {
  if (!row?.templateId) return;
  // 直接请求后端渲染HTML，打开新窗口
  try {
    const html = await renderTemplateHtml(row.templateId, { project_name: row.name, country: row.country });
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
    } else {
      ElMessage.error('无法打开预览窗口');
    }
  } catch (e) {
    ElMessage.error('渲染失败');
  }
}

onMounted(() => { loadTemplates(); loadList(); });
</script>

<style scoped>
.main {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
}

.full-card {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.header-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.list-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.toolbar {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--el-border-color);
}
</style>
