<template>
  <div class="main">
    <el-card shadow="never" class="full-card">
      <template #header>
        <div class="card-header flex-bc">
          <span class="font-medium">HTML卡片库</span>
          <div>
            <el-button type="primary" @click="showCreateDialog = true">创建新卡片</el-button>
            <el-button @click="importCardTemplates">导入模板</el-button>
            <el-button @click="generateCardsFromPrompts">提示词生成卡片</el-button>
          </div>
        </div>
      </template>

      <!-- 搜索和筛选 -->
      <div class="filter-section">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-input v-model="searchKeyword" placeholder="搜索卡片..." prefix-icon="Search" clearable />
          </el-col>
          <el-col :span="6">
            <el-select v-model="selectedCategory" placeholder="选择分类" clearable>
              <el-option label="全部" value="" />
              <el-option label="标题类" value="header" />
              <el-option label="内容类" value="content" />
              <el-option label="列表类" value="list" />
              <el-option label="媒体类" value="media" />
              <el-option label="导航类" value="navigation" />
              <el-option label="表单类" value="form" />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-select v-model="selectedStyle" placeholder="选择样式" clearable>
              <el-option label="全部" value="" />
              <el-option label="简约" value="simple" />
              <el-option label="现代" value="modern" />
              <el-option label="经典" value="classic" />
              <el-option label="卡片式" value="card" />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-button @click="resetFilters">重置筛选</el-button>
          </el-col>
        </el-row>
      </div>

      <!-- 卡片网格 -->
      <div class="cards-grid" v-if="filteredCards.length > 0">
        <div v-for="card in filteredCards" :key="card.id" class="card-item" @click="selectCard(card)"
          :class="{ 'selected': selectedCardId === card.id }">
          <div class="card-preview">
            <div v-html="card.content" class="preview-content"></div>
          </div>
          <div class="card-info">
            <h4 class="card-title">{{ card.title }}</h4>
            <p class="card-description">{{ card.description }}</p>
            <div class="card-meta">
              <el-tag size="small" :type="getCategoryType(card.category) as any">{{ getCategoryLabel(card.category)
              }}</el-tag>
              <el-tag size="small" type="info">{{ getStyleLabel(card.style) }}</el-tag>
            </div>
          </div>
          <div class="card-actions">
            <el-button size="small" @click.stop="editCard(card)">编辑</el-button>
            <el-button size="small" @click.stop="duplicateCard(card)">复制</el-button>
            <el-button size="small" @click.stop="deleteCard(card.id)" type="danger">删除</el-button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <el-empty v-else description="暂无符合条件的卡片" />
    </el-card>

    <!-- 创建/编辑卡片对话框 -->
    <el-dialog v-model="showCreateDialog" :title="editingCard ? '编辑卡片' : '创建新卡片'" width="80%" top="5vh">
      <div class="create-card-dialog">
        <el-row :gutter="20">
          <!-- 左侧：表单 -->
          <el-col :span="12">
            <el-form :model="cardForm" label-width="100px" ref="cardFormRef">
              <el-form-item label="卡片名称" required>
                <el-input v-model="cardForm.title" placeholder="输入卡片名称" />
              </el-form-item>

              <el-form-item label="描述">
                <el-input v-model="cardForm.description" type="textarea" :rows="3" placeholder="简要描述这个卡片的用途" />
              </el-form-item>

              <el-form-item label="分类">
                <el-select v-model="cardForm.category" placeholder="选择分类">
                  <el-option label="标题类" value="header" />
                  <el-option label="内容类" value="content" />
                  <el-option label="列表类" value="list" />
                  <el-option label="媒体类" value="media" />
                  <el-option label="导航类" value="navigation" />
                  <el-option label="表单类" value="form" />
                </el-select>
              </el-form-item>

              <el-form-item label="样式风格">
                <el-select v-model="cardForm.style" placeholder="选择样式">
                  <el-option label="简约" value="simple" />
                  <el-option label="现代" value="modern" />
                  <el-option label="经典" value="classic" />
                  <el-option label="卡片式" value="card" />
                </el-select>
              </el-form-item>

              <!-- HTML内容编辑 -->
              <el-form-item label="HTML内容">
                <el-input v-model="cardForm.content" type="textarea" :rows="10" placeholder="输入HTML内容..." />
              </el-form-item>

              <!-- 预设模板选择 -->
              <el-form-item label="快速模板">
                <el-select v-model="selectedTemplate" @change="applyTemplate" placeholder="选择预设模板">
                  <el-option label="空白" value="" />
                  <el-option label="简单标题" value="simple-title" />
                  <el-option label="带描述的标题" value="title-with-desc" />
                  <el-option label="信息卡片" value="info-card" />
                  <el-option label="特色介绍" value="feature-intro" />
                  <el-option label="引用块" value="quote-block" />
                  <el-option label="步骤说明" value="step-guide" />
                  <el-option label="警告提示" value="warning-alert" />
                  <el-option label="成功消息" value="success-message" />
                  <el-option label="错误信息" value="error-message" />
                  <el-option label="代码块" value="code-block" />
                  <el-option label="价格卡片" value="pricing-card" />
                  <el-option label="用户评价" value="testimonial" />
                  <el-option label="统计卡片" value="stats-card" />
                  <el-option label="时间线项目" value="timeline-item" />
                  <el-option label="行动号召" value="cta-banner" />
                  <el-option label="FAQ项目" value="faq-item" />
                  <el-option label="联系表单" value="contact-form" />
                </el-select>
              </el-form-item>
            </el-form>

            <!-- 样式编辑器 -->
            <el-divider content-position="left">样式设置</el-divider>
            <div class="style-editor">
              <el-row :gutter="16">
                <el-col :span="12">
                  <el-form-item label="背景颜色" label-width="80px">
                    <el-color-picker v-model="cardForm.styles.backgroundColor" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="文字颜色" label-width="80px">
                    <el-color-picker v-model="cardForm.styles.color" />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="16">
                <el-col :span="12">
                  <el-form-item label="内边距" label-width="80px">
                    <el-input-number v-model="cardForm.styles.padding" :min="0" :max="100" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="外边距" label-width="80px">
                    <el-input-number v-model="cardForm.styles.margin" :min="0" :max="100" />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="16">
                <el-col :span="12">
                  <el-form-item label="边框" label-width="80px">
                    <el-input v-model="cardForm.styles.border" placeholder="1px solid #ccc" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="圆角" label-width="80px">
                    <el-input-number v-model="cardForm.styles.borderRadius" :min="0" :max="50" />
                  </el-form-item>
                </el-col>
              </el-row>
            </div>
          </el-col>

          <!-- 右侧：预览 -->
          <el-col :span="12">
            <div class="preview-section">
              <h4>实时预览</h4>
              <div class="preview-container">
                <div class="preview-card" :style="getPreviewStyle()" v-html="cardForm.content"></div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="saveCard">{{ editingCard ? '更新' : '创建' }}</el-button>
      </template>
    </el-dialog>

    <!-- 导入模板对话框 -->
    <el-dialog v-model="showImportDialog" title="导入卡片模板" width="60%">
      <el-input type="textarea" v-model="importContent" placeholder="粘贴HTML内容或JSON格式的卡片数据..." :rows="15" />
      <template #footer>
        <el-button @click="showImportDialog = false">取消</el-button>
        <el-button type="primary" @click="processImport">导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { listPresets } from "@/api/prompts";

defineOptions({ name: "CardLibrary" });

// 响应式数据
const searchKeyword = ref("");
const selectedCategory = ref("");
const selectedStyle = ref("");
const selectedCardId = ref("");
const showCreateDialog = ref(false);
const showImportDialog = ref(false);
const editingCard = ref<any>(null);
const selectedTemplate = ref("");
const importContent = ref("");
const cardFormRef = ref();

// 卡片列表
const cardsList = ref<any[]>([]);

// 表单数据
const cardForm = reactive({
  title: "",
  description: "",
  category: "content",
  style: "simple",
  content: "",
  styles: {
    backgroundColor: "#ffffff",
    color: "#333333",
    padding: 15,
    margin: 10,
    border: "1px solid #e0e0e0",
    borderRadius: 8
  }
});

// 预设模板
const templates = {
  "simple-title": `<h2 style="margin: 0; color: #333;">标题文本</h2>`,
  "title-with-desc": `<h2 style="margin: 0 0 10px 0; color: #333;">主标题</h2>
<p style="margin: 0; color: #666; line-height: 1.6;">这里是描述内容，可以详细说明相关信息。</p>`,
  "info-card": `<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff;">
  <h3 style="margin: 0 0 10px 0; color: #007bff;">信息提示</h3>
  <p style="margin: 0; line-height: 1.6;">这是一个信息卡片，用于展示重要信息或提示内容。</p>
</div>`,
  "feature-intro": `<div style="text-align: center; padding: 20px;">
  <div style="width: 60px; height: 60px; background: #28a745; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px;">✓</div>
  <h3 style="margin: 0 0 10px 0; color: #333;">特色功能</h3>
  <p style="margin: 0; color: #666; line-height: 1.6;">简要介绍这个特色功能的优势和价值。</p>
</div>`,
  "quote-block": `<blockquote style="margin: 0; padding: 20px; background: #f8f9fa; border-left: 4px solid #6c757d; font-style: italic; color: #555;">
  "这里是引用内容，可以用来展示重要的话语或观点。"
  <footer style="margin-top: 10px; font-size: 14px; color: #6c757d;">— 引用来源</footer>
</blockquote>`,
  "step-guide": `<div style="display: flex; align-items: center; padding: 15px; background: #fff3cd; border: 1px solid #ffeeba; border-radius: 8px;">
  <div style="width: 30px; height: 30px; background: #ffc107; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">1</div>
  <div>
    <h4 style="margin: 0 0 5px 0; color: #333;">步骤标题</h4>
    <p style="margin: 0; color: #666;">详细描述这个步骤需要做什么。</p>
  </div>
</div>`,
  "warning-alert": `<div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 16px; border-left: 4px solid #f39c12;">
  <div style="display: flex; align-items: center;">
    <span style="font-size: 20px; margin-right: 10px;">⚠️</span>
    <div>
      <h4 style="margin: 0 0 5px 0; color: #856404;">注意事项</h4>
      <p style="margin: 0; color: #856404;">这里是重要的警告或注意事项内容。</p>
    </div>
  </div>
</div>`,
  "success-message": `<div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 16px; border-left: 4px solid #28a745;">
  <div style="display: flex; align-items: center;">
    <span style="font-size: 20px; margin-right: 10px;">✅</span>
    <div>
      <h4 style="margin: 0 0 5px 0; color: #155724;">操作成功</h4>
      <p style="margin: 0; color: #155724;">成功完成了相关操作，您可以继续下一步。</p>
    </div>
  </div>
</div>`,
  "error-message": `<div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 16px; border-left: 4px solid #dc3545;">
  <div style="display: flex; align-items: center;">
    <span style="font-size: 20px; margin-right: 10px;">❌</span>
    <div>
      <h4 style="margin: 0 0 5px 0; color: #721c24;">错误信息</h4>
      <p style="margin: 0; color: #721c24;">操作失败，请检查相关设置并重试。</p>
    </div>
  </div>
</div>`,
  "code-block": `<div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 16px; font-family: 'Courier New', monospace;">
  <div style="background: #6c757d; color: white; padding: 8px 12px; margin: -16px -16px 12px -16px; border-radius: 8px 8px 0 0; font-size: 12px;">代码示例</div>
  <code style="color: #e83e8c;">function example() {<br>&nbsp;&nbsp;console.log('Hello World!');<br>}</code>
</div>`,
  "pricing-card": `<div style="border: 2px solid #e9ecef; border-radius: 12px; padding: 24px; text-align: center; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
  <h3 style="margin: 0 0 10px 0; color: #333;">基础版</h3>
  <div style="font-size: 36px; font-weight: bold; color: #007bff; margin: 15px 0;">¥99</div>
  <p style="color: #666; margin: 0 0 20px 0;">适合个人用户</p>
  <ul style="text-align: left; padding-left: 20px; margin: 20px 0;">
    <li>功能特性 1</li>
    <li>功能特性 2</li>
    <li>功能特性 3</li>
  </ul>
  <button style="background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer;">选择方案</button>
</div>`,
  "testimonial": `<div style="background: #f8f9fa; border-radius: 12px; padding: 24px; border-left: 4px solid #007bff;">
  <div style="display: flex; align-items: center; margin-bottom: 15px;">
    <div style="width: 50px; height: 50px; border-radius: 50%; background: #007bff; color: white; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">张</div>
    <div>
      <h4 style="margin: 0; color: #333;">张三</h4>
      <p style="margin: 0; color: #666; font-size: 14px;">产品经理</p>
    </div>
  </div>
  <p style="margin: 0; font-style: italic; color: #555; line-height: 1.6;">"这个产品真的很棒，帮助我们团队提高了很多效率，强烈推荐给大家使用。"</p>
</div>`,
  "stats-card": `<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; padding: 24px; text-align: center;">
  <div style="font-size: 48px; font-weight: bold; margin-bottom: 8px;">1,234</div>
  <h4 style="margin: 0 0 8px 0; opacity: 0.9;">活跃用户</h4>
  <p style="margin: 0; opacity: 0.8; font-size: 14px;">相比上月增长 12%</p>
</div>`,
  "timeline-item": `<div style="display: flex; align-items: flex-start; padding: 20px 0; border-bottom: 1px solid #e9ecef;">
  <div style="width: 20px; height: 20px; border-radius: 50%; background: #28a745; margin-right: 20px; margin-top: 5px; flex-shrink: 0;"></div>
  <div>
    <h4 style="margin: 0 0 8px 0; color: #333;">重要里程碑</h4>
    <p style="margin: 0 0 5px 0; color: #666; line-height: 1.6;">这里描述具体发生的事件或完成的任务。</p>
    <small style="color: #999;">2024年1月15日</small>
  </div>
</div>`,
  "cta-banner": `<div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; border-radius: 12px; padding: 32px; text-align: center;">
  <h2 style="margin: 0 0 15px 0; font-size: 28px;">立即开始</h2>
  <p style="margin: 0 0 25px 0; font-size: 18px; opacity: 0.9;">加入我们，体验更好的服务</p>
  <button style="background: white; color: #ee5a24; border: none; padding: 15px 30px; border-radius: 25px; font-size: 16px; font-weight: bold; cursor: pointer;">免费试用</button>
</div>`,
  "faq-item": `<div style="border: 1px solid #e9ecef; border-radius: 8px; margin-bottom: 10px;">
  <div style="padding: 16px; background: #f8f9fa; border-radius: 8px 8px 0 0; cursor: pointer;">
    <h4 style="margin: 0; color: #333;">常见问题标题？</h4>
  </div>
  <div style="padding: 16px; background: white; border-radius: 0 0 8px 8px;">
    <p style="margin: 0; color: #666; line-height: 1.6;">这里是对常见问题的详细回答和解释。</p>
  </div>
</div>`,
  "contact-form": `<div style="background: white; border: 1px solid #e9ecef; border-radius: 12px; padding: 24px;">
  <h3 style="margin: 0 0 20px 0; color: #333;">联系我们</h3>
  <form>
    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 5px; color: #555;">姓名</label>
      <input type="text" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box;" placeholder="请输入您的姓名">
    </div>
    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 5px; color: #555;">邮箱</label>
      <input type="email" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box;" placeholder="请输入您的邮箱">
    </div>
    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 5px; color: #555;">消息</label>
      <textarea style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; height: 100px; resize: vertical;" placeholder="请输入您的消息"></textarea>
    </div>
    <button type="submit" style="background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; width: 100%;">发送消息</button>
  </form>
</div>`
};

// 初始化默认卡片
const initializeDefaultCards = () => {
  const defaultCards = [
    {
      id: "default-1",
      title: "主标题",
      description: "页面主要标题",
      category: "header",
      style: "simple",
      content: `<h1 style="margin: 0; color: #333; font-size: 2.5em;">主标题</h1>`,
      styles: {
        backgroundColor: "#ffffff",
        color: "#333333",
        padding: 20,
        margin: 10,
        border: "none",
        borderRadius: 0
      }
    },
    {
      id: "default-2",
      title: "段落内容",
      description: "标准段落文本",
      category: "content",
      style: "simple",
      content: `<p style="margin: 0; line-height: 1.8; color: #555;">这里是段落内容，可以用来展示详细的文字信息。支持多行文本显示，适合长篇内容展示。</p>`,
      styles: {
        backgroundColor: "#ffffff",
        color: "#555555",
        padding: 15,
        margin: 10,
        border: "1px solid #e0e0e0",
        borderRadius: 8
      }
    },
    {
      id: "default-3",
      title: "特色卡片",
      description: "带图标的特色介绍",
      category: "content",
      style: "card",
      content: templates["feature-intro"],
      styles: {
        backgroundColor: "#ffffff",
        color: "#333333",
        padding: 0,
        margin: 10,
        border: "1px solid #e0e0e0",
        borderRadius: 12
      }
    }
  ];

  const saved = localStorage.getItem('html_cards_library');
  if (!saved) {
    cardsList.value = defaultCards;
    saveToStorage();
  }
};

// 筛选后的卡片
const filteredCards = computed(() => {
  return cardsList.value.filter(card => {
    const matchesSearch = !searchKeyword.value ||
      card.title.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
      card.description.toLowerCase().includes(searchKeyword.value.toLowerCase());

    const matchesCategory = !selectedCategory.value || card.category === selectedCategory.value;
    const matchesStyle = !selectedStyle.value || card.style === selectedStyle.value;

    return matchesSearch && matchesCategory && matchesStyle;
  });
});

// 工具函数
function getCategoryType(category: string) {
  const types: Record<string, string> = {
    header: 'success',
    content: 'primary',
    list: 'warning',
    media: 'info',
    navigation: 'danger',
    form: 'success'
  };
  return types[category] || 'info';
}

function getCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    header: '标题类',
    content: '内容类',
    list: '列表类',
    media: '媒体类',
    navigation: '导航类',
    form: '表单类'
  };
  return labels[category] || category;
}

function getStyleLabel(style: string) {
  const labels: Record<string, string> = {
    simple: '简约',
    modern: '现代',
    classic: '经典',
    card: '卡片式'
  };
  return labels[style] || style;
}

function generateId() {
  return 'card_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function resetForm() {
  cardForm.title = "";
  cardForm.description = "";
  cardForm.category = "content";
  cardForm.style = "simple";
  cardForm.content = "";
  cardForm.styles = {
    backgroundColor: "#ffffff",
    color: "#333333",
    padding: 15,
    margin: 10,
    border: "1px solid #e0e0e0",
    borderRadius: 8
  };
  selectedTemplate.value = "";
  editingCard.value = null;
}

function getPreviewStyle() {
  const styles = cardForm.styles;
  return {
    backgroundColor: styles.backgroundColor,
    color: styles.color,
    padding: styles.padding + 'px',
    margin: styles.margin + 'px',
    border: styles.border,
    borderRadius: styles.borderRadius + 'px',
    minHeight: '100px'
  };
}

// 操作函数
function selectCard(card: any) {
  selectedCardId.value = card.id;
}

function editCard(card: any) {
  editingCard.value = card;
  Object.assign(cardForm, {
    title: card.title,
    description: card.description,
    category: card.category,
    style: card.style,
    content: card.content,
    styles: { ...card.styles }
  });
  showCreateDialog.value = true;
}

function duplicateCard(card: any) {
  const newCard = {
    ...card,
    id: generateId(),
    title: card.title + " (副本)"
  };
  cardsList.value.push(newCard);
  saveToStorage();
  ElMessage.success("卡片已复制");
}

function deleteCard(cardId: string) {
  ElMessageBox.confirm('确定要删除这个卡片吗？', '确认删除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    const index = cardsList.value.findIndex(card => card.id === cardId);
    if (index > -1) {
      cardsList.value.splice(index, 1);
      saveToStorage();
      ElMessage.success("卡片已删除");
    }
  });
}

function saveCard() {
  if (!cardForm.title.trim()) {
    ElMessage.warning("请输入卡片名称");
    return;
  }

  if (!cardForm.content.trim()) {
    ElMessage.warning("请输入HTML内容");
    return;
  }

  const cardData = {
    id: editingCard.value ? editingCard.value.id : generateId(),
    title: cardForm.title,
    description: cardForm.description,
    category: cardForm.category,
    style: cardForm.style,
    content: cardForm.content,
    styles: { ...cardForm.styles }
  };

  if (editingCard.value) {
    const index = cardsList.value.findIndex(card => card.id === editingCard.value.id);
    if (index > -1) {
      cardsList.value[index] = cardData;
      ElMessage.success("卡片已更新");
    }
  } else {
    cardsList.value.push(cardData);
    ElMessage.success("卡片已创建");
  }

  saveToStorage();
  showCreateDialog.value = false;
  resetForm();
}

function applyTemplate(templateKey: string) {
  if (templateKey && templates[templateKey]) {
    cardForm.content = templates[templateKey];
  }
}

function resetFilters() {
  searchKeyword.value = "";
  selectedCategory.value = "";
  selectedStyle.value = "";
}

function importCardTemplates() {
  showImportDialog.value = true;
}

function processImport() {
  if (!importContent.value.trim()) {
    ElMessage.warning("请输入要导入的内容");
    return;
  }

  try {
    // 尝试解析为JSON
    const jsonData = JSON.parse(importContent.value);
    if (Array.isArray(jsonData)) {
      jsonData.forEach(item => {
        if (item.title && item.content) {
          const newCard = {
            id: generateId(),
            title: item.title,
            description: item.description || "",
            category: item.category || "content",
            style: item.style || "simple",
            content: item.content,
            styles: item.styles || {
              backgroundColor: "#ffffff",
              color: "#333333",
              padding: 15,
              margin: 10,
              border: "1px solid #e0e0e0",
              borderRadius: 8
            }
          };
          cardsList.value.push(newCard);
        }
      });
    } else if (jsonData.title && jsonData.content) {
      const newCard = {
        id: generateId(),
        title: jsonData.title,
        description: jsonData.description || "",
        category: jsonData.category || "content",
        style: jsonData.style || "simple",
        content: jsonData.content,
        styles: jsonData.styles || {
          backgroundColor: "#ffffff",
          color: "#333333",
          padding: 15,
          margin: 10,
          border: "1px solid #e0e0e0",
          borderRadius: 8
        }
      };
      cardsList.value.push(newCard);
    }

    saveToStorage();
    showImportDialog.value = false;
    importContent.value = "";
    ElMessage.success("导入成功");
  } catch {
    // 如果不是JSON，当作HTML处理
    const newCard = {
      id: generateId(),
      title: "导入的HTML卡片",
      description: "从HTML导入的卡片",
      category: "content",
      style: "simple",
      content: importContent.value,
      styles: {
        backgroundColor: "#ffffff",
        color: "#333333",
        padding: 15,
        margin: 10,
        border: "1px solid #e0e0e0",
        borderRadius: 8
      }
    };

    cardsList.value.push(newCard);
    saveToStorage();
    showImportDialog.value = false;
    importContent.value = "";
    ElMessage.success("HTML内容已导入为新卡片");
  }
}

function saveToStorage() {
  localStorage.setItem('html_cards_library', JSON.stringify(cardsList.value));
}

function loadFromStorage() {
  try {
    const saved = localStorage.getItem('html_cards_library');
    if (saved) {
      cardsList.value = JSON.parse(saved);
    }
  } catch (error) {
    ElMessage.error("加载卡片库失败");
  }
}

// 基于提示词生成卡片：卡片名称=提示词名称，并附加提示词标识
async function generateCardsFromPrompts() {
  try {
    const presets = await listPresets();
    if (!Array.isArray(presets) || presets.length === 0) {
      ElMessage.info("暂无提示词可生成");
      return;
    }
    const maxToCreate = 12;
    const newCards = presets.slice(0, maxToCreate).map(p => {
      const safeBody = escapeHtml(p.body || "").replace(/\n/g, "<br/>");
      return {
        id: generateId(),
        title: p.name || p.code || "未命名提示词",
        description: `提示词：${p.code || ''}`,
        category: "content",
        style: "card",
        content: `<div style=\"padding:16px;\"><h3 style=\"margin:0 0 8px 0;\">${escapeHtml(p.name || p.code || "提示词")}</h3><div style=\"font-size:12px;color:#666;\">${safeBody}</div></div>`,
        styles: {
          backgroundColor: "#ffffff",
          color: "#333333",
          padding: 0,
          margin: 10,
          border: "1px solid #e0e0e0",
          borderRadius: 12
        },
        promptCode: p.code || ""
      } as any;
    });
    cardsList.value.push(...newCards);
    saveToStorage();
    ElMessage.success(`已生成 ${newCards.length} 个卡片`);
  } catch (e) {
    ElMessage.error("生成卡片失败");
  }
}

// 生命周期
onMounted(() => {
  loadFromStorage();
  initializeDefaultCards();
});
</script>

<style scoped>
.main {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.full-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.filter-section {
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color);
  background: #f8f9fa;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

.card-item {
  border: 2px solid var(--el-border-color);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s;
  cursor: pointer;
  background: white;
}

.card-item:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.card-item.selected {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.2);
}

.card-preview {
  height: 120px;
  overflow: hidden;
  background: #f8f9fa;
  position: relative;
}

.preview-content {
  padding: 15px;
  height: 100%;
  overflow: hidden;
  font-size: 12px;
}

.card-info {
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color);
}

.card-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.card-description {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

.card-meta {
  display: flex;
  gap: 8px;
}

.card-actions {
  padding: 12px 16px;
  display: flex;
  gap: 8px;
  background: #fafbfc;
}

.create-card-dialog {
  max-height: 70vh;
  overflow-y: auto;
}

.style-editor {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-top: 16px;
}

.preview-section h4 {
  margin: 0 0 16px 0;
  color: var(--el-text-color-primary);
}

.preview-container {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 20px;
  background: white;
  min-height: 200px;
}

.preview-card {
  min-height: 100px;
}

:deep(.el-form-item) {
  margin-bottom: 16px;
}

:deep(.el-dialog__body) {
  padding: 20px;
}
</style>