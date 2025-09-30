<template>
  <div class="article-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2>{{ $t("menus.contentArticle") }}</h2>
        <p class="page-description">{{ $t("article.pageDescription") }}</p>
      </div>
      <div class="header-actions">
        <el-button type="danger" :disabled="selectedArticles.length === 0" @click="handleBatchDelete">
          <el-icon>
            <Delete />
          </el-icon>
          {{ $t("article.batchDelete") }} ({{ selectedArticles.length }})
        </el-button>
      </div>
    </div>

    <!-- 搜索和筛选区域 -->
    <el-card shadow="never" class="search-card">
      <div class="search-container">
        <el-input v-model="searchKeyword" :placeholder="$t('article.searchPlaceholder')" clearable @input="handleSearch"
          class="search-input">
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
        </el-input>
        <el-button @click="loadArticles" :loading="loading">
          <el-icon>
            <Refresh />
          </el-icon>
          {{ $t("article.refresh") }}
        </el-button>
      </div>
    </el-card>

    <!-- 表格和分页容器 -->
    <div class="table-container">
      <el-card shadow="never" class="table-card">
        <el-table v-loading="loading" :data="articles" @selection-change="handleSelectionChange" stripe
          style="width: 100%" :empty-text="$t('article.noData')">
          <el-table-column type="selection" width="55" />
          <el-table-column prop="title" :label="$t('article.title')" min-width="200" show-overflow-tooltip />
          <el-table-column prop="content" :label="$t('article.contentPreview')" min-width="300" show-overflow-tooltip>
            <template #default="{ row }">
              <span>{{ getContentPreview(row.content) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="tags" :label="$t('article.entries')" width="150">
            <template #default="{ row }">
              <div v-if="row.tags && row.tags.length > 0" class="entries-container">
                <el-tag v-for="(tagId, index) in row.tags.slice(0, 2)" :key="index" size="small" type="info"
                  class="entry-item">
                  {{ getEntryName(tagId) }}
                </el-tag>
                <span v-if="row.tags.length > 2" class="more-entries">
                  +{{ row.tags.length - 2 }}
                </span>
              </div>
              <span v-else class="no-tags">{{ $t("article.noEntries") }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" :label="$t('article.createdAt')" width="180">
            <template #default="{ row }">
              {{ formatDate(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column prop="updatedAt" :label="$t('article.updatedAt')" width="180">
            <template #default="{ row }">
              <span v-if="row.updatedAt && row.updatedAt !== row.createdAt">
                {{ formatDate(row.updated_at) }}
              </span>
              <span v-else class="no-update">-</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('article.actions')" width="200" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click="handleView(row)">
                <el-icon>
                  <View />
                </el-icon>
                {{ $t("article.view") }}
              </el-button>
              <el-button size="small" type="danger" @click="handleDelete(row)">
                <el-icon>
                  <Delete />
                </el-icon>
                {{ $t("article.delete") }}
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



    <!-- 文章查看对话框 -->
    <el-dialog v-model="showViewDialog" :title="$t('article.articleDetail')" width="800px">
      <div v-if="viewingArticle" class="article-view">
        <div class="article-view-header">
          <h2>{{ viewingArticle.title }}</h2>
          <div class="article-view-meta">
            <div class="article-entries">
              <el-tag v-if="viewingArticle.tags && viewingArticle.tags.length > 0"
                v-for="(tagId, index) in viewingArticle.tags" :key="index" size="small" type="info" class="entry-item">
                {{ getEntryName(tagId) }}
              </el-tag>
              <span v-else class="no-entries-text">{{ $t("article.noEntries") }}</span>
            </div>
            <div class="article-dates">
              <span class="date-item">
                <el-icon>
                  <Calendar />
                </el-icon>
                {{ $t("article.createTime") }}：{{ formatDate(viewingArticle.createdAt) }}
              </span>
              <span v-if="viewingArticle.updatedAt && viewingArticle.updatedAt !== viewingArticle.createdAt"
                class="date-item">
                <el-icon>
                  <Edit />
                </el-icon>
                {{ $t("article.updateTime") }}：{{ formatDate(viewingArticle.updatedAt) }}
              </span>
            </div>
          </div>
        </div>

        <div class="article-view-content">
          <div class="content-text">{{ viewingArticle.content }}</div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showViewDialog = false">{{ $t("article.close") }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Search, Refresh, Calendar, Edit, View, Delete } from "@element-plus/icons-vue";
import { useI18n } from "vue-i18n";
import {
  listArticles,
  createArticle,
  getArticleById,
  updateArticle,
  deleteArticle,
  type Article,
  type CreateArticleDto,
  type UpdateArticleDto
} from "@/api/articles";
import { listEntities, type Entity } from "@/api/tags";

defineOptions({ name: "ArticleManagement" });

const { t } = useI18n();

// 响应式数据
const loading = ref(false);
const articles = ref<Article[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);
const searchKeyword = ref("");
const selectedArticles = ref<Article[]>([]);
const entries = ref<Entity[]>([]);

// 对话框相关
const showViewDialog = ref(false);
const viewingArticle = ref<Article | null>(null);

// 方法
async function loadEntries() {
  try {
    const response = await listEntities({ type: "tag" });
    if (Array.isArray(response)) {
      entries.value = response;
    } else if (response && response.items) {
      entries.value = response.items || [];
    } else {
      entries.value = [];
    }
  } catch (error) {
    console.error("Failed to load entries:", error);
    entries.value = [];
  }
}

function getEntryName(entryId: string): string {
  const entry = entries.value.find(t => t.id === entryId);
  return entry ? entry.name : entryId;
}

async function loadArticles() {
  loading.value = true;
  try {
    console.log("Loading articles with params:", {
      page: currentPage.value,
      size: pageSize.value,
      keyword: searchKeyword.value
    });

    const response = await listArticles({
      page: currentPage.value,
      size: pageSize.value,
      keyword: searchKeyword.value
    });

    console.log("Articles API response:", response);

    // 处理不同的响应格式
    if (Array.isArray(response)) {
      // 如果后端直接返回数组
      articles.value = response;
      total.value = response.length;
    } else if (response && response.items) {
      // 如果后端返回分页格式
      articles.value = response.items || [];
      total.value = response.total || 0;
    } else {
      // 其他情况
      articles.value = [];
      total.value = 0;
    }

    console.log("Processed articles:", articles.value);
    console.log("Total count:", total.value);
  } catch (error) {
    console.error("Failed to load articles:", error);
    console.error("Error details:", {
      message: error.message,
      response: error.response,
      status: error.response?.status,
      data: error.response?.data
    });
    ElMessage.error(t("article.loadError"));
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  currentPage.value = 1;
  loadArticles();
}

function handleSelectionChange(selection: Article[]) {
  selectedArticles.value = selection;
}

async function handleBatchDelete() {
  if (selectedArticles.value.length === 0) {
    ElMessage.warning(t("article.selectArticlesToDelete"));
    return;
  }

  try {
    await ElMessageBox.confirm(
      t("article.confirmBatchDeleteMessage", { count: selectedArticles.value.length }),
      t("article.confirmBatchDelete"),
      {
        type: "warning"
      }
    );

    // 批量删除
    for (const article of selectedArticles.value) {
      await deleteArticle(article.id);
    }

    ElMessage.success(t("article.batchDeleteSuccess", { count: selectedArticles.value.length }));
    selectedArticles.value = [];
    loadArticles();
  } catch (error) {
    if (error !== "cancel") {
      console.error("Failed to batch delete articles:", error);
      ElMessage.error(t("article.batchDeleteError"));
    }
  }
}

function handleView(article: Article) {
  viewingArticle.value = article;
  showViewDialog.value = true;
}


async function handleDelete(article: Article) {
  try {
    await ElMessageBox.confirm(
      t("article.deleteConfirmMessage"),
      t("article.confirmDelete"),
      {
        type: "warning"
      }
    );

    await deleteArticle(article.id);
    ElMessage.success(t("article.deleteSuccess"));
    loadArticles();
  } catch (error) {
    if (error !== "cancel") {
      console.error("Failed to delete article:", error);
      ElMessage.error(t("article.deleteError"));
    }
  }
}


function handleSizeChange(size: number) {
  pageSize.value = size;
  currentPage.value = 1;
  loadArticles();
}

function handleCurrentChange(page: number) {
  currentPage.value = page;
  loadArticles();
}

function getContentPreview(content: string): string {
  if (!content) return "";
  return content.length > 150 ? content.substring(0, 150) + "..." : content;
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

// 测试API连接
async function testApiConnection() {
  try {
    console.log("Testing API connection...");
    const response = await fetch("/v1/articles?page=1&size=10");
    console.log("Raw fetch response:", response);
    console.log("Response status:", response.status);
    console.log("Response headers:", response.headers);

    if (response.ok) {
      const data = await response.json();
      console.log("Raw API data:", data);
    } else {
      console.error("API request failed with status:", response.status);
    }
  } catch (error) {
    console.error("API connection test failed:", error);
  }
}

// 生命周期
onMounted(async () => {
  // 先测试API连接
  await testApiConnection();
  // 加载词条数据
  await loadEntries();
  // 然后加载文章
  loadArticles();
});
</script>

<style scoped>
.article-page {
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

.entries-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.entry-item {
  margin: 0;
}

.more-entries {
  color: #909399;
  font-size: 12px;
}

.no-entries {
  color: #c0c4cc;
  font-size: 12px;
  font-style: italic;
}

.no-update {
  color: #c0c4cc;
  font-style: italic;
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

.article-view {
  max-height: 600px;
  overflow-y: auto;
}

.article-view-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.article-view-header h2 {
  margin: 0 0 12px 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.article-view-meta {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.article-entries {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.no-entries-text {
  color: #c0c4cc;
  font-size: 12px;
  font-style: italic;
}

.article-dates {
  display: flex;
  gap: 16px;
}

.article-view-content {
  margin-top: 16px;
}

.content-text {
  white-space: pre-wrap;
  line-height: 1.8;
  color: #303133;
  font-size: 14px;
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
