<template>
  <div class="image-scraper-page">
    <el-card shadow="never" class="search-card">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="URL抓取" name="url">
          <el-form :model="form" :rules="rules" ref="formRef" @submit.native.prevent="scrapeImages">
            <el-alert type="info" :closable="false" show-icon style="margin-bottom: 16px">
              <template #title>
                提示：由于浏览器跨域限制，某些网站可能无法直接抓取。如遇到问题，请使用"HTML粘贴"方式。
              </template>
            </el-alert>
            <el-row :gutter="20">
              <el-col :span="18">
                <el-form-item prop="url" :label="t('imageScraper.inputUrl')">
                  <el-input v-model="form.url" :placeholder="t('imageScraper.urlPlaceholder')" clearable
                    @keyup.enter="scrapeImages">
                    <template #prefix>
                      <el-icon>
                        <Link />
                      </el-icon>
                    </template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-button type="primary" @click="scrapeImages" :loading="loading" :disabled="!form.url">
                  {{ loading ? t('imageScraper.scraping') : t('imageScraper.scrapeImages') }}
                </el-button>
              </el-col>
            </el-row>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="HTML粘贴" name="html">
          <el-form @submit.native.prevent="extractFromHtml">
            <el-alert type="success" :closable="false" show-icon style="margin-bottom: 16px">
              <template #title>
                操作步骤：1. 在目标网页按F12打开开发者工具 2. 复制HTML内容 3. 粘贴到下方文本框
              </template>
            </el-alert>
            <el-form-item label="基础URL（用于处理相对路径）">
              <el-input v-model="htmlForm.baseUrl" placeholder="例如：https://example.com" />
            </el-form-item>
            <el-form-item label="HTML内容">
              <el-input v-model="htmlForm.content" type="textarea" :rows="6" placeholder="粘贴网页的HTML内容..." />
            </el-form-item>
            <el-button type="primary" @click="extractFromHtml" :disabled="!htmlForm.content">
              提取图片
            </el-button>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 操作栏 -->
    <el-card shadow="never" class="action-bar" v-if="images.length > 0">
      <el-row justify="space-between" align="middle" :gutter="16">
        <el-col :xs="24" :sm="12" :md="14">
          <el-space wrap>
            <el-checkbox v-model="selectAll" :indeterminate="isIndeterminate" @change="handleSelectAll">
              {{ selectAll ? t('imageScraper.deselectAll') : t('imageScraper.selectAll') }}
            </el-checkbox>
            <el-text type="info">
              {{ t('imageScraper.imagesFound', { count: images.length }) }}
              <template v-if="selectedImages.length > 0">
                （已选择 {{ selectedImages.length }} 张）
              </template>
            </el-text>
          </el-space>
        </el-col>
        <el-col :xs="24" :sm="12" :md="10" class="download-col">
          <el-button type="primary" @click="downloadSelected" :disabled="selectedImages.length === 0">
            <el-icon class="mr-1">
              <Download />
            </el-icon>
            {{ t('imageScraper.downloadSelected') }}
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 图片网格 -->
    <el-card shadow="never" class="images-container" v-if="images.length > 0">
      <el-checkbox-group v-model="selectedImages">
        <div class="image-grid">
          <div v-for="(image, index) in images" :key="index" class="image-item">
            <el-checkbox :label="image.src" class="image-checkbox">
              <template #default>
                <div class="image-wrapper">
                  <el-image :src="image.src" :alt="image.alt" fit="cover" lazy @click="previewImage(image)"
                    @error="handleImageError(index)">
                    <template #error>
                      <div class="image-error">
                        <el-icon>
                          <Picture />
                        </el-icon>
                        <el-text type="info" size="small">{{ t('imageScraper.imageLoadError') }}</el-text>
                      </div>
                    </template>
                  </el-image>
                  <div class="image-info">
                    <el-text truncated :title="image.alt || image.src">
                      {{ image.alt || getImageName(image.src) }}
                    </el-text>
                  </div>
                  <div class="image-actions">
                    <el-button size="small" circle @click.stop="previewImage(image)"
                      :title="t('imageScraper.previewImage')">
                      <el-icon>
                        <View />
                      </el-icon>
                    </el-button>
                    <el-button size="small" circle @click.stop="downloadImage(image)"
                      :title="t('imageScraper.downloadImage')">
                      <el-icon>
                        <Download />
                      </el-icon>
                    </el-button>
                  </div>
                </div>
              </template>
            </el-checkbox>
          </div>
        </div>
      </el-checkbox-group>
    </el-card>

    <!-- 空状态 -->
    <el-empty v-if="!loading && images.length === 0 && hasSearched" :description="t('imageScraper.noImagesFound')" />

    <!-- 图片预览 -->
    <el-image-viewer v-if="showViewer" :url-list="previewUrls" :initial-index="previewIndex"
      @close="showViewer = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Link, Download, View, Picture } from '@element-plus/icons-vue';
import { scrapeImagesFromUrl, extractImagesFromPastedHtml } from '@/api/imageScraper';

const { t } = useI18n();

interface ImageItem {
  src: string;
  alt?: string;
  title?: string;
}

const activeTab = ref('url');

const form = reactive({
  url: ''
});

const htmlForm = reactive({
  baseUrl: '',
  content: ''
});

const rules = {
  url: [
    { required: true, message: t('imageScraper.invalidUrl'), trigger: 'blur' },
    { type: 'url', message: t('imageScraper.invalidUrl'), trigger: 'blur' }
  ]
};

const formRef = ref();
const loading = ref(false);
const hasSearched = ref(false);
const images = ref<ImageItem[]>([]);
const selectedImages = ref<string[]>([]);
const showViewer = ref(false);
const previewIndex = ref(0);

const selectAll = computed({
  get: () => selectedImages.value.length === images.value.length && images.value.length > 0,
  set: () => { }
});

const isIndeterminate = computed(
  () => selectedImages.value.length > 0 && selectedImages.value.length < images.value.length
);

const previewUrls = computed(() => images.value.map(img => img.src));

// 抓取图片
async function scrapeImages() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  loading.value = true;
  hasSearched.value = false;
  images.value = [];
  selectedImages.value = [];

  try {
    const result = await scrapeImagesFromUrl(form.url);
    images.value = result;
    hasSearched.value = true;

    if (result.length === 0) {
      ElMessage.warning(t('imageScraper.noImagesFound'));
    } else {
      ElMessage.success(t('imageScraper.imagesFound', { count: result.length }));
    }
  } catch (error) {
    ElMessage.error(t('imageScraper.scrapeError'));
    console.error('Scraping error:', error);
  } finally {
    loading.value = false;
  }
}

// 全选/取消全选
function handleSelectAll(value: boolean) {
  if (value) {
    selectedImages.value = images.value.map(img => img.src);
  } else {
    selectedImages.value = [];
  }
}

// 预览图片
function previewImage(image: ImageItem) {
  const index = images.value.findIndex(img => img.src === image.src);
  previewIndex.value = index;
  showViewer.value = true;
}

// 下载单张图片
async function downloadImage(image: ImageItem) {
  try {
    const response = await fetch(image.src);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getImageName(image.src);
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    ElMessage.success(t('imageScraper.downloadSuccess'));
  } catch (error) {
    ElMessage.error(t('imageScraper.downloadError'));
    console.error('Download error:', error);
  }
}

// 批量下载选中的图片
async function downloadSelected() {
  if (selectedImages.value.length === 0) return;

  const confirmed = await ElMessageBox.confirm(
    `确定要下载选中的 ${selectedImages.value.length} 张图片吗？`,
    '批量下载',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    }
  ).catch(() => false);

  if (!confirmed) return;

  let successCount = 0;
  let failCount = 0;

  for (const src of selectedImages.value) {
    const image = images.value.find(img => img.src === src);
    if (image) {
      try {
        await downloadImage(image);
        successCount++;
      } catch {
        failCount++;
      }
    }
  }

  if (failCount === 0) {
    ElMessage.success(`成功下载 ${successCount} 张图片`);
  } else {
    ElMessage.warning(`成功下载 ${successCount} 张，失败 ${failCount} 张`);
  }
}

// 从HTML内容提取图片
function extractFromHtml() {
  if (!htmlForm.content) {
    ElMessage.warning('请粘贴HTML内容');
    return;
  }

  hasSearched.value = false;
  images.value = [];
  selectedImages.value = [];

  try {
    const baseUrl = htmlForm.baseUrl || window.location.origin;
    const result = extractImagesFromPastedHtml(htmlForm.content, baseUrl);
    images.value = result;
    hasSearched.value = true;

    if (result.length === 0) {
      ElMessage.warning(t('imageScraper.noImagesFound'));
    } else {
      ElMessage.success(t('imageScraper.imagesFound', { count: result.length }));
    }
  } catch (error) {
    ElMessage.error('提取图片失败');
    console.error('Extract error:', error);
  }
}

// 处理图片加载错误
function handleImageError(index: number) {
  console.error(`Failed to load image: ${images.value[index].src}`);
}

// 获取图片文件名
function getImageName(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
    return filename || 'image.jpg';
  } catch {
    return 'image.jpg';
  }
}
</script>

<style lang="scss" scoped>
.image-scraper-page {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  background-color: var(--el-bg-color-page);

  .search-card {
    margin-bottom: 20px;

    :deep(.el-card__body) {
      padding: 24px;
    }
  }

  .action-bar {
    margin-bottom: 20px;

    :deep(.el-card__body) {
      padding: 16px 20px;
    }

    .download-col {
      text-align: right;

      @media (max-width: 575px) {
        text-align: left;
        margin-top: 12px;
      }
    }
  }

  .images-container {
    .image-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
      padding: 4px;

      @media (max-width: 768px) {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 16px;
      }
    }

    .image-item {
      position: relative;

      .image-checkbox {
        display: block;
        width: 100%;
        height: 100%;
        margin: 0;

        :deep(.el-checkbox__input) {
          position: absolute;
          top: 12px;
          left: 12px;
          z-index: 10;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 4px;
          padding: 2px;
        }

        :deep(.el-checkbox__label) {
          display: block;
          padding: 0;
          width: 100%;
          height: 100%;
        }
      }

      .image-wrapper {
        position: relative;
        display: flex;
        flex-direction: column;
        height: 100%;
        border: 1px solid var(--el-border-color);
        border-radius: 8px;
        overflow: hidden;
        background: var(--el-bg-color);
        transition: all 0.3s;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

          .image-actions {
            opacity: 1;
          }
        }
      }

      .el-image {
        width: 100%;
        height: 200px;
        cursor: pointer;
        flex-shrink: 0;
      }

      .image-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 200px;
        background: var(--el-bg-color-page);
        color: var(--el-text-color-secondary);

        .el-icon {
          font-size: 48px;
          margin-bottom: 8px;
        }
      }

      .image-info {
        padding: 12px;
        background: var(--el-bg-color);
        border-top: 1px solid var(--el-border-color-lighter);
        flex-grow: 1;

        .el-text {
          display: block;
          font-size: 14px;
          line-height: 1.5;
        }
      }

      .image-actions {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        gap: 8px;
        opacity: 0;
        transition: opacity 0.3s;

        .el-button {
          background: rgba(255, 255, 255, 0.95);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

          &:hover {
            background: #fff;
            transform: scale(1.05);
          }
        }
      }
    }
  }
}
</style>
