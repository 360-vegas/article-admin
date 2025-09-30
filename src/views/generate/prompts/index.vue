<template>
  <div class="main">
    <el-card shadow="never" class="full-card">
      <template #header>
        <div class="card-header flex-bc header-controls">
          <span class="font-medium">提示词管理</span>
          <div class="header-actions">
            <el-button type="primary" @click="openForm()">新增提示词</el-button>
            <el-button @click="loadList">刷新</el-button>
          </div>
        </div>
      </template>

      <div class="list-body">
        <div class="toolbar">
          <el-input v-model="keyword" placeholder="搜索提示词名称" clearable style="max-width: 260px;" />
          <div>
            <el-button type="danger" :disabled="multipleSelection.length === 0" @click="batchRemove">批量删除</el-button>
          </div>
        </div>

        <el-table :data="filteredList" @selection-change="onSelectionChange" height="100%" style="width: 100%">
          <el-table-column type="selection" width="48" />
          <el-table-column prop="code" label="提示词标识" min-width="180" />
          <el-table-column prop="name" label="提示词名称" min-width="180" />
          <el-table-column prop="system_body" label="System 提示词" min-width="220" show-overflow-tooltip />
          <el-table-column prop="user_body" label="User 提示词" min-width="220" show-overflow-tooltip />
          <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
          <el-table-column prop="created_at" label="创建时间" width="200">
            <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column prop="updated_at" label="更新时间" width="200">
            <template #default="{ row }">{{ formatTime(row.updated_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <el-button size="small" @click="openForm(row)">编辑</el-button>
              <el-button size="small" type="danger" @click="removeOne(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- 提示词表单 -->
    <el-dialog v-model="dialogVisible" :title="current ? '编辑提示词' : '新增提示词'" width="1400px">
      <el-form :model="form" label-width="150px" :rules="rules" ref="formRef">
        <el-form-item label="提示词标识" prop="code"><el-input v-model="form.code" :disabled="!!current" /></el-form-item>
        <el-form-item label="提示词名称" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="System 提示词" prop="system_body">
          <el-input v-model="form.system_body" type="textarea" :rows="4" :autosize="{ minRows: 4, maxRows: 10 }"
            placeholder="请输入 System 角色提示词" />
        </el-form-item>
        <el-form-item label="User 提示词" prop="user_body">
          <el-input v-model="form.user_body" type="textarea" :rows="4" :autosize="{ minRows: 4, maxRows: 10 }"
            placeholder="请输入 User 角色提示词" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" :autosize="{ minRows: 2, maxRows: 6 }"
            placeholder="备注（不参与生成）" />
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
import { listPresets, createPreset, updatePresetByCode, deletePresetByCode, getPresetByCode } from "@/api/prompts";

defineOptions({ name: "PromptPresets" });

const keyword = ref("");
const list = ref<any[]>([]);
const multipleSelection = ref<any[]>([]);
const dialogVisible = ref(false);
const formRef = ref<FormInstance>();
const current = ref<any>(null);

const form = reactive({
  code: "",
  name: "",
  system_body: "",
  user_body: "",
  remark: ""
});

const rules = {
  code: [{ required: true, message: "请输入唯一code", trigger: "blur" }],
  name: [{ required: true, message: "请输入提示词名称", trigger: "blur" }]
} as any;


async function loadList() {
  const arr = await listPresets();
  list.value = Array.isArray(arr) ? arr : [];
}

const filteredList = computed(() => list.value.filter(i => (i.name || '').toLowerCase().includes(keyword.value.toLowerCase())));

function onSelectionChange(rows: any[]) { multipleSelection.value = rows; }
function formatTime(ts: any) { if (!ts) return '-'; const d = new Date(ts); if (isNaN(d.getTime())) return '-'; return `${d.getFullYear()}-${(d.getMonth() + 1 + '').padStart(2, '0')}-${(d.getDate() + '').padStart(2, '0')} ${('' + d.getHours()).padStart(2, '0')}:${('' + d.getMinutes()).padStart(2, '0')}`; }

async function openForm(row?: any) {
  if (row) {
    current.value = row;
    try {
      const data = await getPresetByCode(row.code);
      Object.assign(form, {
        code: data?.code || row.code || "",
        name: data?.name || row.name || "",
        system_body: data?.system_body || row.system_body || "",
        user_body: data?.user_body || row.user_body || "",
        remark: data?.remark || row.remark || ""
      });
    } catch {
      Object.assign(form, { code: row.code || '', name: row.name || '', system_body: row.system_body || '', user_body: row.user_body || '', remark: row.remark || '' });
    }
  } else {
    current.value = null;
    Object.assign(form, { code: '', name: '', system_body: '', user_body: '', remark: '' });
  }
  dialogVisible.value = true;
}

async function save() {
  const valid = await new Promise<boolean>(resolve => formRef.value?.validate(v => resolve(v)));
  if (!valid) return;
  const payload: any = { ...form };
  if (current.value) await updatePresetByCode(current.value.code, payload);
  else await createPreset(payload);
  await loadList();
  dialogVisible.value = false;
  ElMessage.success('保存成功');
}

async function removeOne(row: any) {
  await ElMessageBox.confirm('确定删除该提示词吗？', '提示', { type: 'warning' });
  await deletePresetByCode(row.code);
  await loadList();
  ElMessage.success('已删除');
}

async function batchRemove() {
  if (multipleSelection.value.length === 0) return;
  await ElMessageBox.confirm('确定批量删除所选提示词吗？', '提示', { type: 'warning' });
  const codes = multipleSelection.value.map(i => i.code);
  await Promise.all(codes.map(code => deletePresetByCode(code)));
  multipleSelection.value = [];
  await loadList();
  ElMessage.success('批量删除完成');
}

// 预览功能可按需实现

onMounted(() => { loadList(); });
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
