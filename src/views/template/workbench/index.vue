<template>
  <div class="main">
    <el-card shadow="never" class="full-card">
      <template #header>
        <div class="card-header flex-bc header-controls">
          <span class="font-medium">模板列表</span>
          <div class="header-actions">
            <el-button type="primary" @click="goCreate">新增模板</el-button>
          </div>
        </div>
      </template>
      <div class="list-body">
        <div class="toolbar">
          <el-input v-model="keyword" placeholder="搜索模板名称" clearable style="max-width: 260px;" />
          <div>

            <el-button @click="addTemplate">新增</el-button>
            <el-button @click="loadList">刷新</el-button>
            <el-button type="danger" :disabled="multipleSelection.length === 0" @click="batchRemove">批量删除</el-button>
          </div>
        </div>
        <el-table :data="filteredList" @selection-change="onSelectionChange" height="100%" style="width: 100%">
          <el-table-column type="selection" width="48" />
          <el-table-column prop="name" label="模板名称" min-width="200" />
          <el-table-column prop="body" label="模板内容" min-width="200" show-overflow-tooltip />
          <el-table-column prop="updatedAt" label="更新时间" width="200">
            <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="220">
            <template #default="{ row }">
              <el-button size="small" @click="goEdit(row)">编辑</el-button>
              <el-button size="small" type="danger" @click="removeOne(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { listTemplates, deleteTemplate, type TemplateItem, createTemplate } from "@/api/templates";
import wiki from './wiki.json'

defineOptions({ name: "TemplateList" });

const router = useRouter();
// 列表页高度占满父容器，无需计算导航高度
const keyword = ref("");
const list = ref<TemplateItem[]>([]);
const multipleSelection = ref<any[]>([]);

async function loadList() {
  try {
    const res = await listTemplates({ keyword: keyword.value });
    list.value = [...res]
  } catch {
    list.value = [];
  }
}
const filteredList = computed(() => list.value.filter(i => (i.name || '').toLowerCase().includes(keyword.value.toLowerCase())));
function onSelectionChange(rows: any[]) { multipleSelection.value = rows; }
function formatTime(ts: number) { if (!ts) return '-'; const d = new Date(ts); return `${d.getFullYear()}-${(d.getMonth() + 1 + '').padStart(2, '0')}-${(d.getDate() + '').padStart(2, '0')} ${('' + d.getHours()).padStart(2, '0')}:${('' + d.getMinutes()).padStart(2, '0')}`; }
function goCreate() { router.push({ path: '/template/workbench/form' }); }
function goEdit(row: any) { router.push({ path: '/template/workbench/form', query: { id: row.id } }); }
async function removeOne(row: any) {
  await ElMessageBox.confirm('确定删除该模板吗？', '提示', { type: 'warning' });
  await deleteTemplate(row.id);
  ElMessage.success('已删除');
  loadList();
}
async function batchRemove() {
  if (multipleSelection.value.length === 0) return;
  await ElMessageBox.confirm('确定批量删除所选模板吗？', '提示', { type: 'warning' });
  const ids = multipleSelection.value.map(i => i.id);
  await Promise.all(ids.map(id => deleteTemplate(id)));
  multipleSelection.value = [];
  ElMessage.success('批量删除完成');
  loadList();
}

const addTemplate = async () => {

  const val = await createTemplate({ name: 'basicTemplate', body: JSON.stringify(wiki) })
}

onMounted(() => { loadList(); });
</script>

<style scoped>
.main {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 0;
  padding: 0;
  background: #fff;
  position: relative;
}

.full-card {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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