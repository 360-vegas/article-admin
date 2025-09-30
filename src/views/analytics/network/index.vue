<template>
  <div class="p-4">
    <el-card shadow="never" :body-style="{ padding: '0' }">
      <div class="p-3">
        <el-space wrap>
          <el-button size="small" :type="selectedCategory === null ? 'primary' : 'default'"
            @click="selectCategory(null)">全部</el-button>
          <el-button v-for="c in categories" :key="c.value" size="small"
            :type="selectedCategory === c.value ? 'primary' : 'default'" @click="selectCategory(c.value)">{{ c.label
            }}</el-button>
        </el-space>
      </div>
      <div ref="chartRef" style="width: 100%; height: 70vh;"></div>
    </el-card>
  </div>

</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from "vue";
import { useWindowSize } from "@vueuse/core";
import echarts from "@/plugins/echarts";
import { listCategories, type Category } from "@/api/categories";

const chartRef = ref<HTMLDivElement | null>(null);
let chart: any = null;
const selectedCategory = ref<number | null>(null);
const categories = ref<Array<{ label: string; value: number; id?: string | number }>>([]);

// 原始数据缓存
let baseData: Array<any> = [];
let baseEdges: Array<any> = [];

function initChart() {
  if (!chartRef.value) return;
  chart = echarts.init(chartRef.value);
  const option = getOption();
  chart.setOption(option);
}

function getOption() {
  // 初始使用现有的 baseData/baseEdges（可能为空，稍后由接口填充）
  if (!baseData.length) {
    // 兜底：若接口未返回，生成少量示例，避免空白
    const data = Array.from({ length: 12 }).map((_, idx) => ({
      id: String(idx),
      name: idx === 0 ? "root" : `n-${idx}`,
      symbolSize: idx === 0 ? 28 : 12,
      category: categories.value.length ? idx % categories.value.length : 0
    }));
    const edges = Array.from({ length: 16 }).map(() => {
      const s = Math.floor(Math.random() * data.length);
      let t = Math.floor(Math.random() * data.length);
      if (s === t) t = (t + 1) % data.length;
      return { source: String(s), target: String(t) };
    });
    baseData = data;
    baseEdges = edges;
  }

  const option = {
    series: [
      {
        type: "graph",
        layout: "force",
        animation: false,
        data: applyCategoryStyle(baseData, selectedCategory.value),
        force: {
          // initLayout: 'circular'
          // gravity: 0
          repulsion: 100,
          edgeLength: 5
        },
        edges: applyEdgeStyle(baseEdges, selectedCategory.value),
        categories: categories.value.map(c => ({ name: c.label })),
        roam: true,
        label: { show: true, position: "right" }
      }
    ]
  };

  return option;
}

function applyCategoryStyle(data: Array<any>, cat: number | null) {
  if (cat === null) return data;
  return data.map(d => ({
    ...d,
    itemStyle: { opacity: d.category === cat ? 1 : 0.15 },
    label: { show: d.category === cat }
  }));
}

function applyEdgeStyle(edges: Array<any>, cat: number | null) {
  if (cat === null) return edges;
  return edges.map(e => {
    const s = baseData[Number(e.source)];
    const t = baseData[Number(e.target)];
    const visible = s?.category === cat || t?.category === cat;
    return { ...e, lineStyle: { opacity: visible ? 0.9 : 0.1 } };
  });
}

function redraw() {
  if (!chart) return;
  chart.setOption({
    series: [
      {
        data: applyCategoryStyle(baseData, selectedCategory.value),
        edges: applyEdgeStyle(baseEdges, selectedCategory.value)
      }
    ]
  });
}

function selectCategory(cat: number | null) {
  selectedCategory.value = cat;
  redraw();
}

// 加载分类树并转为图数据：根作为按钮，根-子 为边
async function loadCategoryTreeAndBuildGraph() {
  try {
    const res = await listCategories({ size: 100 });
    let items: any = [];
    if (Array.isArray(res)) items = res;
    else if ((res as any)?.items) items = (res as any).items;
    const roots = Array.isArray(items) ? items : [];
    categories.value = roots.map((r: Category, idx: number) => ({ label: r.name, value: idx, id: r.id }));

    const data: Array<any> = [];
    const edges: Array<any> = [];
    const topIdToIndex: Record<string, number> = {};
    categories.value.forEach(c => { if (c.id != null) topIdToIndex[String(c.id)] = c.value; });

    const pushNode = (id: string | number, name: string, categoryIndex: number, isRoot = false) => {
      data.push({ id: String(id), name, category: categoryIndex, symbolSize: isRoot ? 26 : 14 });
    };

    for (const r of roots) {
      const rootIndex = topIdToIndex[String(r.id)] ?? 0;
      pushNode(r.id, r.name, rootIndex, true);
      const children: Category[] = (r as any).children || [];
      for (const ch of children) {
        pushNode(ch.id, ch.name, rootIndex, false);
        edges.push({ source: String(r.id), target: String(ch.id) });
      }
    }

    baseData = data;
    baseEdges = edges;
  } catch (e) {
    // 如果接口失败，维持现有演示数据
    if (!categories.value.length) {
      categories.value = [
        { label: "类型A", value: 0 },
        { label: "类型B", value: 1 },
        { label: "类型C", value: 2 }
      ];
    }
  }
}

onMounted(async () => {
  await nextTick();
  initChart();
  // 确保首次渲染尺寸正确
  if (chart) chart.resize();
  await loadCategoryTreeAndBuildGraph();
  redraw();
});

const { width, height } = useWindowSize();
watch([width, height], () => {
  if (chart) chart.resize();
});

onBeforeUnmount(() => {
  if (chart) {
    chart.dispose();
    chart = null;
  }
});
</script>

<style scoped></style>
