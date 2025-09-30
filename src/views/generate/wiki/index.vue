<template>
  <div class="generate-page">
    <div class="container">
      <h1>静态页面批量生成器</h1>

      <!-- JSON数据输入 -->
      <div class="input-section">
        <h2>输入JSON数据</h2>
        <textarea v-model="jsonInput" placeholder="粘贴JSON数据或选择文件..." rows="15" class="json-input"></textarea>

        <div class="file-upload">
          <input type="file" @change="handleFileUpload" accept=".json" ref="fileInput">
          <button @click="triggerFileInput" class="btn btn-secondary">
            📁 选择JSON文件
          </button>
        </div>
      </div>

      <!-- 生成选项 -->
      <div class="options-section">
        <h2>生成选项</h2>
        <div class="options">
          <label>
            <input type="checkbox" v-model="options.includeCSS"> 包含CSS样式
          </label>
          <label>
            <input type="checkbox" v-model="options.minifyHTML"> 压缩HTML
          </label>
          <label>
            文件名:
            <input type="text" v-model="filename" placeholder="例如: korea">
            .html
          </label>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <button @click="generateSingle" class="btn btn-primary" :disabled="!isValidJSON">
          🚀 生成单个页面
        </button>
        <button @click="addToBatch" class="btn btn-info" :disabled="!isValidJSON">
          ➕ 添加到批量列表
        </button>
        <button @click="batchGenerate" class="btn btn-success" :disabled="!batchData.length">
          📦 批量生成 ({{ batchData.length }}个文件)
        </button>
        <button @click="clearAll" class="btn btn-danger">
          🗑️ 清空所有
        </button>
      </div>

      <!-- 批量数据管理 -->
      <div class="batch-section" v-if="batchData.length > 0">
        <h2>批量数据列表</h2>
        <div class="batch-list">
          <div v-for="(item, index) in batchData" :key="index" class="batch-item">
            <span>{{ item.filename }}</span>
            <button @click="removeBatchItem(index)" class="btn btn-sm btn-danger">删除</button>
          </div>
        </div>
      </div>

      <!-- 预览 -->
      <div class="preview-section" v-if="generatedHTML">
        <h2>预览</h2>
        <div class="preview-actions">
          <button @click="copyToClipboard" class="btn btn-info">📋 复制HTML</button>
          <button @click="downloadHTML" class="btn btn-success">💾 下载HTML文件</button>
          <button @click="previewInNewWindow" class="btn btn-warning">👀 在新窗口预览</button>
        </div>
        <div class="html-preview">
          <pre>{{ generatedHTML }}</pre>
        </div>
      </div>

      <!-- 状态信息 -->
      <div class="status-section">
        <div v-if="status.message" :class="['status', status.type]">
          {{ status.message }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GeneratePage',
  data() {
    return {
      jsonInput: '',
      filename: 'article',
      generatedHTML: '',
      batchData: [],
      options: {
        includeCSS: true,
        minifyHTML: false
      },
      status: {
        message: '',
        type: ''
      }
    }
  },
  computed: {
    isValidJSON() {
      if (!this.jsonInput.trim()) return false
      try {
        JSON.parse(this.jsonInput)
        return true
      } catch {
        return false
      }
    },
    parsedData() {
      try {
        return JSON.parse(this.jsonInput)
      } catch {
        return null
      }
    }
  },
  methods: {
    // 触发文件选择
    triggerFileInput() {
      this.$refs.fileInput.click()
    },

    // 处理文件上传
    handleFileUpload(event) {
      const file = event.target.files[0]
      if (file && file.type === 'application/json') {
        const reader = new FileReader()
        reader.onload = (e) => {
          this.jsonInput = e.target.result
          // 自动设置文件名
          this.filename = file.name.replace('.json', '')
          this.showStatus('文件加载成功!', 'success')
        }
        reader.readAsText(file)
      } else {
        this.showStatus('请选择有效的JSON文件', 'error')
      }
    },

    // 生成单个页面
    generateSingle() {
      if (!this.isValidJSON) {
        this.showStatus('请输入有效的JSON数据', 'error')
        return
      }

      try {
        const data = this.parsedData
        this.generatedHTML = this.renderTemplate(data)
        this.showStatus('页面生成成功!', 'success')
      } catch (error) {
        this.showStatus('生成失败: ' + error.message, 'error')
      }
    },

    // 批量生成
    batchGenerate() {
      if (this.batchData.length === 0) {
        this.showStatus('请先添加批量数据', 'warning')
        return
      }

      this.batchData.forEach(item => {
        const html = this.renderTemplate(item.data)
        this.downloadFile(html, item.filename)
      })

      this.showStatus(`成功生成 ${this.batchData.length} 个文件!`, 'success')
    },

    // 添加到批量列表
    addToBatch() {
      if (!this.isValidJSON) {
        this.showStatus('请先输入有效的JSON数据', 'error')
        return
      }

      const filename = this.filename || 'article'
      this.batchData.push({
        filename: `${filename}.html`,
        data: this.parsedData
      })

      this.showStatus('已添加到批量列表', 'success')
      this.jsonInput = ''
      this.filename = 'article'
    },

    // 从批量列表移除
    removeBatchItem(index) {
      this.batchData.splice(index, 1)
    },

    // 清空所有
    clearAll() {
      this.jsonInput = ''
      this.generatedHTML = ''
      this.batchData = []
      this.filename = 'article'
      this.showStatus('已清空所有数据', 'info')
    },

    // 渲染模板 (基于方法2的核心逻辑)
    renderTemplate(data) {
      const title = data.title || '无标题'
      const meta = data.meta || {}
      const content = data.content || {}
      const infobox = data.infobox || {}
      const stats = data.stats || []
      const mapPlaces = data.map_places || []
      const relatedCards = data.related_cards || []
      const relatedEntities = data['related-entities'] || []
      const externalLinks = data['external-links'] || []

      // 构建条件内容
      const quickFactsHtml = stats.length > 0 ?
        '<div class="quick-facts">' +
        '<h3>📊 关键数据</h3>' +
        '<ul id="quick-facts-list">' +
        stats.map(stat =>
          '<li><strong>' + stat.label + ':</strong> ' + stat.value + '</li>'
        ).join('') +
        '</ul>' +
        '</div>' : ''

      const externalLinksHtml = externalLinks.length > 0 ?
        '<div class="external-links">' +
        '<h3>外部参考</h3>' +
        '<ul>' +
        externalLinks.map(link =>
          '<li><a href="' + link.url + '" target=_blank"' + '" rel="' + (link.rel || 'nofollow') + '">' + link.title + '</a></li>'
        ).join('') +
        '</ul>' +
        '</div>' : ''

      const infoboxHtml = infobox.type_label ?
        '<div class="infobox">' +
        '<h3 id="infobox-title">' + infobox.type_label + '</h3>' +
        '<table id="infobox-table">' +
        '<tbody>' +
        (infobox.fields || []).map(field =>
          '<tr>' +
          '<th>' + field.label + '</th>' +
          '<td>' + this.formatInfoboxValue(field.value) + '</td>' +
          '</tr>'
        ).join('') +
        '</tbody>' +
        '</table>' +
        '</div>' : ''

      const relatedEntitiesHtml = relatedEntities.length > 0 ?
        '<div class="related-entities">' +
        '<h3>🔗 相关实体</h3>' +
        '<ul id="related-entities-list">' +
        relatedEntities.map(entity =>
          '<li><a href="' + entity.url + '">' + entity.title + '</a></li>'
        ).join('') +
        '</ul>' +
        '</div>' : ''

      const statsBoxHtml = stats.length > 0 ?
        '<div class="stats-box">' +
        '<h3>📊 统计信息</h3>' +
        '<ul id="stats-list">' +
        stats.map(stat =>
          '<li><strong>' + stat.label + ':</strong> ' + stat.value + '</li>'
        ).join('') +
        '</ul>' +
        '</div>' : ''

      const mapBoxHtml = mapPlaces.length > 0 ?
        '<div class="map-box">' +
        '<h3>🗺️ 相关地点</h3>' +
        '<div class="map-placeholder" id="map-places">' +
        mapPlaces.map(place =>
          '<p>📍 <a href="' + place.url + '" target=_blank"' + '" class="entity-link">' + place.title + '</a></p>'
        ).join('') +
        '</div>' +
        '</div>' : ''

      const timelineHtml = (meta.timeline_years || []).length > 0 ?
        '<div class="timeline-mini">' +
        '<h3>⏰ 时间线</h3>' +
        '<div id="timeline-content">' +
        '<div class="mini-timeline">' +
        (meta.timeline_years || []).map(year =>
          '<div class="timeline-item-mini">' +
            '<div class="timeline-date-mini">' + year.year + '</div>' +
            '<div class="timeline-content-mini">' +
              '<div class="summary-container">' +
                '<div class="summary-text">' + (year.summary || '重要发展节点') + '</div>' +
                '<div class="summary-full">' + (year.summary || '重要发展节点') + '</div>' +
              '</div>' +
            '</div>' +
          '</div>'
        ).join('') +
        '</div>' +
        '</div>' +
        '</div>' : ''

      const relatedCardsHtml = relatedCards.length > 0 ?
        '<div class="related-pages">' +
        '<h3>相关词条</h3>' +
        '<div class="related-grid" id="related-cards">' +
        relatedCards.map(card =>
          '<div class="related-card">' +
          '<div class="card-content">' +
          '<h4><a href="' + card.url + '" target="_blank">' + card.title + '</a></h4>' +
          '</div>' +
          '<p>' + card?.summary + '</p>' +
          '</div>'
        ).join('') +
        '</div>' +
        '</div>' : ''

      const cssLinks = this.options.includeCSS ?
        '<link rel="stylesheet" href="/assets/styles.css">' +
        '<link rel="stylesheet" href="/assets/article-hero.css">' +
        '<link rel="stylesheet" href="/assets/article-content.css">' : ''

      const timelineYears = (meta.timeline_years || []).map(year =>
        '<div class="timeline-dot">' + year.year + '</div>'
      ).join('')

      const tocItems = (content.sections || []).map(section =>
        '<li><a href="#' + section.title + '">' + section.title + '</a></li>'
      ).join('')

      const contentSections = (content.sections || []).map(section =>
        '<section id="' + section.title + '" class="content-section">' +
        '<h2>' + section.title + '</h2>' +
        '<p>' + (section.content || '').replace(/\n/g, '<br>') + '</p>' +
        '</section>'
      ).join('')

      const references = (content.references || []).map(ref =>
        '<li>' + ref + '</li>'
      ).join('')

      // 构建HTML文档 - 使用字符串拼接避免模板字符串问题
      let html = '<!DOCTYPE html>'
      html += '<html lang="zh-CN">'
      html += '<head>'
      html += '<meta charset="UTF-8">'
      html += '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
      html += '<title>' + title + ' - 知识库</title>'
      html += '<meta name="description" content="' + this.escapeHtml(meta.description || '') + '">'
      html += cssLinks
      const jsonLd = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        'headline': title,
        'description': meta.description || '',
        'datePublished': meta.date_published || '',
        'dateModified': meta.date_modified || '',
        'url': meta.url || ''
      })
      html += this.createScriptTag(jsonLd)
      html += '</head>'
      html += '<body>'
      html += '<div id="header-placeholder"></div>'

      // Hero section
      html += '<section class="article-hero">'
      html += '<div class="hero-container">'
      html += '<div class="hero-content">'
      html += '<div class="hero-badge">' + (meta.hero_badge || '') + '</div>'
      html += '<h1 class="hero-title">' + title + '</h1>'
      html += '<p class="hero-subtitle">' + (meta.hero_subtitle || '') + '</p>'
      html += '</div>'
      html += '<div class="hero-visual">'
      html += '<div class="hero-image">'
      html += '<div class="ai-timeline-preview" id="timeline-preview">'
      html += timelineYears
      html += '</div>'
      html += '</div>'
      html += '</div>'
      html += '</div>'
      html += '</section>'

      // Breadcrumb navigation
      html += '<nav class="breadcrumb-nav">'
      html += '<div class="breadcrumb-container">'
      html += '<ol class="breadcrumb-list">'
      html += '<li class="breadcrumb-item">'
      html += '<a href="/" class="breadcrumb-link">'
      html += '<span class="breadcrumb-icon">🏠</span>'
      html += '<span class="breadcrumb-text">首页</span>'
      html += '</a>'
      html += '</li>'
      html += '<li class="breadcrumb-separator">/</li>'
      html += '<li class="breadcrumb-item">'
      html += '<a href="/zh/' + (meta.breadcrumb_category || '') + '/" class="breadcrumb-link">'
      html += '<span class="breadcrumb-text">' + (meta.breadcrumb_category || '') + '</span>'
      html += '</a>'
      html += '</li>'
      html += '<li class="breadcrumb-separator">/</li>'
      html += '<li class="breadcrumb-item current">'
      html += '<span class="breadcrumb-icon">🖋️</span>'
      html += '<span class="breadcrumb-text">' + title + '</span>'
      html += '</li>'
      html += '</ol>'
      html += '</div>'
      html += '</nav>'

      // Main content
      html += '<div class="wiki-layout">'
      html += '<aside class="wiki-sidebar-left">'
      html += '<div class="toc">'
      html += '<h2>目录</h2>'
      html += '<ul id="toc-list">' + tocItems + '<li><a href="#references">参考文献</a></li></ul>'
      html += '</div>'
      html += '</aside>'
      html += '<main class="wiki-content">'
      html += '<div class="article-intro">'
      html += '<p id="intro-content">' + (content.intro || '') + '</p>'
      html += quickFactsHtml
      html += '</div>'
      html += '<div id="content-sections">' + contentSections + '</div>'
      html += '<h2 id="references">参考文献</h2>'
      html += '<div class="citations">'
      html += '<ol id="references-list">' + references + '</ol>'
      html += '</div>'
      html += externalLinksHtml
      html += '</main>'
      html += '<aside class="wiki-sidebar-right">'
      html += infoboxHtml
      html += relatedEntitiesHtml
      html += statsBoxHtml
      html += mapBoxHtml
      html += timelineHtml
      html += '</aside>'
      html += '</div>'
      html += relatedCardsHtml
      html += '<div id="footer-placeholder"></div>'

      // JavaScript - 完全避免在字符串中使用script标签
      const jsCode = this.generateJavaScript()
      html += this.createScriptTag(jsCode)
      html += '</body>'
      html += '</html>'

      return html
    },

    // 复制到剪贴板
    async copyToClipboard() {
      try {
        await navigator.clipboard.writeText(this.generatedHTML)
        this.showStatus('已复制到剪贴板!', 'success')
      } catch (error) {
        this.showStatus('复制失败', 'error')
      }
    },

    // 下载HTML文件
    downloadHTML() {
      const blob = new Blob([this.generatedHTML], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${this.filename}.html`
      a.click()
      URL.revokeObjectURL(url)
    },

    // 在新窗口预览
    previewInNewWindow() {
      const newWindow = window.open()
      newWindow.document.write(this.generatedHTML)
      newWindow.document.close()
    },

    // 下载文件
    downloadFile(content, filename) {
      const blob = new Blob([content], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    },

    // 显示状态信息
    showStatus(message, type = 'info') {
      this.status = { message, type }
      setTimeout(() => {
        this.status.message = ''
      }, 3000)
    },

    // 格式化信息框值
    formatInfoboxValue(value) {
      if (typeof value === 'string') {
        return this.escapeHtml(value)
      }
      if (Array.isArray(value)) {
        return value.map(item => this.escapeHtml(String(item))).join(', ')
      }
      return this.escapeHtml(String(value))
    },

    // HTML转义
    escapeHtml(text) {
      const div = document.createElement('div')
      div.textContent = text
      return div.innerHTML
    },

    // 生成JavaScript代码
    generateJavaScript() {
      return 'document.addEventListener("DOMContentLoaded", function() {' +
        'const links = document.querySelectorAll("a[href^=\\"#\\"]");' +
        'links.forEach(link => {' +
        'link.addEventListener("click", function(e) {' +
        'e.preventDefault();' +
        'const targetId = this.getAttribute("href").substring(1);' +
        'const targetElement = document.getElementById(targetId);' +
        'if (targetElement) {' +
        'targetElement.scrollIntoView({behavior: "smooth"});' +
        '}' +
        '});' +
        '});' +
        '});'
    },

    // 创建script标签
    createScriptTag(content) {
      const scriptOpen = '<' + 'script type="application/ld+json">'
      const scriptClose = '</' + 'script>'
      return scriptOpen + content + scriptClose
    }
  }
}
</script>

<style scoped>
.generate-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.container {
  background: white;
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
}

.input-section,
.options-section,
.batch-section,
.preview-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.json-input {
  width: 100%;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-family: 'Courier New', monospace;
  resize: vertical;
}

.file-upload {
  margin-top: 10px;
  display: flex;
  gap: 10px;
  align-items: center;
}

.file-upload input[type="file"] {
  display: none;
}

.options {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.options label {
  display: flex;
  align-items: center;
  gap: 5px;
}

.action-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-info {
  background: #17a2b8;
  color: white;
}

.btn-warning {
  background: #ffc107;
  color: black;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-sm {
  padding: 5px 10px;
  font-size: 12px;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.batch-list {
  max-height: 200px;
  overflow-y: auto;
}

.batch-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  margin-bottom: 5px;
}

.preview-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.html-preview {
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  padding: 15px;
  max-height: 400px;
  overflow-y: auto;
}

.html-preview pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.status {
  padding: 10px 15px;
  border-radius: 5px;
  margin-top: 10px;
}

.status.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.status.warning {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.status.info {
  background: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

@media (max-width: 768px) {
  .container {
    padding: 15px;
  }

  .action-buttons {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
