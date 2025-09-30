<template>
  <div class="main">
    <el-card shadow="never" class="full-card">
      <template #header>
        <div class="card-header flex-bc header-controls">
          <span class="font-medium">{{ pageTitle }}</span>
          <div class="header-actions">
            <el-button @click="previewHTML" type="warning">预览HTML</el-button>
            <el-button @click="exportHTML" type="success">导出HTML</el-button>
            <el-button @click="importHTML" type="info">导入HTML</el-button>
            <el-button type="primary" @click="onSave">保存模板</el-button>
            <el-button @click="goBack">返回列表</el-button>
          </div>
        </div>
      </template>

      <div class="workbench-body">
        <div class="cards-sidebar">
          <div class="sidebar-header">
            <h4>卡片库</h4>
            <el-button size="small" @click="refreshCards" type="primary">刷新</el-button>
          </div>
          <div class="cards-container">
            <div v-if="templateCards.length === 0" class="no-cards">
              <p>没有找到卡片</p>
              <el-button @click="createDefaultCards" size="small" type="primary">创建默认卡片</el-button>
            </div>
            <div v-else class="cards-list">
              <div v-for="card in templateCards" :key="card.id" class="template-card" :data-card-id="card.id"
                @click="addCardToCanvas(card)" @dragstart="handleCardDragStart($event, card)"
                @dragend="handleCardDragEnd" draggable="true">
                <div class="card-preview" v-html="card.content"></div>
                <div class="card-title">{{ card.title }}</div>
              </div>
            </div>
          </div>
        </div>


        <div class="canvas-area">
          <div class="canvas-toolbar">
            <el-input v-model="templateTitle" placeholder="请输入模板名称" style="max-width: 260px;" />
            <div>
              <el-button-group>
                <el-button @click="addSection('header')" size="small">添加标题</el-button>
                <el-button @click="addSection('paragraph')" size="small">添加段落</el-button>
                <el-button @click="addSection('list')" size="small">添加列表</el-button>
                <el-button @click="addSection('image')" size="small">添加图片</el-button>
              </el-button-group>
              <el-button @click="generateWikiLayout" size="small" type="success" class="ml-2">Wiki布局</el-button>
              <el-button @click="clearCanvas" size="small" type="danger" class="ml-2">清空画布</el-button>
            </div>
          </div>

          <div class="canvas" ref="canvasRef" @click="handleCanvasClick" @dragover.prevent="handleCanvasDragOver"
            @dragenter.prevent @drop.prevent="handleCanvasDrop">
            <div v-for="(element, index) in canvasElements" :key="element.id" class="canvas-element" :class="{
              'selected': selectedElement?.id === element.id,
              'dragging': draggedElement?.id === element.id
            }" :data-element-id="element.id" :style="getElementStyle(element)" @click.stop="selectElement(element)"
              @dragstart="handleElementDragStart($event, element)" @dragend="handleElementDragEnd"
              @dragover="handleElementDragOver($event, element)" @dragenter.prevent
              @drop="handleElementDrop($event, element)" draggable="true">
              <div class="element-controls">
                <el-button size="small" type="danger" @click.stop="removeElement(element.id)">×</el-button>
                <el-button size="small" @click.stop="duplicateElement(element)">复制</el-button>
              </div>
              <div v-html="element.content" class="element-content"></div>
            </div>
            <div v-if="canvasElements.length === 0" class="canvas-empty">
              <div class="empty-content">
                <h3>开始设计您的模板</h3>
                <p>1. 从左侧卡片库拖拽卡片到画布</p>
                <p>2. 点击画布中的元素进行编辑</p>
                <p>3. 使用右侧属性面板调整样式</p>
                <p>4. 点击"预览HTML"查看效果</p>
                <p>5. 点击"导出HTML"下载模板</p>
              </div>
            </div>
            <!-- 用于撑开滚动高度的占位块（绝对定位元素不参与文档流高度） -->
            <div class="canvas-spacer" :style="{ height: canvasContentHeight + 'px' }"></div>
          </div>
        </div>
      </div>
    </el-card>

    <el-dialog v-model="importDialogVisible" title="导入HTML内容" width="80%">
      <el-input type="textarea" v-model="importHtmlContent" placeholder="请粘贴HTML内容..." :rows="20" />
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="processImportedHTML">导入</el-button>
      </template>
    </el-dialog>

    <!-- 右下角样式设置弹窗 -->
    <el-drawer v-model="styleDrawerVisible" title="元素样式设置" direction="rtl" size="400px" :with-header="true">
      <div v-if="selectedElement" class="style-drawer-content">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="样式" name="styles">
            <el-form label-width="80px" size="small">
              <el-form-item label="背景色">
                <el-color-picker v-model="elementStyles.backgroundColor" @change="updateElementStyle" />
              </el-form-item>
              <el-form-item label="文字颜色">
                <el-color-picker v-model="elementStyles.color" @change="updateElementStyle" />
              </el-form-item>
              <el-form-item label="字体大小">
                <el-input-number v-model="elementStyles.fontSize" :min="12" :max="72" @change="updateElementStyle" />
              </el-form-item>
              <el-form-item label="内边距">
                <el-input-number v-model="elementStyles.padding" :min="0" :max="100" @change="updateElementStyle" />
              </el-form-item>
              <el-form-item label="外边距">
                <el-input-number v-model="elementStyles.margin" :min="0" :max="100" @change="updateElementStyle" />
              </el-form-item>
              <el-form-item label="宽度">
                <el-input v-model="elementStyles.width" placeholder="auto, 100%, 300px" @change="updateElementStyle" />
              </el-form-item>
              <el-form-item label="高度">
                <el-input v-model="elementStyles.height" placeholder="auto, 200px" @change="updateElementStyle" />
              </el-form-item>
              <el-form-item label="边框">
                <el-input v-model="elementStyles.border" placeholder="1px solid #ccc" @change="updateElementStyle" />
              </el-form-item>
              <el-form-item label="圆角">
                <el-input-number v-model="elementStyles.borderRadius" :min="0" :max="50" @change="updateElementStyle" />
              </el-form-item>
              <el-form-item label="文字对齐">
                <el-select v-model="elementStyles.textAlign" @change="updateElementStyle">
                  <el-option label="左对齐" value="left" />
                  <el-option label="居中" value="center" />
                  <el-option label="右对齐" value="right" />
                  <el-option label="两端对齐" value="justify" />
                </el-select>
              </el-form-item>
              <el-form-item label="水平对齐">
                <el-select v-model="elementStyles.justifyContent" @change="updateElementStyle">
                  <el-option label="左对齐" value="flex-start" />
                  <el-option label="居中" value="center" />
                  <el-option label="右对齐" value="flex-end" />
                  <el-option label="两端对齐" value="space-between" />
                  <el-option label="均匀分布" value="space-around" />
                </el-select>
              </el-form-item>
            </el-form>
          </el-tab-pane>
          <el-tab-pane label="内容" name="content">
            <el-form label-width="80px" size="small">
              <el-form-item label="标题">
                <el-input v-model="elementContent.title" @change="updateElementContent" />
              </el-form-item>
              <el-form-item label="内容">
                <el-input type="textarea" v-model="elementContent.text" :rows="4" @change="updateElementContent" />
              </el-form-item>
              <el-form-item label="链接">
                <el-input v-model="elementContent.link" placeholder="http://" @change="updateElementContent" />
              </el-form-item>
            </el-form>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { useRoute, useRouter } from "vue-router";
import { createTemplate, getTemplateById, updateTemplate, renderTemplateHtml } from "@/api/templates";

defineOptions({ name: "TemplateForm" });

const route = useRoute();
const router = useRouter();

const activeTab = ref("styles");
const canvasRef = ref<HTMLElement>();
const selectedElement = ref<any>(null);
const importDialogVisible = ref(false);
const importHtmlContent = ref("");
const styleDrawerVisible = ref(false);
// 表单页高度占满父容器，无需计算导航高度
const templateTitle = ref("");
const pageTitle = ref("新增模板");

const editingId = ref<string | null>(null);

const canvasElements = ref<any[]>([]);
const templateCards = ref<any[]>([]);

// 拖拽相关状态
const draggedElement = ref<any>(null);
const draggedCard = ref<any>(null);
const dragOverElement = ref<any>(null);

function loadCardsFromLibrary() {
  try {
    const saved = localStorage.getItem('html_cards_library');
    if (saved) templateCards.value = JSON.parse(saved);
    else createDefaultCards();
  } catch {
    createDefaultCards();
  }
}

function createDefaultCards() {
  templateCards.value = [
    // 标题类
    { id: 'h1', title: 'H1标题', content: `<h1 style="margin: 0; color: #333; font-size: 2.5em; font-weight: bold;">主标题</h1>` },
    { id: 'h2', title: 'H2标题', content: `<h2 style="margin: 0; color: #333; font-size: 2em; font-weight: bold;">二级标题</h2>` },
    { id: 'h3', title: 'H3标题', content: `<h3 style="margin: 0; color: #333; font-size: 1.5em; font-weight: bold;">三级标题</h3>` },
    { id: 'h4', title: 'H4标题', content: `<h4 style="margin: 0; color: #333; font-size: 1.25em; font-weight: bold;">四级标题</h4>` },
    { id: 'h5', title: 'H5标题', content: `<h5 style="margin: 0; color: #333; font-size: 1.1em; font-weight: bold;">五级标题</h5>` },
    { id: 'h6', title: 'H6标题', content: `<h6 style="margin: 0; color: #333; font-size: 1em; font-weight: bold;">六级标题</h6>` },

    // 文本类
    { id: 'paragraph', title: '段落', content: `<p style="margin: 0; line-height: 1.6; color: #444;">这是一个段落文本，可以包含多行内容。</p>` },
    { id: 'span', title: '行内文本', content: `<span style="color: #666; font-size: 14px;">行内文本内容</span>` },
    { id: 'strong', title: '粗体文本', content: `<strong style="font-weight: bold; color: #333;">粗体文本</strong>` },
    { id: 'em', title: '斜体文本', content: `<em style="font-style: italic; color: #666;">斜体文本</em>` },
    { id: 'small', title: '小字文本', content: `<small style="font-size: 12px; color: #999;">小字文本</small>` },
    { id: 'mark', title: '高亮文本', content: `<mark style="background: #ffeb3b; padding: 2px 4px;">高亮文本</mark>` },

    // 列表类
    { id: 'ul', title: '无序列表', content: `<ul style="margin: 0; padding-left: 20px;"><li>列表项 1</li><li>列表项 2</li><li>列表项 3</li></ul>` },
    { id: 'ol', title: '有序列表', content: `<ol style="margin: 0; padding-left: 20px;"><li>第一项</li><li>第二项</li><li>第三项</li></ol>` },
    { id: 'dl', title: '定义列表', content: `<dl style="margin: 0;"><dt>术语</dt><dd>定义内容</dd><dt>另一个术语</dt><dd>另一个定义</dd></dl>` },

    // 链接和按钮
    { id: 'link', title: '链接', content: `<a href="#" style="color: #007bff; text-decoration: none;">链接文本</a>` },
    { id: 'button', title: '按钮', content: `<button style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">按钮</button>` },
    { id: 'button-secondary', title: '次要按钮', content: `<button style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">次要按钮</button>` },
    { id: 'button-outline', title: '轮廓按钮', content: `<button style="padding: 10px 20px; background: transparent; color: #007bff; border: 1px solid #007bff; border-radius: 4px; cursor: pointer;">轮廓按钮</button>` },

    // 媒体类
    { id: 'image', title: '图片', content: `<img src="https://via.placeholder.com/300x200" alt="示例图片" style="max-width: 100%; height: auto; border-radius: 8px;" />` },
    { id: 'video', title: '视频', content: `<video controls style="max-width: 100%; height: auto; border-radius: 8px;"><source src="#" type="video/mp4">您的浏览器不支持视频标签。</video>` },
    { id: 'audio', title: '音频', content: `<audio controls style="width: 100%;"><source src="#" type="audio/mpeg">您的浏览器不支持音频标签。</audio>` },

    // 引用和代码
    { id: 'quote', title: '引用', content: `<blockquote style="margin: 0; padding: 15px; background: #f8f9fa; border-left: 4px solid #007bff; font-style: italic;">引用内容</blockquote>` },
    { id: 'code', title: '代码', content: `<code style="background: #f8f9fa; padding: 2px 4px; border-radius: 3px; font-family: monospace;">代码内容</code>` },
    { id: 'pre', title: '代码块', content: `<pre style="margin: 0; padding: 15px; background: #f8f9fa; border-radius: 4px; overflow-x: auto;"><code>代码块内容</code></pre>` },

    // 分割线和分隔符
    { id: 'hr', title: '分割线', content: `<hr style="margin: 20px 0; border: none; height: 1px; background: #ddd;" />` },
    { id: 'br', title: '换行', content: `<br />` },

    // 表格
    { id: 'table', title: '表格', content: `<table style="width: 100%; border-collapse: collapse; margin: 0;"><tr><th style="border: 1px solid #ddd; padding: 8px; background: #f8f9fa;">标题1</th><th style="border: 1px solid #ddd; padding: 8px; background: #f8f9fa;">标题2</th></tr><tr><td style="border: 1px solid #ddd; padding: 8px;">内容1</td><td style="border: 1px solid #ddd; padding: 8px;">内容2</td></tr></table>` },

    // 容器类
    { id: 'div', title: '容器', content: `<div style="padding: 20px; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px;">容器内容</div>` },
    { id: 'section', title: '章节', content: `<section style="padding: 20px; background: white; border: 1px solid #ddd; border-radius: 8px;"><h3 style="margin: 0 0 10px 0;">章节标题</h3><p style="margin: 0;">章节内容</p></section>` },
    { id: 'article', title: '文章', content: `<article style="padding: 20px; background: white; border: 1px solid #ddd; border-radius: 8px;"><h3 style="margin: 0 0 10px 0;">文章标题</h3><p style="margin: 0;">文章内容</p></article>` },
    { id: 'aside', title: '侧边栏', content: `<aside style="padding: 15px; background: #f8f9fa; border-left: 4px solid #007bff; margin: 10px 0;">侧边栏内容</aside>` },
    { id: 'nav', title: '导航', content: `<nav style="padding: 10px; background: #f8f9fa; border-radius: 4px;"><a href="#" style="margin-right: 15px; color: #007bff; text-decoration: none;">导航1</a><a href="#" style="margin-right: 15px; color: #007bff; text-decoration: none;">导航2</a></nav>` },
    { id: 'header', title: '页头', content: `<header style="padding: 20px; background: #333; color: white; text-align: center;">页头内容</header>` },
    { id: 'footer', title: '页脚', content: `<footer style="padding: 20px; background: #f8f9fa; text-align: center; border-top: 1px solid #ddd;">页脚内容</footer>` },

    // 特殊元素
    { id: 'progress', title: '进度条', content: `<progress value="50" max="100" style="width: 100%; height: 20px;"></progress>` },
    { id: 'meter', title: '计量器', content: `<meter value="6" min="0" max="10" style="width: 100%; height: 20px;"></meter>` },
    { id: 'details', title: '折叠内容', content: `<details style="margin: 10px 0;"><summary>点击展开</summary><p>这里是折叠的内容</p></details>` },
    { id: 'figure', title: '图片说明', content: `<figure style="margin: 0; text-align: center;"><img src="https://via.placeholder.com/200x150" alt="图片" style="max-width: 100%; height: auto; border-radius: 4px;" /><figcaption style="margin-top: 5px; font-size: 12px; color: #666;">图片说明</figcaption></figure>` },

    // 表单元素（除了完整的表单）
    { id: 'input-text', title: '文本输入', content: `<input type="text" placeholder="请输入文本" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;" />` },
    { id: 'input-email', title: '邮箱输入', content: `<input type="email" placeholder="请输入邮箱" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;" />` },
    { id: 'input-password', title: '密码输入', content: `<input type="password" placeholder="请输入密码" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;" />` },
    { id: 'textarea', title: '文本域', content: `<textarea placeholder="请输入内容" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%; height: 80px; resize: vertical;"></textarea>` },
    { id: 'select', title: '下拉选择', content: `<select style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;"><option>选项1</option><option>选项2</option><option>选项3</option></select>` },
    { id: 'checkbox', title: '复选框', content: `<label style="display: flex; align-items: center; margin: 5px 0;"><input type="checkbox" style="margin-right: 8px;" />复选框选项</label>` },
    { id: 'radio', title: '单选框', content: `<label style="display: flex; align-items: center; margin: 5px 0;"><input type="radio" name="radio" style="margin-right: 8px;" />单选框选项</label>` },
    { id: 'label', title: '标签', content: `<label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">标签文本</label>` },

    // 特殊容器
    { id: 'card', title: '卡片', content: `<div style="padding: 20px; background: white; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><h3 style="margin: 0 0 10px 0;">卡片标题</h3><p style="margin: 0;">卡片内容</p></div>` },
    { id: 'alert', title: '警告框', content: `<div style="padding: 15px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; color: #856404;">警告信息</div>` },
    { id: 'info', title: '信息框', content: `<div style="padding: 15px; background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 4px; color: #0c5460;">信息提示</div>` },
    { id: 'success', title: '成功框', content: `<div style="padding: 15px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; color: #155724;">成功信息</div>` },
    { id: 'error', title: '错误框', content: `<div style="padding: 15px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; color: #721c24;">错误信息</div>` },

    // 布局卡片
    { id: 'two-column', title: '两列布局', content: `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 20px; background: #f8f9fa; border-radius: 8px;"><div style="padding: 15px; background: white; border-radius: 4px;">左列内容</div><div style="padding: 15px; background: white; border-radius: 4px;">右列内容</div></div>` },
    { id: 'three-column', title: '三列布局', content: `<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; padding: 20px; background: #f8f9fa; border-radius: 8px;"><div style="padding: 15px; background: white; border-radius: 4px;">列1</div><div style="padding: 15px; background: white; border-radius: 4px;">列2</div><div style="padding: 15px; background: white; border-radius: 4px;">列3</div></div>` },
    { id: 'sidebar-layout', title: '侧边栏布局', content: `<div style="display: grid; grid-template-columns: 200px 1fr; gap: 20px; padding: 20px; background: #f8f9fa; border-radius: 8px;"><div style="padding: 15px; background: #333; color: white; border-radius: 4px;">侧边栏</div><div style="padding: 15px; background: white; border-radius: 4px;">主内容区</div></div>` },
    { id: 'flex-center', title: '居中布局', content: `<div style="display: flex; justify-content: center; align-items: center; height: 100px; background: #f8f9fa; border-radius: 8px; border: 2px dashed #ddd;">居中内容</div>` },
    { id: 'flex-between', title: '两端对齐', content: `<div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background: #f8f9fa; border-radius: 8px;"><span>左侧内容</span><span>右侧内容</span></div>` },

    // 卡片样式变体
    { id: 'card-elevated', title: '阴影卡片', content: `<div style="padding: 25px; background: white; border-radius: 12px; box-shadow: 0 8px 25px rgba(0,0,0,0.15);"><h3 style="margin: 0 0 15px 0; color: #333;">阴影卡片</h3><p style="margin: 0; color: #666;">具有深度阴影效果的卡片</p></div>` },
    { id: 'card-gradient', title: '渐变卡片', content: `<div style="padding: 25px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px;"><h3 style="margin: 0 0 15px 0;">渐变卡片</h3><p style="margin: 0; opacity: 0.9;">具有渐变背景的卡片</p></div>` },
    { id: 'card-glass', title: '毛玻璃卡片', content: `<div style="padding: 25px; background: rgba(255,255,255,0.25); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.18); border-radius: 12px;"><h3 style="margin: 0 0 15px 0; color: #333;">毛玻璃卡片</h3><p style="margin: 0; color: #666;">具有毛玻璃效果的卡片</p></div>` },
    { id: 'card-border', title: '边框卡片', content: `<div style="padding: 25px; background: white; border: 3px solid #007bff; border-radius: 12px;"><h3 style="margin: 0 0 15px 0; color: #333;">边框卡片</h3><p style="margin: 0; color: #666;">具有彩色边框的卡片</p></div>` },

    // 数据展示卡片
    { id: 'stats-card', title: '统计卡片', content: `<div style="padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center;"><div style="font-size: 2em; font-weight: bold; color: #007bff; margin-bottom: 5px;">1,234</div><div style="color: #666; font-size: 14px;">总用户数</div></div>` },
    { id: 'progress-card', title: '进度卡片', content: `<div style="padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"><h4 style="margin: 0 0 10px 0;">项目进度</h4><div style="background: #e9ecef; border-radius: 10px; height: 8px; margin-bottom: 10px;"><div style="background: #28a745; height: 100%; width: 65%; border-radius: 10px;"></div></div><span style="color: #666; font-size: 14px;">65% 完成</span></div>` },
    { id: 'chart-card', title: '图表卡片', content: `<div style="padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"><h4 style="margin: 0 0 15px 0;">数据图表</h4><div style="height: 100px; background: linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #666;">图表占位符</div></div>` },

    // 交互元素
    { id: 'toggle-switch', title: '开关', content: `<label style="display: flex; align-items: center; cursor: pointer;"><input type="checkbox" style="display: none;" /><div style="width: 50px; height: 24px; background: #ccc; border-radius: 12px; position: relative; transition: background 0.3s;"><div style="width: 20px; height: 20px; background: white; border-radius: 50%; position: absolute; top: 2px; left: 2px; transition: transform 0.3s;"></div></div><span style="margin-left: 10px;">开关选项</span></label>` },
    { id: 'badge', title: '徽章', content: `<span style="display: inline-block; padding: 4px 8px; background: #007bff; color: white; border-radius: 12px; font-size: 12px; font-weight: bold;">徽章</span>` },
    { id: 'tag', title: '标签', content: `<span style="display: inline-block; padding: 6px 12px; background: #f8f9fa; color: #495057; border: 1px solid #dee2e6; border-radius: 4px; font-size: 14px; margin: 2px;">标签</span>` },
    { id: 'chip', title: '芯片', content: `<div style="display: inline-flex; align-items: center; padding: 6px 12px; background: #e9ecef; border-radius: 16px; font-size: 14px; margin: 2px;"><span>芯片内容</span><button style="margin-left: 8px; background: none; border: none; color: #6c757d; cursor: pointer; font-size: 16px;">×</button></div>` },

    // 时间相关
    { id: 'time', title: '时间', content: `<time style="display: inline-block; padding: 8px 12px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; font-family: monospace; color: #495057;">2024-01-15 14:30</time>` },
    { id: 'countdown', title: '倒计时', content: `<div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #ff6b6b, #ee5a24); color: white; border-radius: 8px;"><div style="font-size: 2em; font-weight: bold; margin-bottom: 5px;">23:59:59</div><div style="font-size: 14px; opacity: 0.9;">剩余时间</div></div>` },
    { id: 'calendar', title: '日历', content: `<div style="padding: 15px; background: white; border: 1px solid #ddd; border-radius: 8px; text-align: center;"><div style="font-weight: bold; margin-bottom: 10px;">2024年1月</div><div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; font-size: 12px;"><div style="padding: 5px; background: #f8f9fa;">日</div><div style="padding: 5px; background: #f8f9fa;">一</div><div style="padding: 5px; background: #f8f9fa;">二</div><div style="padding: 5px; background: #f8f9fa;">三</div><div style="padding: 5px; background: #f8f9fa;">四</div><div style="padding: 5px; background: #f8f9fa;">五</div><div style="padding: 5px; background: #f8f9fa;">六</div><div style="padding: 5px;">1</div><div style="padding: 5px;">2</div><div style="padding: 5px;">3</div><div style="padding: 5px;">4</div><div style="padding: 5px;">5</div><div style="padding: 5px;">6</div><div style="padding: 5px;">7</div></div></div>` },

    // 媒体展示
    { id: 'gallery', title: '图片画廊', content: `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 15px; background: #f8f9fa; border-radius: 8px;"><img src="https://via.placeholder.com/80x80" style="width: 100%; height: 80px; object-fit: cover; border-radius: 4px;" /><img src="https://via.placeholder.com/80x80" style="width: 100%; height: 80px; object-fit: cover; border-radius: 4px;" /><img src="https://via.placeholder.com/80x80" style="width: 100%; height: 80px; object-fit: cover; border-radius: 4px;" /></div>` },
    { id: 'video-thumbnail', title: '视频缩略图', content: `<div style="position: relative; background: #000; border-radius: 8px; overflow: hidden;"><img src="https://via.placeholder.com/300x200" style="width: 100%; height: 200px; object-fit: cover;" /><div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60px; height: 60px; background: rgba(255,255,255,0.9); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; color: #333;">▶</div></div>` },
    { id: 'audio-player', title: '音频播放器', content: `<div style="padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;"><div style="display: flex; align-items: center; gap: 10px;"><button style="width: 40px; height: 40px; border: none; background: #007bff; color: white; border-radius: 50%; cursor: pointer;">▶</button><div style="flex: 1;"><div style="height: 4px; background: #dee2e6; border-radius: 2px; margin-bottom: 5px;"><div style="width: 30%; height: 100%; background: #007bff; border-radius: 2px;"></div></div><div style="font-size: 12px; color: #666;">0:30 / 3:45</div></div><button style="background: none; border: none; color: #666; cursor: pointer;">🔊</button></div></div>` },

    // 导航元素
    { id: 'breadcrumb', title: '面包屑', content: `<nav style="padding: 10px 0;"><ol style="display: flex; list-style: none; margin: 0; padding: 0; gap: 5px;"><li><a href="#" style="color: #007bff; text-decoration: none;">首页</a></li><li style="color: #6c757d;">></li><li><a href="#" style="color: #007bff; text-decoration: none;">分类</a></li><li style="color: #6c757d;">></li><li style="color: #6c757d;">当前页面</li></ol></nav>` },
    { id: 'pagination', title: '分页', content: `<nav style="display: flex; justify-content: center; gap: 5px; padding: 20px 0;"><button style="padding: 8px 12px; border: 1px solid #dee2e6; background: white; color: #007bff; border-radius: 4px; cursor: pointer;">上一页</button><button style="padding: 8px 12px; border: 1px solid #007bff; background: #007bff; color: white; border-radius: 4px; cursor: pointer;">1</button><button style="padding: 8px 12px; border: 1px solid #dee2e6; background: white; color: #007bff; border-radius: 4px; cursor: pointer;">2</button><button style="padding: 8px 12px; border: 1px solid #dee2e6; background: white; color: #007bff; border-radius: 4px; cursor: pointer;">3</button><button style="padding: 8px 12px; border: 1px solid #dee2e6; background: white; color: #007bff; border-radius: 4px; cursor: pointer;">下一页</button></nav>` },
    { id: 'tabs', title: '标签页', content: `<div style="border: 1px solid #dee2e6; border-radius: 8px; overflow: hidden;"><div style="display: flex; background: #f8f9fa; border-bottom: 1px solid #dee2e6;"><button style="flex: 1; padding: 12px; border: none; background: #007bff; color: white; cursor: pointer;">标签1</button><button style="flex: 1; padding: 12px; border: none; background: transparent; color: #666; cursor: pointer;">标签2</button><button style="flex: 1; padding: 12px; border: none; background: transparent; color: #666; cursor: pointer;">标签3</button></div><div style="padding: 20px; background: white;">标签内容</div></div>` },

    // 特殊效果
    { id: 'hover-card', title: '悬停卡片', content: `<div style="padding: 20px; background: white; border: 1px solid #ddd; border-radius: 8px; transition: all 0.3s ease; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'"><h3 style="margin: 0 0 10px 0;">悬停效果</h3><p style="margin: 0; color: #666;">鼠标悬停查看效果</p></div>` },
    { id: 'loading-spinner', title: '加载动画', content: `<div style="display: flex; justify-content: center; align-items: center; padding: 40px; background: #f8f9fa; border-radius: 8px;"><div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite;"></div><style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style></div>` },
    { id: 'pulse-effect', title: '脉冲效果', content: `<div style="display: flex; justify-content: center; align-items: center; padding: 40px; background: #f8f9fa; border-radius: 8px;"><div style="width: 20px; height: 20px; background: #007bff; border-radius: 50%; animation: pulse 1.5s ease-in-out infinite;"></div><style>@keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0,123,255,0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(0,123,255,0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0,123,255,0); } }</style></div>` },

    // 信息展示
    { id: 'timeline', title: '时间线', content: `<div style="position: relative; padding: 20px 0;"><div style="position: absolute; left: 20px; top: 0; bottom: 0; width: 2px; background: #dee2e6;"></div><div style="position: relative; padding-left: 50px; margin-bottom: 20px;"><div style="position: absolute; left: 12px; top: 5px; width: 16px; height: 16px; background: #007bff; border-radius: 50%;"></div><h4 style="margin: 0 0 5px 0;">事件标题</h4><p style="margin: 0; color: #666; font-size: 14px;">事件描述内容</p></div><div style="position: relative; padding-left: 50px;"><div style="position: absolute; left: 12px; top: 5px; width: 16px; height: 16px; background: #28a745; border-radius: 50%;"></div><h4 style="margin: 0 0 5px 0;">另一个事件</h4><p style="margin: 0; color: #666; font-size: 14px;">另一个事件描述</p></div></div>` },
    { id: 'accordion', title: '手风琴', content: `<div style="border: 1px solid #dee2e6; border-radius: 8px; overflow: hidden;"><div style="padding: 15px; background: #f8f9fa; border-bottom: 1px solid #dee2e6; cursor: pointer; display: flex; justify-content: space-between; align-items: center;"><span>手风琴标题</span><span>+</span></div><div style="padding: 15px; background: white; border-bottom: 1px solid #dee2e6; cursor: pointer; display: flex; justify-content: space-between; align-items: center;"><span>另一个标题</span><span>+</span></div></div>` },
    { id: 'tooltip', title: '提示框', content: `<div style="position: relative; display: inline-block; padding: 10px 20px; background: #333; color: white; border-radius: 4px; font-size: 14px;">提示内容<div style="position: absolute; top: 100%; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 5px solid #333;"></div></div>` },

    // 社交媒体风格
    { id: 'social-post', title: '社交帖子', content: `<div style="padding: 20px; background: white; border: 1px solid #dee2e6; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><div style="display: flex; align-items: center; margin-bottom: 15px;"><div style="width: 40px; height: 40px; background: #007bff; border-radius: 50%; margin-right: 10px;"></div><div><div style="font-weight: bold;">用户名</div><div style="font-size: 12px; color: #666;">2小时前</div></div></div><p style="margin: 0 0 15px 0;">这是一条社交媒体的帖子内容，可以包含文字、图片等多种元素。</p><div style="display: flex; gap: 20px; color: #666; font-size: 14px;"><span>👍 12</span><span>💬 3</span><span>🔄 1</span></div></div>` },
    { id: 'testimonial', title: '用户评价', content: `<div style="padding: 25px; background: #f8f9fa; border-left: 4px solid #007bff; border-radius: 8px; position: relative;"><div style="font-size: 18px; color: #333; margin-bottom: 15px; font-style: italic;">"这是一个很棒的产品，我非常满意！"</div><div style="display: flex; align-items: center;"><div style="width: 50px; height: 50px; background: #007bff; border-radius: 50%; margin-right: 15px;"></div><div><div style="font-weight: bold; color: #333;">张三</div><div style="font-size: 14px; color: #666;">产品经理</div></div></div></div>` },
    { id: 'pricing-card', title: '价格卡片', content: `<div style="padding: 30px; background: white; border: 2px solid #dee2e6; border-radius: 12px; text-align: center; position: relative;"><div style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #007bff; color: white; padding: 5px 15px; border-radius: 15px; font-size: 12px;">推荐</div><h3 style="margin: 0 0 10px 0;">专业版</h3><div style="font-size: 2.5em; font-weight: bold; color: #333; margin-bottom: 20px;">¥99<span style="font-size: 0.5em; color: #666;">/月</span></div><ul style="list-style: none; padding: 0; margin: 0 0 25px 0;"><li style="padding: 8px 0; border-bottom: 1px solid #f8f9fa;">✓ 无限项目</li><li style="padding: 8px 0; border-bottom: 1px solid #f8f9fa;">✓ 高级支持</li><li style="padding: 8px 0; border-bottom: 1px solid #f8f9fa;">✓ 团队协作</li></ul><button style="width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer;">立即购买</button></div>` }
  ];
  // 同步到全局卡片库存储，供卡片库页面读取
  try {
    localStorage.setItem('html_cards_library', JSON.stringify(templateCards.value));
  } catch { }
}

const elementStyles = reactive({
  backgroundColor: "",
  color: "",
  fontSize: 16,
  padding: 10,
  margin: 10,
  border: "",
  borderRadius: 0,
  textAlign: "left",
  justifyContent: "flex-start",
  width: "",
  height: ""
});

const elementContent = reactive({ title: "", text: "", link: "" });

function generateId() { return 'el_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9); }

function getElementStyle(element: any) {
  const styles = element.styles || {};
  const position = element.position || { x: 50, y: 50 };

  return {
    ...styles,
    position: 'absolute',
    left: position.x + 'px',
    top: position.y + 'px',
    minHeight: '50px',
    minWidth: '200px',
    cursor: 'pointer',
    zIndex: selectedElement.value?.id === element.id ? 1000 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: styles.justifyContent || 'flex-start'
  };
}

// 计算画布内容高度（用于滚动条）
const canvasContentHeight = ref(600);
function recalcCanvasHeight() {
  let maxBottom = 0;
  for (const el of canvasElements.value) {
    const pos = el.position || { x: 0, y: 0 };
    // 粗略估算高度：样式中的 minHeight/height 优先
    const minH = parseInt((el.styles?.minHeight as string) || '0') || 0;
    const h = parseInt((el.styles?.height as string) || '0') || minH || 80;
    const bottom = pos.y + h + 40; // 含外边距预留
    if (bottom > maxBottom) maxBottom = bottom;
  }
  canvasContentHeight.value = Math.max(maxBottom, 600);
}

// 计算一段 HTML 在给定宽度和样式下的近似高度（用于绝对定位排布）
function measureHtmlHeight(html: string, widthPx: number, extraStyles: Record<string, any> = {}) {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-99999px';
  wrapper.style.top = '-99999px';
  wrapper.style.width = widthPx + 'px';
  wrapper.style.visibility = 'hidden';
  wrapper.style.boxSizing = 'border-box';
  // 应用与画布元素一致的基础样式
  wrapper.style.padding = (extraStyles.padding || '16px');
  wrapper.style.border = (extraStyles.border || '1px solid #e0e0e0');
  wrapper.style.background = (extraStyles.backgroundColor || '#fff');
  wrapper.style.borderRadius = (extraStyles.borderRadius || '12px');
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);
  const height = wrapper.offsetHeight;
  document.body.removeChild(wrapper);
  return height;
}

// 智能防重叠函数
function findNonOverlappingPosition(element: any | null, targetX: number, targetY: number) {
  const elementWidth = 200; // 默认元素宽度
  const elementHeight = 50; // 默认元素高度
  const padding = 10; // 元素间距

  // 检查指定位置是否重叠
  function isOverlapping(x: number, y: number, excludeId?: string) {
    return canvasElements.value.some(el => {
      if (el.id === excludeId) return false;
      const elPos = el.position || { x: 50, y: 50 };
      const elWidth = 200;
      const elHeight = 50;

      return !(x + elementWidth + padding <= elPos.x ||
        x >= elPos.x + elWidth + padding ||
        y + elementHeight + padding <= elPos.y ||
        y >= elPos.y + elHeight + padding);
    });
  }

  const excludeId = element && element.id ? element.id : undefined;
  // 如果目标位置不重叠，直接返回
  if (!isOverlapping(targetX, targetY, excludeId)) {
    return { x: targetX, y: targetY };
  }

  // 尝试在目标位置周围寻找合适的位置
  const searchRadius = 100; // 搜索半径
  const step = 20; // 搜索步长

  for (let radius = step; radius <= searchRadius; radius += step) {
    // 尝试8个方向
    const directions = [
      { x: targetX + radius, y: targetY }, // 右
      { x: targetX - radius, y: targetY }, // 左
      { x: targetX, y: targetY - radius }, // 上
      { x: targetX, y: targetY + radius }, // 下
      { x: targetX + radius, y: targetY - radius }, // 右上
      { x: targetX - radius, y: targetY - radius }, // 左上
      { x: targetX + radius, y: targetY + radius }, // 右下
      { x: targetX - radius, y: targetY + radius }, // 左下
    ];

    for (const dir of directions) {
      if (dir.x >= 0 && dir.y >= 0 && !isOverlapping(dir.x, dir.y, excludeId)) {
        return dir;
      }
    }
  }

  // 如果所有位置都重叠，返回一个基于现有元素数量的位置
  const existingCount = canvasElements.value.length;
  return {
    x: 50 + (existingCount % 5) * 220,
    y: 50 + Math.floor(existingCount / 5) * 80
  };
}

function addCardToCanvas(card: any) {
  const basePosition = { x: 50 + (canvasElements.value.length * 20), y: 50 + (canvasElements.value.length * 20) };
  const safePosition = findNonOverlappingPosition(null, basePosition.x, basePosition.y);

  const newElement = {
    id: generateId(),
    type: 'template-card',
    content: card.content,
    styles: { margin: '10px', padding: '15px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' },
    position: safePosition
  };
  canvasElements.value.push(newElement);
  recalcCanvasHeight();
}

// 拖拽处理函数
function handleCardDragStart(event: DragEvent, card: any) {
  draggedCard.value = card;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy';
    // 设置多种 MIME，增加兼容性
    try { event.dataTransfer.setData('text/plain', card.id); } catch { }
    try { event.dataTransfer.setData('text/html', card.content); } catch { }
  }
}

function handleCardDragEnd() {
  draggedCard.value = null;
}

function handleElementDragStart(event: DragEvent, element: any) {
  draggedElement.value = element;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    try { event.dataTransfer.setData('text/plain', element.id); } catch { }
  }
}

function handleElementDragEnd() {
  draggedElement.value = null;
  dragOverElement.value = null;
}

function handleElementDragOver(event: DragEvent, element: any) {
  event.preventDefault();
  if (event.dataTransfer) {
    try { event.dataTransfer.dropEffect = draggedElement.value ? 'move' : 'copy'; } catch { }
  }
  if (draggedElement.value && draggedElement.value.id !== element.id) {
    dragOverElement.value = element;
  }
}

function handleElementDrop(event: DragEvent, element: any) {
  event.preventDefault();
  if (draggedElement.value && draggedElement.value.id !== element.id) {
    // 交换位置
    const draggedIndex = canvasElements.value.findIndex(el => el.id === draggedElement.value.id);
    const targetIndex = canvasElements.value.findIndex(el => el.id === element.id);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const draggedEl = canvasElements.value[draggedIndex];
      const targetEl = canvasElements.value[targetIndex];

      // 交换位置
      draggedEl.position = { ...targetEl.position };
      targetEl.position = { ...draggedEl.position };

      ElMessage.success('元素位置已交换');
    }
  }
  dragOverElement.value = null;
}

function handleCanvasDrop(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();
  if (event.dataTransfer) {
    try { event.dataTransfer.dropEffect = draggedElement.value ? 'move' : 'copy'; } catch { }
  }

  if (draggedCard.value) {
    // 从卡片库拖拽到画布，计算拖拽位置
    const canvasRect = canvasRef.value?.getBoundingClientRect();
    if (canvasRect) {
      const x = event.clientX - canvasRect.left;
      const y = event.clientY - canvasRect.top;
      const targetPosition = { x: Math.max(10, x - 100), y: Math.max(10, y - 25) };
      const safePosition = findNonOverlappingPosition(null, targetPosition.x, targetPosition.y);

      const newElement = {
        id: generateId(),
        type: 'template-card',
        content: draggedCard.value.content,
        styles: { margin: '10px', padding: '15px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' },
        position: safePosition
      };
      canvasElements.value.push(newElement);
      ElMessage.success(`已添加 ${draggedCard.value.title} 到画布`);
      recalcCanvasHeight();
    } else {
      addCardToCanvas(draggedCard.value);
    }
  } else if (draggedElement.value) {
    // 在画布内移动元素到新位置
    const canvasRect = canvasRef.value?.getBoundingClientRect();
    if (canvasRect) {
      const x = event.clientX - canvasRect.left;
      const y = event.clientY - canvasRect.top;
      const targetPosition = { x: Math.max(10, x - 100), y: Math.max(10, y - 25) };
      const safePosition = findNonOverlappingPosition(draggedElement.value, targetPosition.x, targetPosition.y);

      const element = canvasElements.value.find(el => el.id === draggedElement.value.id);
      if (element) {
        element.position = safePosition;
        ElMessage.success('元素位置已更新');
        recalcCanvasHeight();
      }
    }
  }

  draggedCard.value = null;
  draggedElement.value = null;
  dragOverElement.value = null;
}

function handleCanvasDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    try { event.dataTransfer.dropEffect = draggedElement.value ? 'move' : 'copy'; } catch { }
  }
}


function addSection(type: string) {
  let content = '';
  switch (type) {
    case 'header': content = '<h1 style="margin: 0; color: #333;">新标题</h1>'; break;
    case 'paragraph': content = '<p style="margin: 0; line-height: 1.6;">新段落内容...</p>'; break;
    case 'list': content = `<ul style="margin: 0; padding-left: 20px;"><li>列表项 1</li><li>列表项 2</li><li>列表项 3</li></ul>`; break;
    case 'image': content = '<img src="https://via.placeholder.com/300x200" alt="示例图片" style="max-width: 100%; height: auto;" />'; break;
  }

  const basePosition = { x: 50 + (canvasElements.value.length * 20), y: 50 + (canvasElements.value.length * 20) };
  const safePosition = findNonOverlappingPosition(null, basePosition.x, basePosition.y);

  const newElement = {
    id: generateId(),
    type,
    content,
    styles: { margin: '10px', padding: '15px', backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px' },
    position: safePosition
  };
  canvasElements.value.push(newElement);
  recalcCanvasHeight();
}

function generateWikiLayout() {
  canvasElements.value = [];
  templateTitle.value = '东京大学 · Wiki模板';
  const baseX = 40;
  let y = 40;

  function push(content: string, styles: any = {}, size = { w: 920, h: 120 }) {
    // 去除内部 margin，避免意外叠加高度导致重叠
    const cleaned = content.replace(/margin:\s*[^;"']+;?/g, '').replace(/margin-[a-z-]+:\s*[^;"']+;?/g, '');
    // 先测量真实高度
    const measuredH = measureHtmlHeight(cleaned, size.w, styles);
    const finalH = Math.max(measuredH, size.h);
    const el = {
      id: generateId(),
      type: 'wiki',
      content: cleaned,
      styles: {
        margin: '10px',
        padding: '16px',
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        width: size.w + 'px',
        minHeight: finalH + 'px',
        ...styles
      },
      position: { x: baseX, y }
    } as any;
    canvasElements.value.push(el);
    y += finalH + 36;
  }

  // 统一生成一个"页面框架"，内部使用 CSS 居中与三栏布局（左目录 / 中心内容 / 右相关）
  const pageContent = `
  <style>
    html, body { height: 100%; width: 100%; margin: 0; }
    .wiki-frame { width: 100%; max-width: 100%; height: 100%; margin: 0 auto; padding: 16px; box-sizing: border-box; }
    .wiki-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0 16px; position: sticky; top: 0; background: linear-gradient(180deg,#fff,rgba(255,255,255,.85)); backdrop-filter: blur(6px); z-index: 2; }
    .wiki-search { display:flex; gap:8px; }
    .wiki-search input { padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 6px; width: 320px; }
    .wiki-search button { padding: 8px 14px; border: 1px solid #1f69ff; background: #1f69ff; color: #fff; border-radius: 6px; cursor: pointer; }
    .wiki-grid { width: 100%; display: grid; grid-template-columns: 260px 1fr 260px; gap: 16px; align-items: start; }
    .wiki-sticky { position: sticky; top: 72px; }
    .wiki-card { border: 1px solid #e0e0e0; border-radius: 12px; background: #fff; }
    .wiki-toc { padding: 12px; }
    .wiki-toc h4 { margin: 0 0 10px 0; font-size: 14px; }
    .wiki-toc ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
    .wiki-toc a { color: #333; text-decoration: none; padding: 6px 8px; border-radius: 6px; display: block; }
    .wiki-toc a:hover { background: #eef5ff; color: #1f69ff; }
    .wiki-main { display: flex; flex-direction: column; gap: 16px; }
    .sec { border: 1px solid #e0e0e0; border-radius: 12px; background: #fff; padding: 16px; }
    .sk-title { height: 16px; width: 160px; background: #f0f2f5; border-radius: 6px; margin-bottom: 12px; }
    .sk-block { height: 72px; background: #f6f7f9; border-radius: 8px; }
    .sk-row { height: 14px; background: #f6f7f9; border-radius: 6px; margin: 8px 0; }
    .wiki-related { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
    .wiki-chip { display:inline-block; padding: 8px 12px; border: 1px dashed #e0e0e0; border-radius: 999px; background: #fff; min-width: 40px; }

    @media (max-width: 1200px) {
      .wiki-grid { grid-template-columns: 220px 1fr; }
      .wiki-related { display: none; }
      .wiki-search input { width: 260px; }
    }
    @media (max-width: 768px) {
      .wiki-grid { grid-template-columns: 1fr; }
      .wiki-toc { position: static; }
      .wiki-header { flex-direction: column; align-items: stretch; gap: 10px; }
      .wiki-search { width: 100%; }
      .wiki-search input { width: 100%; }
    }
  </style>
  <div class="wiki-frame" onClick="void(0)">
    <div class="wiki-header">
      <div class="sk-title" style="width:220px;height:20px;"></div>
      <div class="wiki-search">
        <input id="wiki-global-search" placeholder="搜索条目..." />
        <button onclick="(function(btn){
          var input = btn.previousElementSibling; var q=input&&input.value||'';
          if(!q){ return; }
          var main = btn.closest('.wiki-frame');
          var sec = main && main.querySelector('[data-sec]');
          if(sec){ var c=document.querySelector('.canvas'); if(c){ var r=sec.getBoundingClientRect(); var cr=c.getBoundingClientRect(); c.scrollTo({top: c.scrollTop + (r.top - cr.top) - 20, behavior:'smooth'}); } }
        })(this)">搜索</button>
      </div>
    </div>
    <div class="wiki-grid">
      <aside class="wiki-card wiki-sticky wiki-toc">
        <h4>目录</h4>
        <ul>
          ${['intro', 'history', 'principles', 'quote', 'list', 'tips', 'related'].map(id => `
            <li><a href="#sec-${id}" onclick="(function(a){ a.preventDefault && a.preventDefault(); var id=a.getAttribute('href').slice(1); var t=document.getElementById(id); var c=document.querySelector('.canvas'); if(t&&c){ var r=t.getBoundingClientRect(); var cr=c.getBoundingClientRect(); c.scrollTo({top: c.scrollTop + (r.top - cr.top) - 12, behavior:'smooth'}); } })(event.target)"># ${id}</a></li>
          `).join('')}
        </ul>
      </aside>
      <main class="wiki-main">
        <section id="sec-intro" data-sec class="sec">
          <div class="sk-title"></div>
          <div class="sk-block"></div>
        </section>
        <section id="sec-history" class="sec">
          <div class="sk-title"></div>
          <div class="sk-row" style="width:80%"></div>
          <div class="sk-row" style="width:70%"></div>
          <div class="sk-row" style="width:60%"></div>
          <div class="sk-row" style="width:50%"></div>
        </section>
        <section id="sec-principles" class="sec">
          <div class="sk-title"></div>
          <div class="sk-block"></div>
        </section>
        <section id="sec-quote" class="sec" style="background:#fff9e6;border:1px solid #ffe8a3;">
          <div class="sk-row" style="width:65%"></div>
        </section>
        <section id="sec-list" class="sec">
          <div class="sk-title"></div>
          <div class="sk-row" style="width:85%"></div>
          <div class="sk-row" style="width:75%"></div>
          <div class="sk-row" style="width:65%"></div>
        </section>
        <section id="sec-tips" class="sec" style="background:#fff3cd;border:1px solid #ffeaa7;">
          <div class="sk-row" style="width:45%"></div>
        </section>
        <section id="sec-related" class="sec">
          <div class="sk-title" style="width:100px"></div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            ${Array.from({ length: 6 }).map(() => '<span class="wiki-chip"></span>').join('')}
          </div>
        </section>
      </main>
      <aside class="wiki-card wiki-sticky wiki-related">
        <div class="sk-title" style="width:120px"></div>
        ${Array.from({ length: 6 }).map(() => '<div class="sk-row" style="height:18px"></div>').join('')}
      </aside>
    </div>
  </div>`;

  push(pageContent, { width: '100%', padding: '0', border: 'none', backgroundColor: 'transparent' }, { w: 1200, h: 900 });
  ElMessage.success('已生成 Wiki 布局');
  recalcCanvasHeight();
  return;
}

function selectElement(element: any) {
  selectedElement.value = element;
  const styles = element.styles || {};
  elementStyles.backgroundColor = styles.backgroundColor || "";
  elementStyles.color = styles.color || "";
  elementStyles.fontSize = parseInt(styles.fontSize) || 16;
  elementStyles.padding = parseInt(styles.padding) || 10;
  elementStyles.margin = parseInt(styles.margin) || 10;
  elementStyles.border = styles.border || "";
  elementStyles.borderRadius = parseInt(styles.borderRadius) || 0;
  elementStyles.textAlign = styles.textAlign || "left";
  elementStyles.justifyContent = styles.justifyContent || "flex-start";
  elementStyles.width = styles.width || "";
  elementStyles.height = styles.height || "";
  const tempDiv = document.createElement('div'); tempDiv.innerHTML = element.content;
  const titleEl = tempDiv.querySelector('h1, h2, h3, h4, h5, h6');
  const textEl = tempDiv.querySelector('p, div, span');
  const linkEl = tempDiv.querySelector('a');
  elementContent.title = titleEl?.textContent || "";
  elementContent.text = textEl?.textContent || "";
  elementContent.link = linkEl?.getAttribute('href') || "";
  styleDrawerVisible.value = true;
}

function updateElementStyle() {
  if (!selectedElement.value) return;
  selectedElement.value.styles = {
    ...selectedElement.value.styles,
    backgroundColor: elementStyles.backgroundColor,
    color: elementStyles.color,
    fontSize: elementStyles.fontSize + 'px',
    padding: elementStyles.padding + 'px',
    margin: elementStyles.margin + 'px',
    border: elementStyles.border,
    borderRadius: elementStyles.borderRadius + 'px',
    textAlign: elementStyles.textAlign,
    justifyContent: elementStyles.justifyContent,
    width: elementStyles.width,
    height: elementStyles.height
  };
}

function updateElementContent() {
  if (!selectedElement.value) return;
  const tempDiv = document.createElement('div'); tempDiv.innerHTML = selectedElement.value.content;
  const titleEl = tempDiv.querySelector('h1, h2, h3, h4, h5, h6'); if (titleEl && elementContent.title) titleEl.textContent = elementContent.title;
  const textEl = tempDiv.querySelector('p, div, span'); if (textEl && elementContent.text) textEl.textContent = elementContent.text;
  const linkEl = tempDiv.querySelector('a'); if (linkEl && elementContent.link) linkEl.setAttribute('href', elementContent.link);
  selectedElement.value.content = tempDiv.innerHTML;
}

function removeElement(id: string) { const i = canvasElements.value.findIndex(el => el.id === id); if (i > -1) { canvasElements.value.splice(i, 1); if (selectedElement.value?.id === id) selectedElement.value = null; ElMessage.success('元素已删除'); } }
function duplicateElement(el: any) {
  const basePosition = {
    x: (el.position?.x || 50) + 20,
    y: (el.position?.y || 50) + 20
  };
  const safePosition = findNonOverlappingPosition(null, basePosition.x, basePosition.y);

  const newElement = {
    ...el,
    id: generateId(),
    position: safePosition
  };
  canvasElements.value.push(newElement);
  ElMessage.success('元素已复制');
  recalcCanvasHeight();
}
function clearCanvas() { canvasElements.value = []; selectedElement.value = null; recalcCanvasHeight(); ElMessage.success('画布已清空'); }
function handleCanvasClick() { selectedElement.value = null; }

function exportHTML() {
  const title = templateTitle.value || '导出的模板';
  const isSingleWiki = canvasElements.value.length === 1 && (canvasElements.value[0].type === 'wiki');
  if (isSingleWiki) {
    const content = canvasElements.value[0].content || '';
    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        :root { color-scheme: light dark; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; height: 100%; width: 100%; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f5f7fa; }
        .container { min-height: 100%; width: 100%; }
        .container > * { max-width: 100%; }
      
        /* 让嵌入 wiki 框架占满 */
        .wiki-frame { width: 100% !important; max-width: 100% !important; }
      
    </style>
</head>
<body>
    <div class="container">${content}</div>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (templateTitle.value || 'template') + '.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    ElMessage.success('HTML文件已导出');
    return;
  }

  let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f7fa;
        }
        .template-container {
            position: relative;
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.1);
            overflow: hidden;
            min-height: 600px;
        }
        .template-element {
            position: absolute;
            transition: all 0.2s ease;
        }
        .template-element:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="template-container">`;

  canvasElements.value.forEach(el => {
    const styleStr = Object.entries(el.styles || {}).map(([k, v]) => {
      const cssKey = k.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${cssKey}: ${v}`;
    }).join('; ');

    const position = el.position || { x: 50, y: 50 };
    const positionStyle = `position: absolute; left: ${position.x}px; top: ${position.y}px;`;

    html += `\n        <div class="template-element" style="${positionStyle} ${styleStr}">${el.content}</div>`;
  });

  html += `\n    </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (templateTitle.value || 'template') + '.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  ElMessage.success('HTML文件已导出');
}


function previewHTML() {
  const title = templateTitle.value || '模板预览';
  const isSingleWiki = canvasElements.value.length === 1 && (canvasElements.value[0].type === 'wiki');
  if (isSingleWiki) {
    const content = canvasElements.value[0].content || '';
    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        :root { color-scheme: light dark; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; height: 100%; width: 100%; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f5f7fa; }
        .container { min-height: 100%; width: 100%; }
        .container > * { max-width: 100%; }
        .wiki-frame { width: 100% !important; max-width: 100% !important; }
    </style>
</head>
<body>
    <div class="container">${content}</div>
</body>
</html>`;
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
      ElMessage.success('HTML预览已在新窗口中打开');
    } else {
      ElMessage.error('无法打开预览窗口，请检查浏览器设置');
    }
    return;
  }

  let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        html, body {
            width: 100%;
            height: 100%;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f7fa;
        }
        .template-container {
            position: relative;
            width: 100%;
            height: 100vh;
            background: white;
            overflow: auto;
        }
        .template-element {
            position: absolute;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
        }
        .template-element:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="template-container">`;

  canvasElements.value.forEach(el => {
    const styleStr = Object.entries(el.styles || {}).map(([k, v]) => {
      const cssKey = k.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${cssKey}: ${v}`;
    }).join('; ');

    const position = el.position || { x: 50, y: 50 };
    const positionStyle = `position: absolute; left: ${position.x}px; top: ${position.y}px;`;

    html += `\n        <div class="template-element" style="${positionStyle} ${styleStr}">${el.content}</div>`;
  });

  html += `\n    </div>
</body>
</html>`;

  // 在新窗口中打开预览
  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write(html);
    newWindow.document.close();
    ElMessage.success('HTML预览已在新窗口中打开');
  } else {
    ElMessage.error('无法打开预览窗口，请检查浏览器设置');
  }
}

function importHTML() { importDialogVisible.value = true; }
function processImportedHTML() {
  try {
    const doc = new DOMParser().parseFromString(importHtmlContent.value, 'text/html');
    canvasElements.value = [];
    Array.from(doc.body.children).forEach((el, index) => {
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
      canvasElements.value.push({
        id: generateId(),
        type: 'imported',
        content: el.innerHTML,
        styles: { margin: '10px', padding: '15px', backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px' },
        position: { x: 50 + (index * 20), y: 50 + (index * 20) }
      });
    });
    importDialogVisible.value = false;
    importHtmlContent.value = '';
    ElMessage.success(`已导入 ${canvasElements.value.length} 个元素`);
  } catch {
    ElMessage.error('HTML解析失败');
  }
}

async function onSave() {
  const body = buildTemplateHtmlBody();
  if (editingId.value) {
    await updateTemplate(editingId.value, { name: templateTitle.value || '未命名模板', body });
  } else {
    const created = await createTemplate({ name: templateTitle.value || '未命名模板', body });
    editingId.value = created.id;
  }
  ElMessage.success('模板已保存');
  router.replace({ path: '/template/workbench' });
}

function refreshCards() {
  // 重置本地卡片库，确保显示最新默认卡片集合
  localStorage.removeItem('html_cards_library');
  createDefaultCards();
  // 同步广播（触发其他页面如卡片库页监听 storage 事件时更新）
  try {
    localStorage.setItem('html_cards_library_last_update', String(Date.now()));
  } catch { }
  ElMessage.success('卡片库已重置为最新默认');
}

function goBack() { router.back(); }

onMounted(async () => {
  loadCardsFromLibrary();
  const id = route.query.id as string | undefined;
  if (id) {
    editingId.value = id; pageTitle.value = '编辑模板';
    try {
      const tpl = await getTemplateById(id);
      templateTitle.value = tpl.name || '';
      // 当后端仅存储HTML body时，导入到单个wiki元素或解析为一个整体元素
      if (tpl.body) {
        canvasElements.value = [{
          id: generateId(),
          type: 'wiki',
          content: tpl.body,
          styles: { margin: '0', padding: '0', border: 'none', backgroundColor: 'transparent', minHeight: '800px' },
          position: { x: 0, y: 0 }
        }];
      }
    } catch { }
  } else {
    pageTitle.value = '新增模板';
  }
});

function buildTemplateHtmlBody() {
  // 如果画布是单一wiki元素，则直接使用其content作为整体body
  const isSingleWiki = canvasElements.value.length === 1 && (canvasElements.value[0].type === 'wiki');
  if (isSingleWiki) return canvasElements.value[0].content || '';
  // 否则将画布元素合成为一个容器内的HTML
  let html = '<div class="template-container">';
  canvasElements.value.forEach(el => {
    const styleStr = Object.entries(el.styles || {}).map(([k, v]) => {
      const cssKey = (k as string).replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${cssKey}: ${v}`;
    }).join('; ');
    const position = el.position || { x: 50, y: 50 };
    const positionStyle = `position: absolute; left: ${position.x}px; top: ${position.y}px;`;
    html += `\n<div class="template-element" style="${positionStyle} ${styleStr}">${el.content}</div>`;
  });
  html += '\n</div>';
  return html;
}

</script>

<style scoped>
/* 复用 index 的样式，保留核心布局类名 */
.main {
  width: 100%;
  height: 100vh;
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

.workbench-body {
  flex: 1;
  min-height: 0;
  display: flex;
  width: 100%;
  overflow: hidden;
}

.cards-sidebar {
  width: 280px;
  flex: 0 0 280px;
  border-right: 1px solid var(--el-border-color);
  background: #fafbfc;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
}

.cards-container {
  flex: 1;
  overflow-y: auto;
  /* 只在卡片库内部滚动 */
  padding: 16px;
}


.cards-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.template-card {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all .2s;
  background: #fff;
  -webkit-user-drag: element;
  user-select: none;
}

.template-card:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 4px 12px rgba(64, 158, 255, .15);
  transform: translateY(-2px);
}

.template-card[draggable="true"] {
  cursor: grab;
}

.template-card[draggable="true"]:active {
  cursor: grabbing;
}

.card-preview {
  margin-bottom: 8px;
  font-size: 11px;
  background: #f8f9fa;
  padding: 8px;
  border-radius: 4px;
  max-height: 50px;
  overflow: hidden;
  border: 1px solid #e9ecef;
  pointer-events: none;
  /* 预览内部不拦截鼠标，便于拖拽 */
}

.card-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-regular);
  text-align: center;
}

.canvas-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #f5f7fa;
}

.canvas-toolbar {
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.canvas {
  flex: 1;
  min-height: 0;
  padding: 20px;
  overflow: auto;
  /* 画布区域不随外部滚动 */
  background: #f8f9fa;
  position: relative;
  min-height: 600px;
}

.canvas-element {
  position: absolute;
  cursor: pointer;
  transition: all .2s;
  overflow: hidden;
  box-sizing: border-box;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.canvas-element:hover {
  outline: 2px dashed var(--el-color-primary);
}

.canvas-element[draggable="true"] {
  cursor: grab;
}

.canvas-element[draggable="true"]:active {
  cursor: grabbing;
}

.canvas-element.dragging {
  opacity: 0.5;
  transform: rotate(5deg);
}

.canvas-element.selected {
  outline: 2px solid var(--el-color-primary);
}

.element-controls {
  position: absolute;
  top: -5px;
  right: -5px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity .2s;
  z-index: 10;
}

.canvas-element:hover .element-controls {
  opacity: 1;
}

.element-content {
  width: 100%;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.canvas-spacer {
  width: 1px;
}

.canvas-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #999;
  font-size: 16px;
  border: 2px dashed #ddd;
  border-radius: 8px;
  background: #fafafa;
  margin: 20px;
}

.empty-content {
  text-align: center;
}

.empty-content h3 {
  margin: 0 0 20px 0;
  color: #666;
  font-size: 18px;
}

.empty-content p {
  margin: 8px 0;
  color: #888;
  font-size: 14px;
}

.style-drawer-content {
  padding: 20px;
}

.style-drawer-content .el-form-item {
  margin-bottom: 20px;
}
</style>
