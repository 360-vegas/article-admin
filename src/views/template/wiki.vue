<template>
  <div class="main">
    <el-card shadow="never" class="full-card">
      <template #header>
        <div class="card-header flex-bc header-controls">
          <div class="title-wrap">
            <h1 class="page-title">東京大学（The University of Tokyo）</h1>
            <div class="sub-info">
              <el-tag size="small" type="success">1877年创建</el-tag>
              <el-tag size="small" type="info">日本 · 东京</el-tag>
            </div>
          </div>
          <div class="header-actions">
            <el-input v-model="keyword" placeholder="在本页查找" clearable class="search-input" />
          </div>
        </div>
      </template>

      <div class="wiki-body">
        <!-- 侧边目录 -->
        <aside class="toc">
          <div class="toc-card">
            <div class="toc-header">目录</div>
            <ul>
              <li v-for="s in sections" :key="s.id" :class="{ active: activeId === s.id }" @click="scrollTo(s.id)">
                {{ s.title }}
              </li>
            </ul>
          </div>
        </aside>

        <!-- 主体内容 -->
        <section class="content" ref="contentRef">
          <!-- 顶部信息卡片 -->
          <div class="hero">
            <div class="hero-left">
              <h2>简介</h2>
              <p>
                東京大学（UTokyo）是日本顶尖综合研究型大学之一，致力于推动基础与应用研究、培育具备全球视野的创新人才。
              </p>
              <div class="hero-meta">
                <div class="meta-item">
                  <div class="meta-label">建校</div>
                  <div class="meta-value">1877年</div>
                </div>
                <div class="meta-item">
                  <div class="meta-label">类型</div>
                  <div class="meta-value">国立 · 研究型</div>
                </div>
                <div class="meta-item">
                  <div class="meta-label">所在地</div>
                  <div class="meta-value">日本 · 东京都</div>
                </div>
              </div>
            </div>
            <div class="hero-right">
              <div class="stat-card" v-for="stat in stats" :key="stat.label">
                <div class="stat-label">{{ stat.label }}</div>
                <div class="stat-value">{{ stat.value }}</div>
                <div class="stat-desc">{{ stat.desc }}</div>
              </div>
            </div>
          </div>

          <!-- 信息章节 -->
          <article v-for="s in sections" :key="s.id" :id="s.id" class="section-card">
            <h3 class="section-title">{{ s.title }}</h3>
            <div v-if="s.id === 'history'" class="timeline">
              <div class="timeline-item" v-for="t in timeline" :key="t.year">
                <div class="dot"></div>
                <div class="timeline-content">
                  <div class="timeline-year">{{ t.year }}</div>
                  <div class="timeline-text">{{ t.text }}</div>
                </div>
              </div>
            </div>
            <template v-else-if="s.id === 'principles'">
              <div class="grid-2">
                <div class="feature" v-for="f in principles" :key="f.title">
                  <div class="feature-icon">✓</div>
                  <div class="feature-body">
                    <div class="feature-title">{{ f.title }}</div>
                    <div class="feature-desc">{{ f.desc }}</div>
                  </div>
                </div>
              </div>
            </template>
            <template v-else-if="s.id === 'alumni'">
              <div class="quote">
                <div class="quote-mark">“</div>
                <div class="quote-body">
                  <p>久元喜造等众多校友在公共管理、科技与产业领域做出重要贡献，持续影响社会发展。</p>
                  <div class="quote-footer">— 校友影响力概览</div>
                </div>
              </div>
            </template>
            <template v-else-if="s.id === 'impact'">
              <ul class="list">
                <li>科研成果覆盖信息技术、生命科学、材料工程等关键学科。</li>
                <li>与产业界深度合作，促进技术转化与社会创新。</li>
                <li>国际化项目推动学术交流与人才流动。</li>
              </ul>
            </template>
            <template v-else-if="s.id === 'debate'">
              <el-alert type="warning" show-icon :closable="false" title="挑战与展望"
                description="在全球高教竞争中，需持续优化教学质量、扩大国际合作，强化跨学科与开放科学。" />
            </template>
            <template v-else-if="s.id === 'links'">
              <div class="links">
                <div class="link-chip" v-for="k in keywords" :key="k"># {{ k }}</div>
                <div class="ref">
                  参考模板风格：
                  <a href="https://wiki.czo.vn/vi/%E6%9D%B1%E4%BA%AC%E5%A4%A7%E5%AD%A6/" target="_blank">东京大学条目</a>
                </div>
              </div>
            </template>
            <template v-else>
              <p>{{ s.content }}</p>
            </template>
          </article>
        </section>
      </div>
    </el-card>
  </div>

</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

defineOptions({ name: "WikiTemplate" });

const keyword = ref("");
const activeId = ref("intro");
const contentRef = ref<HTMLElement | null>(null);

const sections = ref([
  { id: "intro", title: "介绍", content: "東京大学以学术自由与社会贡献为核心，形成多校区、跨学科的研究生态。" },
  { id: "history", title: "历史与里程碑" },
  { id: "principles", title: "核心理念" },
  { id: "alumni", title: "代表校友与贡献" },
  { id: "impact", title: "应用与影响" },
  { id: "debate", title: "争议与展望" },
  { id: "links", title: "相关与外链" }
]);

const timeline = ref([
  { year: "1877", text: "创建，现代高等教育体系起步。" },
  { year: "1949", text: "战后改革，重构学科与治理架构。" },
  { year: "1964", text: "参与国际合作研究，影响力显著提升。" },
  { year: "2004", text: "课程与组织改革，强化产学研协同。" },
  { year: "2020", text: "全球研究网络深化，面向可持续发展。" }
]);

const principles = ref([
  { title: "学术与实践融合", desc: "强调理论探究与社会实践相互促进。" },
  { title: "批判与创新思维", desc: "鼓励独立思考、跨界创新与问题导向。" },
  { title: "全球视野", desc: "以开放合作促进知识共创与人才流动。" }
]);

const stats = ref([
  { label: "世界排名", value: "Top 25", desc: "综合类（示意）" },
  { label: "学生规模", value: "28k+", desc: "含研博（示意）" },
  { label: "学术论文", value: "200k+", desc: "累计（示意）" }
]);

const keywords = ref(["ASEAN", "国际合作", "可持续发展", "开放科学", "技术转化"]);

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    activeId.value = id;
  }
}

function handleScroll() {
  if (!contentRef.value) return;
  const rects = sections.value.map(s => {
    const el = document.getElementById(s.id);
    return el ? { id: s.id, top: el.getBoundingClientRect().top } : null;
  }).filter(Boolean) as { id: string; top: number }[];
  const threshold = 120; // 顶部偏移
  let current = activeId.value;
  for (const r of rects) {
    if (r.top >= threshold && r.top < window.innerHeight / 2) {
      current = r.id;
      break;
    }
    if (r.top < threshold) current = r.id;
  }
  activeId.value = current;
}

onMounted(() => {
  window.addEventListener("scroll", handleScroll, { passive: true });
});
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

::deep(.el-card__body) {
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

.title-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
}

.sub-info {
  display: flex;
  gap: 8px;
}

.search-input {
  width: 220px;
}

.wiki-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 16px;
  padding: 16px;
}

.toc-card {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: #fafbfc;
  padding: 12px;
  position: sticky;
  top: 12px;
}

.toc-header {
  font-weight: 600;
  margin-bottom: 8px;
}

.toc ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc li {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
}

.toc li:hover {
  background: #eef5ff;
}

.toc li.active {
  background: rgba(64, 158, 255, .12);
  color: var(--el-color-primary);
  font-weight: 600;
}

.content {
  overflow: auto;
  padding-right: 8px;
}

.hero {
  display: grid;
  grid-template-columns: 1.2fr .8fr;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background: linear-gradient(180deg, #fff, #fafbfc);
}

.hero-meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 12px;
}

.meta-item {
  background: #fff;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 12px;
}

.meta-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.meta-value {
  font-weight: 600;
  margin-top: 4px;
}

.stat-card {
  background: #1f69ff;
  color: #fff;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, .08);
}

.stat-label {
  font-size: 12px;
  opacity: .9;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
}

.stat-desc {
  font-size: 12px;
  opacity: .9;
}

.section-card {
  margin-top: 20px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background: #fff;
  padding: 18px;
}

.section-title {
  margin: 0 0 10px 0;
  font-size: 18px;
  font-weight: 600;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timeline-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.dot {
  width: 12px;
  height: 12px;
  background: #28a745;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}

.timeline-content {
  border-left: 2px solid #e9ecef;
  padding-left: 12px;
}

.timeline-year {
  font-weight: 700;
}

.timeline-text {
  color: var(--el-text-color-regular);
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.feature {
  display: flex;
  gap: 12px;
  background: #f8f9fa;
  border: 1px solid var(--el-border-color);
  border-radius: 10px;
  padding: 12px;
}

.feature-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #28a745;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.feature-title {
  font-weight: 600;
}

.feature-desc {
  color: var(--el-text-color-regular);
}

.quote {
  display: flex;
  gap: 12px;
  background: #fff9e6;
  border: 1px solid #ffe8a3;
  border-left: 4px solid #ffc107;
  border-radius: 8px;
  padding: 14px;
}

.quote-mark {
  font-size: 28px;
  color: #ffc107;
  line-height: 1;
}

.quote-footer {
  color: #a37c00;
  font-size: 12px;
  margin-top: 4px;
}

.list {
  padding-left: 18px;
}

.list li {
  line-height: 1.9;
}

.links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.link-chip {
  border: 1px dashed var(--el-border-color);
  padding: 6px 10px;
  border-radius: 999px;
  background: #fff;
}

.ref {
  color: var(--el-text-color-secondary);
  margin-left: 8px;
}

.ref a {
  color: var(--el-color-primary);
  text-decoration: none;
}
</style>
