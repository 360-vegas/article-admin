<template>
  <div class="wiki-template">
    <!-- 头部信息 -->
    <header class="header">
      <div class="hero-badge">{{ meta.hero_badge }}</div>
      <h1>{{ title }}</h1>
      <p class="hero-subtitle">{{ meta.hero_subtitle }}</p>
      <div class="breadcrumb">
        <span>{{ meta.breadcrumb_category }}</span> / <span>{{ title }}</span>
      </div>
      <div class="meta-info">
        <span>发布日期: {{ meta.date_published }}</span>
        <span>最后修改: {{ meta.date_modified }}</span>
      </div>
    </header>

    <!-- 主要内容区 -->
    <div class="main-content">
      <!-- 目录导航 -->
      <nav class="toc">
        <h2>目录</h2>
        <ul>
          <li><a @click="navigateToSection('intro')">简介</a></li>
          <li v-for="(section, index) in content.sections" :key="index">
            <a @click="navigateToSection('section-' + index)">{{ section.title }}</a>
          </li>
        </ul>
      </nav>

      <!-- 内容区域 -->
      <div class="content-area">
        <!-- 信息框 -->
        <div class="infobox" v-if="infobox">
          <h3 class="infobox-title">{{ infobox.type_label }}</h3>
          <table class="infobox-table">
            <tr v-for="(field, index) in infobox.fields" :key="index">
              <td class="infobox-label">{{ field.label }}</td>
              <td class="infobox-value">{{ field.value }}</td>
            </tr>
          </table>
        </div>

        <!-- 简介 -->
        <section id="intro" class="content-section">
          <div class="section-content" v-html="parseMarkdown(content.intro)"></div>
        </section>

        <!-- 章节内容 -->
        <section v-for="(section, index) in content.sections" :key="index" :id="'section-' + index"
          class="content-section">
          <h2 class="section-title">{{ section.title }}</h2>
          <div class="section-content" v-html="parseMarkdown(section.content)"></div>
        </section>

        <!-- 参考文献 -->
        <section v-if="content.references && content.references.length" class="references-section">
          <h2 class="section-title">参考文献</h2>
          <ol class="references-list">
            <li v-for="(ref, index) in content.references" :key="index">{{ ref }}</li>
          </ol>
        </section>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-section" v-if="stats && stats.length">
      <h2 class="section-title">统计信息</h2>
      <div class="stats-grid">
        <div v-for="(stat, index) in stats" :key="index" class="stat-card">
          <strong>{{ stat.label }}</strong>
          <p>{{ stat.value }}</p>
        </div>
      </div>
    </div>

    <!-- 相关内容 -->
    <div class="related-content">
      <!-- 相关地点 -->
      <div v-if="map_places && map_places.length" class="related-section">
        <h2 class="section-title">相关地点</h2>
        <div class="related-list">
          <a v-for="(place, index) in map_places" :key="index" @click="openNewTab(place.url)" class="related-item">
            {{ place.title }}
          </a>
        </div>
      </div>

      <!-- 相关词条 -->
      <div v-if="related_cards && related_cards.length" class="related-section">
        <h2 class="section-title">相关词条</h2>
        <div class="related-cards">
          <div v-for="(card, index) in related_cards" :key="index" class="related-card">
            <h3 @click="openNewTab(card.url)">{{ card.title }}</h3>
            <p>{{ card.summary }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import markdownit from 'markdown-it';

export default {
  name: 'FighterJetWikiTemplate',
  props: {
    data: {
      type: Object,
      required: true,
      validator: (value) => {
        return 'title' in value && 'content' in value && 'meta' in value;
      }
    }
  },
  data() {
    return {
      md: new markdownit()
    };
  },
  computed: {
    title() {
      return this.data.title || '';
    },
    meta() {
      return this.data.meta || {};
    },
    infobox() {
      return this.data.infobox || null;
    },
    content() {
      return this.data.content || { sections: [], intro: '' };
    },
    stats() {
      return this.data.stats || [];
    },
    map_places() {
      return this.data.map_places || [];
    },
    related_cards() {
      return this.data.related_cards || [];
    }
  },
  methods: {
    parseMarkdown(text) {
      return this.md.render(text || '');
    },
    navigateToSection(id) {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    },
    openNewTab(url) {
      if (url) {
        window.open(url, '_blank');
      }
    }
  }
};
</script>

<style scoped>
/* 基础样式 */
.wiki-template {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
  color: #333;
  line-height: 1.6;
}

/* 头部样式 */
.header {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.hero-badge {
  display: inline-block;
  padding: 5px 10px;
  background-color: #f0f0f0;
  border-radius: 4px;
  margin-bottom: 10px;
  font-weight: bold;
}

.header h1 {
  font-size: 2.2rem;
  margin: 0 0 10px 0;
  color: #2c3e50;
}

.hero-subtitle {
  font-size: 1.3rem;
  color: #666;
  margin-bottom: 15px;
}

.breadcrumb {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 10px;
}

.meta-info {
  font-size: 0.9rem;
  color: #999;
  display: flex;
  gap: 20px;
}

/* 主要内容区 */
.main-content {
  display: flex;
  gap: 30px;
  margin-bottom: 40px;
}

/* 目录样式 */
.toc {
  min-width: 250px;
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  position: sticky;
  top: 20px;
  align-self: flex-start;
}

.toc h2 {
  font-size: 1.2rem;
  margin-top: 0;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ddd;
}

.toc ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc li {
  margin-bottom: 8px;
}

.toc a {
  color: #333;
  text-decoration: none;
  padding: 5px 8px;
  display: block;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.toc a:hover {
  background-color: #e0e0e0;
}

/* 内容区域 */
.content-area {
  flex: 1;
}

/* 信息框样式 */
.infobox {
  float: right;
  width: 300px;
  margin: 0 0 20px 20px;
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.infobox-title {
  background: #f0f0f0;
  margin: 0;
  padding: 10px 15px;
  font-size: 1.1rem;
  border-bottom: 1px solid #e0e0e0;
}

.infobox-table {
  width: 100%;
  border-collapse: collapse;
}

.infobox-label {
  padding: 8px 15px;
  font-weight: bold;
  vertical-align: top;
  border-bottom: 1px solid #e0e0e0;
  width: 40%;
}

.infobox-value {
  padding: 8px 15px;
  vertical-align: top;
  border-bottom: 1px solid #e0e0e0;
}

/* 章节样式 */
.content-section {
  margin-bottom: 40px;
}

.section-title {
  font-size: 1.8rem;
  color: #2c3e50;
  margin-top: 0;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #f1f1f1;
}

.section-content {
  line-height: 1.7;
}

.section-content p {
  margin-bottom: 15px;
}

.section-content h3 {
  font-size: 1.4rem;
  margin-top: 25px;
  margin-bottom: 15px;
}

/* 参考文献 */
.references-section {
  margin-top: 50px;
}

.references-list {
  padding-left: 20px;
}

.references-list li {
  margin-bottom: 10px;
}

/* 统计信息 */
.stats-section {
  margin-bottom: 40px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.stat-card {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 相关内容 */
.related-content {
  margin-bottom: 40px;
}

.related-section {
  margin-bottom: 30px;
}

.related-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.related-item {
  display: inline-block;
  padding: 8px 15px;
  background: #f0f0f0;
  border-radius: 20px;
  color: #333;
  text-decoration: none;
  font-size: 0.9rem;
}

.related-item:hover {
  background: #e0e0e0;
}

.related-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.related-card {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.related-card:hover {
  transform: translateY(-5px);
}

.related-card h3 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #007bff;
  cursor: pointer;
}

.related-card p {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
}

/* 响应式设计 */
@media (max-width: 992px) {
  .main-content {
    flex-direction: column;
  }

  .toc {
    position: static;
    margin-bottom: 30px;
  }

  .infobox {
    float: none;
    width: 100%;
    margin: 0 0 30px 0;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .related-cards {
    grid-template-columns: 1fr;
  }
}
</style>