<template>
  <Teleport to="body">
    <div v-if="hasActiveTask" class="global-task-indicator" @click="toggleExpanded">
      <div class="indicator-header">
        <div class="task-info">
          <el-icon class="task-icon" :class="getTaskIconClass">
            <component :is="getTaskIcon" />
          </el-icon>
          <span class="task-text">{{ taskStatusText }}</span>
        </div>
        <div class="task-controls">
          <el-button type="danger" size="small" circle @click.stop="stopTask" :loading="taskStatus === 'stopping'">
            <el-icon>
              <Close />
            </el-icon>
          </el-button>
          <el-button type="info" size="small" circle @click.stop="toggleExpanded">
            <el-icon>
              <component :is="isExpanded ? 'ArrowUp' : 'ArrowDown'" />
            </el-icon>
          </el-button>
        </div>
      </div>

      <div v-if="isExpanded" class="indicator-details">

        <div v-if="extractedEntities.length > 0" class="entities-section">
          <div class="section-title">
            <el-icon>
              <Collection />
            </el-icon>
            实体 ({{ extractedEntities.length }})
          </div>
          <div class="entities-preview">
            <el-tag v-for="entity in extractedEntities.slice(0, 3)" :key="entity.id" size="small" class="entity-tag">
              {{ entity.name }}
            </el-tag>
            <span v-if="extractedEntities.length > 3" class="more-text">
              +{{ extractedEntities.length - 3 }} 更多
            </span>
          </div>
        </div>

        <div class="action-section">
          <el-button size="small" @click="goToArticlePage">
            <el-icon>
              <Edit />
            </el-icon>
            查看详情
          </el-button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useWebSocketTaskStore } from "@/store/modules/websocketTask";
import {
  Close,
  ArrowUp,
  ArrowDown,
  Collection,
  Edit,
  Loading,
  SuccessFilled,
  WarningFilled,
  CircleClose
} from "@element-plus/icons-vue";

const taskStore = useWebSocketTaskStore();
const router = useRouter();

const isExpanded = ref(false);

// 计算属性
const hasActiveTask = computed(() => taskStore.hasActiveTask);
const taskStatus = computed(() => taskStore.taskStatus);
const taskStatusText = computed(() => taskStore.taskStatusText);
const extractedEntities = computed(() => taskStore.extractedEntities);

const getTaskIcon = computed(() => {
  switch (taskStatus.value) {
    case 'running':
      return Loading;
    case 'completed':
      return SuccessFilled;
    case 'paused':
      return WarningFilled;
    case 'error':
    case 'stopping':
      return CircleClose;
    default:
      return Loading;
  }
});

const getTaskIconClass = computed(() => {
  switch (taskStatus.value) {
    case 'running':
      return 'rotating';
    case 'completed':
      return 'success';
    case 'paused':
      return 'warning';
    case 'error':
    case 'stopping':
      return 'error';
    default:
      return '';
  }
});


// 方法
function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
}


function stopTask() {
  taskStore.stopTask();
}

function goToArticlePage() {
  router.push('/generate/article');
  isExpanded.value = false;
}
</script>

<style scoped>
.global-task-indicator {
  position: fixed;
  top: 80px;
  right: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  border: 1px solid var(--el-border-color-light);
  min-width: 320px;
  max-width: 400px;
  z-index: 2000;
  cursor: pointer;
  transition: all 0.3s ease;
}

.global-task-indicator:hover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.indicator-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.task-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.task-icon {
  font-size: 16px;
}

.task-icon.rotating {
  animation: rotate 2s linear infinite;
  color: var(--el-color-primary);
}

.task-icon.success {
  color: var(--el-color-success);
}

.task-icon.warning {
  color: var(--el-color-warning);
}

.task-icon.error {
  color: var(--el-color-danger);
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.task-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.task-controls {
  display: flex;
  gap: 4px;
}

.indicator-details {
  padding: 16px;
  background: var(--el-bg-color-page);
}


.entities-section {
  margin-bottom: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 8px;
}

.entities-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.entity-tag {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-text {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.action-section {
  text-align: right;
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .global-task-indicator {
    background: var(--el-bg-color);
    border-color: var(--el-border-color);
  }

  .indicator-details {
    background: var(--el-bg-color-overlay);
  }
}

/* 响应式适配 */
@media (max-width: 768px) {
  .global-task-indicator {
    right: 10px;
    min-width: 280px;
    max-width: calc(100vw - 20px);
  }

  .indicator-header {
    padding: 10px 12px;
  }

  .indicator-details {
    padding: 12px;
  }
}
</style>
