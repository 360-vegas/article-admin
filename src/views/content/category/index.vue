<template>
  <div class="category-page">
    <!-- 头部操作 -->
    <div class="page-header">
      <div class="header-left">
        <h2>{{ $t("menus.contentCategory") }}</h2>
        <p class="page-description">管理分类（支持层级、模板、国家与语言）</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="handleCreate">
          <el-icon>
            <Plus />
          </el-icon>
          新建分类
        </el-button>
        <el-button :disabled="selectedRows.length !== 1" @click="handleAutoCluster">自动聚类</el-button>
        <el-button :disabled="selectedRows.length !== 1" @click="handleMaterialize">物化子分类</el-button>
        <el-button :disabled="selectedRows.length !== 1" @click="openAutoAssignDialog">规则归档</el-button>
        <el-button type="danger" :disabled="selectedRows.length === 0" @click="handleBatchDelete">
          <el-icon>
            <Delete />
          </el-icon>
          批量删除 ({{ selectedRows.length }})
        </el-button>
        <el-button @click="loadCategories" :loading="loading">
          <el-icon>
            <Refresh />
          </el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 筛选搜索 -->
    <el-card shadow="never" class="search-card">
      <div class="search-container">
        <el-input v-model="searchKeyword" placeholder="搜索名称/描述" clearable @keyup.enter="handleSearch"
          class="search-input">
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
        </el-input>
        <el-input v-model="filters.country_code" placeholder="国家代码(如 CN)" clearable class="filter-input" />
        <el-input v-model="filters.lang" placeholder="语言(如 zh)" clearable class="filter-input" />
        <el-button type="primary" @click="handleSearch">查询</el-button>
      </div>
    </el-card>

    <!-- 表格 -->
    <div class="table-container">
      <el-card shadow="never" class="table-card">
        <el-table v-loading="loading" :data="tableData" row-key="id" style="width: 100%" :empty-text="$t('tag.noData')"
          @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="55" />
          <el-table-column prop="name" label="名称" min-width="220" show-overflow-tooltip />
          <el-table-column prop="description" label="描述" min-width="260" show-overflow-tooltip />
          <el-table-column prop="template_key" label="模板" width="140" />
          <el-table-column prop="country_code" label="国家" width="100" />
          <el-table-column prop="lang" label="语言" width="100" />
          <el-table-column prop="depth" label="层级" width="80" align="center" />
          <el-table-column prop="parent_id" label="父级" min-width="160">
            <template #default="{ row }">
              <span>{{ parentName(row.parent_id) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="180">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="300" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click="handleEdit(row)">
                <el-icon>
                  <Edit />
                </el-icon>
                编辑
              </el-button>
              <el-button size="small" @click="openBatchChildrenDialog(row)">批量建子类</el-button>
              <el-button size="small" type="danger" @click="handleDelete(row)">
                <el-icon>
                  <Delete />
                </el-icon>
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 分页 -->
      <div v-if="total > 0" class="pagination-container">
        <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :page-sizes="[10, 20, 50, 100]"
          :total="total" layout="total, sizes, prev, pager, next, jumper" @size-change="handleSizeChange"
          @current-change="handleCurrentChange" />
      </div>
    </div>

    <!-- 新建/编辑 弹窗 -->
    <el-dialog v-model="showDialog" :title="editing ? '编辑分类' : '新建分类'" width="640px" @close="handleDialogClose">
      <el-form :key="formKey" ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="formData.name" maxlength="60" show-word-limit placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="formData.description" type="textarea" :rows="3" maxlength="200" show-word-limit
            placeholder="可选" />
        </el-form-item>
        <el-form-item label="父级分类" prop="parent_id">
          <el-tree-select v-model="formData.parent_id" :data="categoryTreeOptions"
            :props="{ label: 'name', children: 'children', value: 'id' }" check-strictly clearable
            placeholder="选择父级（可为空）" />
        </el-form-item>
        <el-form-item label="模板键" prop="template_key">
          <el-input v-model="formData.template_key" placeholder="例如 person" />
        </el-form-item>
        <el-form-item label="国家代码" prop="country_code">
          <el-input v-model="formData.country_code" placeholder="如 CN" />
        </el-form-item>
        <el-form-item label="语言" prop="lang">
          <el-input v-model="formData.lang" placeholder="如 zh" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量建子类 弹窗 -->
    <el-dialog v-model="showBatchChildren" title="批量创建子分类" width="640px">
      <el-form :model="batchForm" label-width="100px">
        <el-form-item label="父级分类">
          <el-input :model-value="batchParent?.name || ''" disabled />
        </el-form-item>
        <el-form-item label="名称列表">
          <el-input v-model="batchForm.namesRaw" type="textarea" :rows="6" placeholder="输入子分类名称，换行或用逗号分隔" />
        </el-form-item>
        <el-form-item label="语言">
          <el-input v-model="batchForm.lang" placeholder="如 zh" />
        </el-form-item>
        <el-form-item label="国家代码">
          <el-input v-model="batchForm.country_code" placeholder="如 CN" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBatchChildren = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitBatchChildren">创建</el-button>
      </template>
    </el-dialog>

    <!-- 规则归档 弹窗 -->
    <el-dialog v-model="showAutoAssign" title="规则归档到子类" width="720px">
      <div style="margin-bottom:10px;color:#909399;">输入规则 JSON，示例见占位符；支持 dry_run 预览。</div>
      <el-input v-model="autoAssignJson" type="textarea" :rows="12" placeholder='{
  "rules": [
    { "child_name": "诗人", "include": ["诗","词"], "type": "person" },
    { "child_name": "科学家", "include": ["科学","院士"], "type": "person" }
  ],
  "lang": "zh",
  "country_code": "CN",
  "dry_run": true
}' />
      <template #footer>
        <div style="display:flex;justify-content:space-between;width:100%">
          <div>
            <el-button @click="showAutoAssign = false">关闭</el-button>
          </div>
          <div>
            <el-button @click="runAutoAssign(true)" :loading="submitting"
              :disabled="selectedRows.length !== 1">预览(dry_run)</el-button>
            <el-button type="primary" @click="runAutoAssign(false)" :loading="submitting"
              :disabled="selectedRows.length !== 1">执行并归档</el-button>
          </div>
        </div>
      </template>
      <div v-if="autoAssignResult" style="margin-top:12px">
        <el-alert type="success" :closable="false" show-icon
          :title="`命中 ${autoAssignResult.total_matched}，更新 ${autoAssignResult.total_updated}；` + (autoAssignResult.dry_run ? '预览' : '已落库')" />
        <el-table :data="autoAssignResult.details || []" size="small" style="margin-top:10px">
          <el-table-column prop="child_name" label="子类" width="200" />
          <el-table-column prop="matched_entities" label="命中数量" width="120" />
          <el-table-column prop="updated_entities" label="更新数量" width="120" />
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from "vue";
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
import { Plus, Search, Refresh, Edit, Delete } from "@element-plus/icons-vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { safeSplitAndFilter } from "@/utils/safeSplit";
import {
  listCategories,
  createCategory,
  getCategoryById,
  updateCategory,
  deleteCategory,
  autoClusterCategories,
  materializeClusters,
  batchCreateChildren,
  autoAssignChildren,
  type AutoClusterResponse,
  type Category,
  type CreateCategoryDto,
  type UpdateCategoryDto
} from "@/api/categories";

defineOptions({ name: "CategoryManagement" });

const { t } = useI18n();
const route = useRoute();

// 状态
const loading = ref(false);
const submitting = ref(false);
const categories = ref<Category[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);
const searchKeyword = ref("");
const selectedRows = ref<Category[]>([]);
const filters = reactive<{ country_code?: string; lang?: string }>({});
const lastClusterRunId = ref<number | null>(null);

// 子类与规则弹窗
const showBatchChildren = ref(false);
const showAutoAssign = ref(false);
const batchParent = ref<Category | null>(null);

const batchForm = reactive<{ namesRaw: string; lang?: string; country_code?: string }>({
  namesRaw: "",
  lang: "",
  country_code: ""
});

type AutoAssignResponseLocal = {
  total_matched: number;
  total_updated: number;
  details: Array<{ child_name: string; matched_entities: number; updated_entities: number }>;
  dry_run?: boolean;
};

const autoAssignJson = ref("");
const autoAssignResult = ref<AutoAssignResponseLocal | null>(null);

// 弹窗
const showDialog = ref(false);
const editing = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();
const formKey = ref(0);

const formData = reactive<CreateCategoryDto>({
  name: "",
  description: "",
  parent_id: null,
  template_key: "",
  country_code: "",
  lang: ""
});

// 校验
const formRules: FormRules = {
  name: [{ required: true, message: "请输入名称", trigger: "blur" }]
};

// 计算列
const idToName = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {};
  for (const c of categories.value) map[c.id] = c.name;
  return map;
});

function parentName(parentId?: string | null) {
  if (!parentId) return "-";
  return idToName.value[parentId] || parentId;
}

const tableData = computed(() => categories.value);

// 构建树用于选择父级
const categoryTreeOptions = computed(() => buildTree(categories.value));

function buildTree(list: Category[]) {
  const nodeMap: Record<string, any> = {};
  const roots: any[] = [];
  list.forEach(item => {
    nodeMap[item.id] = { ...item, children: [] };
  });
  list.forEach(item => {
    const parentId = (item as any).parent_id as string | undefined | null;
    if (parentId && nodeMap[parentId]) {
      nodeMap[parentId].children.push(nodeMap[item.id]);
    } else {
      roots.push(nodeMap[item.id]);
    }
  });
  return roots;
}

// 加载
async function loadCategories() {
  loading.value = true;
  try {
    const response = await listCategories({
      page: currentPage.value,
      size: pageSize.value,
      keyword: searchKeyword.value,
      country_code: filters.country_code,
      lang: filters.lang
    });
    if (Array.isArray(response)) {
      categories.value = response as unknown as Category[];
      total.value = categories.value.length;
    } else if (response && (response as any).items) {
      categories.value = (response as any).items || [];
      total.value = (response as any).total || 0;
    } else {
      categories.value = [];
      total.value = 0;
    }
  } catch (error: any) {
    console.error("Failed to load categories:", error);
    ElMessage.error("加载失败");
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  currentPage.value = 1;
  loadCategories();
}

function handleSelectionChange(selection: Category[]) {
  selectedRows.value = selection;
}

function resetForm() {
  Object.assign(formData, {
    name: "",
    description: "",
    parent_id: null,
    template_key: "",
    country_code: "",
    lang: ""
  });
  // If dialog is visible, wait for form to render before resetting validations/fields
  if (showDialog.value) {
    nextTick(() => formRef.value?.resetFields());
  } else {
    formRef.value?.resetFields();
  }
  editing.value = false;
  editingId.value = null;
}

function handleCreate() {
  editing.value = false;
  editingId.value = null;
  const parentIdFromQuery = (route.query.parent_id as string) || undefined;
  const parentIdFromSelection = selectedRows.value.length === 1 ? selectedRows.value[0].id : undefined;
  Object.assign(formData, {
    name: "",
    description: "",
    parent_id: parentIdFromSelection || parentIdFromQuery || null,
    template_key: "",
    country_code: "",
    lang: ""
  });
  showDialog.value = true;
  formKey.value++;
  nextTick(() => {
    formRef.value?.clearValidate();
  });
}

function handleEdit(row: Category) {
  resetForm();
  editing.value = true;
  editingId.value = row.id;
  Object.assign(formData, {
    name: row.name,
    description: row.description || "",
    parent_id: (row as any).parent_id ?? undefined,
    template_key: (row as any).template_key || "",
    country_code: (row as any).country_code || "",
    lang: (row as any).lang || ""
  });
  showDialog.value = true;
  nextTick(() => {
    formRef.value?.clearValidate();
  });
}

async function handleBatchDelete() {
  if (selectedRows.value.length === 0) return;
  try {
    await ElMessageBox.confirm(`确定删除选中的 ${selectedRows.value.length} 个分类？此操作不可恢复。`, "确认删除", { type: "warning" });
    for (const row of selectedRows.value) {
      await deleteCategory(row.id);
    }
    ElMessage.success("删除成功");
    selectedRows.value = [];
    loadCategories();
  } catch (error) {
    if (error !== "cancel") {
      console.error("Batch delete error", error);
      ElMessage.error("删除失败");
    }
  }
}

async function handleDelete(row: Category) {
  try {
    await ElMessageBox.confirm("确认删除该分类？删除后不可恢复。", "确认删除", { type: "warning" });
    await deleteCategory(row.id);
    ElMessage.success("删除成功");
    loadCategories();
  } catch (error) {
    if (error !== "cancel") {
      console.error("Delete error", error);
      ElMessage.error("删除失败");
    }
  }
}

async function handleSubmit() {
  if (!formRef.value) return;
  const valid = await formRef.value.validate();
  if (!valid) return;
  submitting.value = true;
  try {
    if (editing.value && editingId.value) {
      const payload: UpdateCategoryDto = { ...formData };
      await updateCategory(editingId.value, payload);
      ElMessage.success("更新成功");
    } else {
      await createCategory(formData);
      ElMessage.success("创建成功");
    }
    showDialog.value = false;
    resetForm();
    loadCategories();
  } catch (error) {
    console.error("Save category error", error);
    ElMessage.error(editing.value ? "更新失败" : "创建失败");
  } finally {
    submitting.value = false;
  }
}

// --- Clustering actions ---
async function handleAutoCluster() {
  if (selectedRows.value.length !== 1) return;
  const parent = selectedRows.value[0];
  try {
    await ElMessageBox.confirm(
      `将对父级 “${parent.name}” 的实体进行自动聚类，继续？`,
      "自动聚类",
      { type: "info" }
    );
  } catch {
    return;
  }
  try {
    loading.value = true;
    const res = await autoClusterCategories(parent.id, {
      algo: "graph_hybrid",
      params: { min_edge_score: 0.6, max_clusters: 20, use_embeddings: false }
    });
    const data = res as unknown as AutoClusterResponse;
    lastClusterRunId.value = data?.cluster_run_id ?? null;
    ElMessage.success(`已生成聚类：${data?.clusters ?? 0}，运行ID：${data?.cluster_run_id}`);
  } catch (e) {
    console.error(e);
    ElMessage.error("自动聚类失败");
  } finally {
    loading.value = false;
  }
}

// --- Children & Auto-assign ---
function openBatchChildrenDialog(parentRow?: Category) {
  const parent = (parentRow || selectedRows.value[0]) as any;
  if (!parent) return;
  batchParent.value = parent as Category;
  batchForm.lang = parent.lang || "";
  batchForm.country_code = parent.country_code || "";
  batchForm.namesRaw = "";
  showBatchChildren.value = true;
}

async function submitBatchChildren() {
  if (!batchParent.value) return;
  const parent = batchParent.value;
  const names = safeSplitAndFilter(batchForm.namesRaw, /\n|,|，/);
  if (names.length === 0) {
    ElMessage.warning("请填写至少一个子分类名称");
    return;
  }
  submitting.value = true;
  try {
    await batchCreateChildren(parent.id, {
      names,
      lang: batchForm.lang || undefined,
      country_code: batchForm.country_code || undefined
    });
    ElMessage.success(`已创建 ${names.length} 个子分类`);
    showBatchChildren.value = false;
    batchParent.value = null;
  } catch (e) {
    console.error(e);
    ElMessage.error("创建子分类失败");
  } finally {
    submitting.value = false;
    handleSearch()
  }
}

function openAutoAssignDialog() {
  if (selectedRows.value.length !== 1) return;
  const parent = selectedRows.value[0] as any;
  autoAssignJson.value = JSON.stringify({
    rules: [
      { child_name: "诗人", include: ["诗", "词"], type: "person" },
      { child_name: "科学家", include: ["科学", "院士"], type: "person" }
    ],
    lang: parent.lang || "zh",
    country_code: parent.country_code || "CN",
    dry_run: true
  }, null, 2);
  autoAssignResult.value = null;
  showAutoAssign.value = true;
}

async function runAutoAssign(dryRun: boolean) {
  if (selectedRows.value.length !== 1) return;
  let payload: any;
  try {
    payload = JSON.parse(autoAssignJson.value || "{}");
  } catch (e) {
    ElMessage.error("规则 JSON 不合法");
    return;
  }
  if (!payload || !Array.isArray(payload.rules)) {
    ElMessage.error("缺少 rules 数组");
    return;
  }
  payload.dry_run = dryRun;
  submitting.value = true;
  try {
    const res = await autoAssignChildren(selectedRows.value[0].id, payload);
    autoAssignResult.value = res as unknown as AutoAssignResponseLocal;
    ElMessage.success(dryRun ? "预览完成" : "归档完成");
    if (!dryRun) {
      // 可根据需要刷新列表或其他联动
    }
  } catch (e) {
    console.error(e);
    ElMessage.error("规则归档失败");
  } finally {
    submitting.value = false;
  }
}

async function handleMaterialize() {
  if (selectedRows.value.length !== 1) return;
  const parent = selectedRows.value[0];
  let clusterRunId = lastClusterRunId.value;
  if (!clusterRunId) {
    try {
      const { value } = await ElMessageBox.prompt("请输入 cluster_run_id", "物化子分类", {
        inputPattern: /^\d+$/,
        inputErrorMessage: "请输入数字",
        confirmButtonText: "确定",
        cancelButtonText: "取消"
      });
      clusterRunId = Number(value);
    } catch {
      return;
    }
  }
  try {
    loading.value = true;
    const res = await materializeClusters(parent.id, {
      cluster_run_id: clusterRunId!,
      naming: "top-entity",
      min_size: 5,
      dry_run: false
    });
    const created = (res as any)?.created_categories?.length || 0;
    const updated = (res as any)?.updated_entities || 0;
    ElMessage.success(`物化完成：创建分类 ${created} 个，更新实体 ${updated} 个`);
    loadCategories();
  } catch (e) {
    console.error(e);
    ElMessage.error("物化子分类失败");
  } finally {
    loading.value = false;
  }
}

function handleDialogClose() {
  resetForm();
}

function handleSizeChange(size: number) {
  pageSize.value = size;
  currentPage.value = 1;
  loadCategories();
}

function handleCurrentChange(page: number) {
  currentPage.value = page;
  loadCategories();
}

function formatDate(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

onMounted(() => {
  loadCategories();
});
</script>

<style scoped>
.category-page {
  padding: 20px;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.header-left h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.page-description {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.search-card {
  margin-bottom: 20px;
  flex-shrink: 0;
}

.search-container {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  flex: 1;
  max-width: 420px;
}

.filter-input {
  width: 160px;
}

.table-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.table-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.table-card :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 0;
}

.table-card :deep(.el-table) {
  height: 100%;
}

.table-card :deep(.el-table__body-wrapper) {
  overflow-y: auto;
  scrollbar-width: thin;
  -webkit-overflow-scrolling: touch;
  scrollbar-gutter: stable;
}

.pagination-container {
  display: flex;
  justify-content: center;
  padding: 20px;
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-top: none;
  border-radius: 0 0 8px 8px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
