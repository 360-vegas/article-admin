<template>
  <div class="tag-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2>{{ $t("menus.contentTag") }}</h2>
        <p class="page-description">管理您的词条内容，支持创建、编辑、删除和搜索功能</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="handleCreate">
          <el-icon>
            <Plus />
          </el-icon>
          {{ $t("tag.create") }}
        </el-button>
        <el-button type="danger" :disabled="selectedEntities.length === 0" @click="handleBatchDelete">
          <el-icon>
            <Delete />
          </el-icon>
          批量删除 ({{ selectedEntities.length }})
        </el-button>
      </div>
    </div>

    <!-- 搜索和筛选区域 -->
    <el-card shadow="never" class="search-card">
      <div class="search-container">
        <el-input v-model="searchKeyword" :placeholder="$t('tag.searchPlaceholder')" clearable @input="handleSearch"
          class="search-input">
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
        </el-input>
        <el-button @click="loadEntities" :loading="loading">
          <el-icon>
            <Refresh />
          </el-icon>
          刷新
        </el-button>
      </div>
    </el-card>

    <!-- 表格和分页容器 -->
    <div class="table-container">
      <el-card shadow="never" class="table-card">
        <el-table v-loading="loading" :data="entities" @selection-change="handleSelectionChange" stripe
          style="width: 100%" :empty-text="$t('tag.noData')">
          <el-table-column type="selection" width="55" />
          <el-table-column prop="name" :label="$t('tag.title')" min-width="200" show-overflow-tooltip />
          <el-table-column prop="description" :label="$t('tag.description')" min-width="250" show-overflow-tooltip />
          <el-table-column prop="articleCount" :label="$t('tag.articleCount')" width="100" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.articleCount > 0" type="info" size="small">
                {{ row.articleCount }}
              </el-tag>
              <span v-else class="no-data">0</span>
            </template>
          </el-table-column>
          <el-table-column prop="categoryCount" :label="$t('tag.categoryCount')" width="100" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.categoryCount > 0" type="success" size="small">
                {{ row.categoryCount }}
              </el-tag>
              <span v-else class="no-data">0</span>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" :label="$t('tag.createdAt')" width="180">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column prop="updatedAt" :label="$t('tag.updatedAt')" width="180">
            <template #default="{ row }">
              <span v-if="row.updatedAt && row.updatedAt !== row.createdAt">
                {{ formatDate(row.updatedAt) }}
              </span>
              <span v-else class="no-update">-</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('tag.actions')" width="240" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click="handleEdit(row)">
                <el-icon>
                  <Edit />
                </el-icon>
                {{ $t("tag.edit") }}
              </el-button>
              <el-button size="small" type="danger" @click="handleDelete(row)">
                <el-icon>
                  <Delete />
                </el-icon>
                {{ $t("tag.delete") }}
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

    <!-- 词条编辑对话框 -->
    <el-dialog v-model="showDialog" :title="editingEntity ? $t('tag.edit') : $t('tag.create')" width="600px"
      @close="handleDialogClose">
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="80px">
        <el-form-item :label="$t('tag.title')" prop="name">
          <el-input v-model="formData.name" :placeholder="$t('tag.titleRequired')" maxlength="50" show-word-limit />
        </el-form-item>

        <el-form-item :label="$t('tag.description')" prop="description">
          <el-input v-model="formData.description" type="textarea" :placeholder="$t('tag.descriptionPlaceholder')"
            :rows="4" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showDialog = false">
          {{ $t("tag.cancel") }}
        </el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ $t("tag.save") }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
import { Plus, Search, Refresh, Edit, Delete } from "@element-plus/icons-vue";
import { useI18n } from "vue-i18n";
import {
  listEntities,
  createEntity,
  getEntityById,
  updateEntity,
  deleteEntity,
  type Entity,
  type CreateEntityDto,
  type UpdateEntityDto
} from "@/api/tags";

defineOptions({ name: "TagManagement" });

const { t } = useI18n();

// 响应式数据
const loading = ref(false);
const submitting = ref(false);
const entities = ref<Entity[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);
const searchKeyword = ref("");
const selectedEntities = ref<Entity[]>([]);

// 对话框相关
const showDialog = ref(false);
const editingEntity = ref<Entity | null>(null);
const formRef = ref<FormInstance>();

// 表单数据
const formData = reactive<CreateEntityDto>({
  name: "",
  description: "",
  type: "tag"
});


// 表单验证规则
const formRules: FormRules = {
  name: [{ required: true, message: t("tag.titleRequired"), trigger: "blur" }]
};

// 方法
async function loadEntities() {
  loading.value = true;
  try {
    const response = await listEntities({
      page: currentPage.value,
      size: pageSize.value,
      keyword: searchKeyword.value,

    });

    console.log("Entities API response:", response);

    // 处理不同的响应格式
    if (Array.isArray(response)) {
      // 如果后端直接返回数组
      entities.value = response;
      total.value = response.length;
    } else if (response && response.items) {
      // 如果后端返回分页格式
      entities.value = response.items || [];
      total.value = response.total || 0;
    } else {
      // 其他情况
      entities.value = [];
      total.value = 0;
    }

    console.log("Processed entities:", entities.value);
    console.log("Total count:", total.value);
  } catch (error) {
    console.error("Failed to load entities:", error);
    console.error("Error details:", {
      message: error.message,
      response: error.response,
      status: error.response?.status,
      data: error.response?.data
    });
    ElMessage.error(t("tag.loadError"));
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  currentPage.value = 1;
  loadEntities();
}

function handleCreate() {
  resetForm();
  editingEntity.value = null;
  showDialog.value = true;
}

function handleEdit(entity: Entity) {
  editingEntity.value = entity;
  Object.assign(formData, {
    name: entity.name,
    description: entity.description || "",
    type: entity.type || "tag"
  });
  showDialog.value = true;
}

function handleSelectionChange(selection: Entity[]) {
  selectedEntities.value = selection;
}

async function handleBatchDelete() {
  if (selectedEntities.value.length === 0) {
    ElMessage.warning("请选择要删除的词条");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedEntities.value.length} 个词条吗？删除后无法恢复。`,
      "确认批量删除",
      {
        type: "warning"
      }
    );

    // 批量删除
    for (const entity of selectedEntities.value) {
      await deleteEntity(entity.id);
    }

    ElMessage.success(`成功删除 ${selectedEntities.value.length} 个词条`);
    selectedEntities.value = [];
    loadEntities();
  } catch (error) {
    if (error !== "cancel") {
      console.error("Failed to batch delete entities:", error);
      ElMessage.error("批量删除失败");
    }
  }
}

async function handleDelete(entity: Entity) {
  try {
    await ElMessageBox.confirm(
      t("tag.deleteConfirmMessage"),
      t("tag.confirmDelete"),
      {
        type: "warning"
      }
    );

    await deleteEntity(entity.id);
    ElMessage.success(t("tag.deleteSuccess"));
    loadEntities();
  } catch (error) {
    if (error !== "cancel") {
      console.error("Failed to delete entity:", error);
      ElMessage.error(t("tag.deleteError"));
    }
  }
}

async function handleSubmit() {
  if (!formRef.value) return;

  const valid = await formRef.value.validate();
  if (!valid) return;

  submitting.value = true;
  try {
    if (editingEntity.value) {
      await updateEntity(editingEntity.value.id, formData);
      ElMessage.success(t("tag.updateSuccess"));
    } else {
      await createEntity(formData);
      ElMessage.success(t("tag.createSuccess"));
    }

    showDialog.value = false;
    resetForm();
    loadEntities();
  } catch (error) {
    console.error("Failed to save entity:", error);
    ElMessage.error(editingEntity.value ? t("tag.updateError") : t("tag.createError"));
  } finally {
    submitting.value = false;
  }
}

function resetForm() {
  Object.assign(formData, {
    name: "",
    description: "",
    type: "tag"
  });
  formRef.value?.resetFields();
  editingEntity.value = null;
}

function handleDialogClose() {
  resetForm();
}

function handleSizeChange(size: number) {
  pageSize.value = size;
  currentPage.value = 1;
  loadEntities();
}

function handleCurrentChange(page: number) {
  currentPage.value = page;
  loadEntities();
}

function formatDate(dateString: string): string {
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

// 生命周期
onMounted(() => {
  loadEntities();
});
</script>

<style scoped>
.tag-page {
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
  max-width: 400px;
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
  scrollbar-color: var(--el-color-primary-light-3) var(--el-fill-color-lighter);
  -webkit-overflow-scrolling: touch;
  scrollbar-gutter: stable;
}

/* 自定义表格滚动条样式 */
.table-card :deep(.el-table__body-wrapper::-webkit-scrollbar) {
  width: 8px;
}

.table-card :deep(.el-table__body-wrapper::-webkit-scrollbar-track) {
  background: var(--el-fill-color-lighter);
  border-radius: 4px;
}

.table-card :deep(.el-table__body-wrapper::-webkit-scrollbar-thumb) {
  background: var(--el-color-primary-light-3);
  border-radius: 4px;
  border: 1px solid var(--el-border-color-lighter);
  transition: background-color 0.2s ease;
}

.table-card :deep(.el-table__body-wrapper::-webkit-scrollbar-thumb:hover) {
  background: var(--el-color-primary);
}


.no-update {
  color: #c0c4cc;
  font-style: italic;
}

.no-data {
  color: #c0c4cc;
  font-size: 12px;
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