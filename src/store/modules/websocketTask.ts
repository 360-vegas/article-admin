import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import type { BatchCopyWebSocketRequest, BatchCopyWebSocketResponse } from "@/api/generation";

export const useWebSocketTaskStore = defineStore("websocketTask", () => {
  // WebSocket连接
  const ws = ref<WebSocket | null>(null);
  const wsConnected = ref(false);
  const reconnectAttempts = ref(0);
  const maxReconnectAttempts = 5;

  // 任务状态
  const taskRunning = ref(false);
  const taskId = ref("");
  const queueId = ref("");
  const taskProgress = ref(0);
  const taskStatus = ref("idle"); // idle, running, paused, completed, error, stopping
  const taskStats = ref({
    total: 0,
    completed: 0,
    failed: 0,
    remaining: 0
  });

  // 任务配置
  const taskConfig = ref({
    maxEntities: 20
  });

  // 数据存储
  const extractedEntities = ref<any[]>([]);
  const generatedArticles = ref<any[]>([]);
  const currentContent = ref("");

  // 消息处理器注册
  const messageHandlers = ref<Array<(data: any) => void>>([]);

  // WebSocket连接
  function initWebSocket() {
    if (ws.value && wsConnected.value) {
      console.log('WebSocket已经连接');
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/v1/generation/batchCopy`;

      // 关闭之前的连接
      if (ws.value) {
        ws.value.close();
        ws.value = null;
      }

      ws.value = new WebSocket(wsUrl);

      const connectionTimeout = setTimeout(() => {
        if (ws.value && ws.value.readyState === WebSocket.CONNECTING) {
          ws.value.close();
        }
      }, 10000);

      ws.value.onopen = () => {
        clearTimeout(connectionTimeout);
        wsConnected.value = true;
        reconnectAttempts.value = 0;
        ElMessage.success('WebSocket连接成功');

        // 发送连接测试消息
        sendMessage({
          type: 'connection_test',
          timestamp: Date.now(),
          client_info: {
            userAgent: navigator.userAgent,
            url: window.location.href
          }
        });
      };

      ws.value.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('解析消息失败:', event.data);
        }
      };

      ws.value.onclose = (event) => {
        clearTimeout(connectionTimeout);
        wsConnected.value = false;

        // 如果不是正常关闭且未达到最大重连次数，尝试重连
        if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts.value < maxReconnectAttempts) {
          reconnectAttempts.value++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.value), 30000);

          setTimeout(() => {
            initWebSocket();
          }, delay);
        } else if (reconnectAttempts.value >= maxReconnectAttempts) {
          ElMessage.error('WebSocket连接失败，请检查网络或刷新页面重试');
        } else {
          ElMessage.info('WebSocket连接已断开');
        }
      };

      ws.value.onerror = (error) => {
        clearTimeout(connectionTimeout);
        wsConnected.value = false;
      };

    } catch (error) {
      ElMessage.error('无法创建WebSocket连接');
    }
  }

  // 发送WebSocket消息
  function sendMessage(message: any) {
    if (ws.value && wsConnected.value) {
      ws.value.send(JSON.stringify(message));
      return true;
    } else {
      ElMessage.error('WebSocket未连接');
      return false;
    }
  }

  // 处理WebSocket消息
  function handleWebSocketMessage(data: any) {
    const channel = data.channel;
    const messageType = data.type;

    // 通知所有注册的消息处理器
    messageHandlers.value.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error('消息处理器执行失败:', error);
      }
    });

    switch (channel) {
      case 'entities':
        if ((messageType === 'entities_extracted' || messageType === 'new_entities_extracted') && data.data && data.data.entities) {
          const entities = data.data.entities;
          entities.forEach((entity: any) => {
            const newEntity = {
              id: entity.id,
              name: entity.name,
              type: entity.type,
              description: entity.description,
              short_description: entity.short_description,
              category_name: entity.category_name,
              category_id: entity.category_id,
              is_verified: entity.is_verified,
              confidence: entity.confidence || entity.confidence_score,
              slug: entity.slug,
              lang: entity.lang,
              country_code: entity.country_code,
              aliases: entity.aliases,
              processed: entity.processed,
              created_at: entity.created_at,
              updated_at: entity.updated_at,
              createdAt: entity.created_at || new Date().toISOString()
            };
            extractedEntities.value.push(newEntity);
          });
          const isNewRound = !!data.data.is_new_round;
          const tip = messageType === 'new_entities_extracted' ? '新增提取' : '成功提取';
          ElMessage.success(`${tip} ${entities.length} 个实体${isNewRound ? '（新一轮）' : ''}`);
          saveTaskState();
        }
        break;

      case 'articles':
        if (messageType === 'status') {
          if (data.message === 'Batch copy generation started') {
            if (data.data?.queue_id) {
              queueId.value = data.data.queue_id;
              console.log('收到队列ID:', data.data.queue_id);
            }
            taskRunning.value = true;
            taskStatus.value = "running";
            ElMessage.success('批量生成任务已启动');
          } else if (data.message?.includes('paused')) {
            taskStatus.value = "paused";
            ElMessage.info('任务已暂停');
          } else if (data.message?.includes('resumed')) {
            taskStatus.value = "running";
            ElMessage.info('任务已恢复');
          } else if (data.message?.includes('stopped')) {
            console.log('收到后端停止确认');
            cleanupAfterStop();
          } else if (data.message?.includes('completed')) {
            taskRunning.value = false;
            taskStatus.value = "completed";
            ElMessage.success('批量生成任务已完成！');
          }
        } else if (messageType === 'article_generated' && data.data) {
          const article = data.data.article || data.data;
          if (article.content) {
            currentContent.value = article.content;
          }
          ElMessage.success(`文章生成成功: ${article.title || '新文章'}`);
          saveTaskState();
        } else if (messageType === 'articles_batch' && data.data && data.data.articles) {
          const articles = data.data.articles;
          articles.forEach((article: any) => {
            if (article.content) {
              currentContent.value = article.content;
            }
          });
          ElMessage.success(`批量生成 ${articles.length} 篇文章`);
          saveTaskState();
        } else if (messageType === 'batch_completed' && data.data && data.data.articles) {
          const articles = data.data.articles;
          articles.forEach((article: any) => {
            if (article.content) {
              currentContent.value = article.content;
            }
          });
          ElMessage.success(`批量生成 ${articles.length} 篇文章`);
          saveTaskState();
        }
        break;

      case 'task':
      case 'system':
        if (messageType === 'task_started' || messageType === 'batch_copy_started') {
          if (data.data?.task_id || data.data?.taskId) {
            taskId.value = data.data.task_id || data.data.taskId;
          }
          if (data.data?.queue_id || data.data?.queueId) {
            queueId.value = data.data.queue_id || data.data.queueId;
          } else if (taskId.value && !queueId.value) {
            queueId.value = taskId.value;
          }
          taskRunning.value = true;
          taskStatus.value = "running";
          ElMessage.success('批量生成任务已启动');
          saveTaskState();
        } else if (messageType === 'task_error' || messageType === 'batch_copy_error') {
          ElMessage.error(data.message || '任务执行失败');
          if (data.data?.fatal) {
            taskRunning.value = false;
            taskStatus.value = "idle";
          }
        }
        break;

      case 'error':
        ElMessage.error(data.message || '操作失败');
        if (data.data?.fatal || data.fatal) {
          taskRunning.value = false;
          taskStatus.value = "idle";
        }
        break;

      case 'log':
      case 'info':
        // 静默处理
        break;

      default:
        if (!channel && messageType) {
          switch (messageType) {
            case 'connection_test':
            case 'ping':
            case 'pong':
              break;
            case 'start_batch_copy':
            case 'batch_copy_response':
              if (data.success !== false) {
                if (data.taskId || data.task_id) {
                  taskId.value = data.taskId || data.task_id;
                }
                taskRunning.value = true;
                taskStatus.value = "running";
              } else {
                ElMessage.error(data.message || '批量生成启动失败');
                taskRunning.value = false;
                taskStatus.value = "idle";
              }
              break;
          }
        }
        break;
    }
  }

  // 注册消息处理器
  function registerMessageHandler(handler: (data: any) => void) {
    messageHandlers.value.push(handler);
    return () => {
      const index = messageHandlers.value.indexOf(handler);
      if (index > -1) {
        messageHandlers.value.splice(index, 1);
      }
    };
  }

  // 开始任务
  function startTask(config: {
    urlInput: string;
    entityNameInput: string;
    maxEntities: number;
    preset_codes?: string[];
    template_id?: string;
    // 以下为按词条名称生成时的可选参数
    lang?: string; // e.g. 'zh'
    country_code?: string; // e.g. 'CN'
    filters?: {
      only?: { types?: string[] };
      min_score?: number;
    };
    return_related?: boolean; // 是否预先返回相关词条列表
  }) {
    const hasUrl = config.urlInput.trim();
    const hasEntity = config.entityNameInput.trim();

    if (!hasUrl && !hasEntity) {
      ElMessage.warning("请先输入URL或词条名称");
      return false;
    }

    if (!wsConnected.value) {
      ElMessage.error('请先连接WebSocket');
      return false;
    }

    // 更新配置
    taskConfig.value.maxEntities = config.maxEntities;

    taskRunning.value = true;
    taskStatus.value = "running";

    const batchCopyRequest = {
      type: 'start_batch_copy',
      data: {
        url: hasUrl ? config.urlInput : undefined,
        entity_name: hasEntity ? config.entityNameInput : undefined,
        max_entities: config.maxEntities,
        preset_codes: config.preset_codes || [],
        template_id: config.template_id,
        // 仅在存在词条名称的场景下，按图示参数透传/设置默认
        lang: hasEntity ? (config.lang || 'zh') : undefined,
        country_code: hasEntity ? (config.country_code || 'CN') : undefined,
        filters: hasEntity
          ? (config.filters || { only: { types: ['person', 'concept'] }, min_score: 0.2 })
          : undefined,
        return_related: hasEntity ? (config.return_related ?? true) : undefined
      }
    };

    const success = sendMessage(batchCopyRequest);

    if (success) {
      // 清空之前的数据
      extractedEntities.value = [];
      taskProgress.value = 0;
      taskStats.value = { total: 0, completed: 0, failed: 0, remaining: 0 };

      let message = '批量生成任务已启动';
      if (hasUrl && hasEntity) {
        message += ` - 基于URL: ${config.urlInput} 和词条: ${config.entityNameInput}`;
      } else if (hasUrl) {
        message += ` - 基于URL: ${config.urlInput}`;
      } else if (hasEntity) {
        message += ` - 基于词条: ${config.entityNameInput}`;
      }

      ElMessage.info(message);
      saveTaskState();
    }

    return success;
  }

  // 暂停任务
  function pauseTask() {
    const targetId = queueId.value || taskId.value;

    if (!targetId) {
      ElMessage.error('队列ID和任务ID都不存在，无法暂停。请确保任务已正确启动。');
      return false;
    }

    const pauseRequest = {
      type: 'pause',
      queue_id: targetId
    };

    const success = sendMessage(pauseRequest);
    if (success) {
      taskStatus.value = "paused";
      ElMessage.info(`已发送暂停请求 (ID: ${targetId})`);
      saveTaskState();
    }
    return success;
  }

  // 恢复任务
  function resumeTask() {
    const targetId = queueId.value || taskId.value;

    if (!targetId) {
      ElMessage.error('队列ID和任务ID都不存在，无法恢复。请确保任务已正确启动。');
      return false;
    }

    const resumeRequest = {
      type: 'resume',
      queue_id: targetId
    };

    const success = sendMessage(resumeRequest);
    if (success) {
      taskStatus.value = "running";
      ElMessage.info(`已发送恢复请求 (ID: ${targetId})`);
      saveTaskState();
    }
    return success;
  }

  // 停止任务
  function stopTask() {
    const targetId = queueId.value || taskId.value;

    if (!targetId) {
      ElMessage.warning('队列ID和任务ID都不存在，将直接清理本地状态');
      cleanupAfterStop();
      return true;
    }

    taskStatus.value = "stopping";
    ElMessage.info('正在停止任务...');

    const stopRequest = {
      type: 'stop',
      queue_id: targetId
    };

    const success = sendMessage(stopRequest);

    // 设置超时保护
    setTimeout(() => {
      if (taskStatus.value === "stopping") {
        console.warn('停止请求超时，强制清理本地状态');
        ElMessage.warning('停止请求超时，已强制清理本地状态');
        cleanupAfterStop();
      }
    }, 3000);

    return success;
  }

  // 清理停止后的状态
  function cleanupAfterStop() {
    taskRunning.value = false;
    taskStatus.value = "idle";
    taskProgress.value = 0;
    taskStats.value = { total: 0, completed: 0, failed: 0, remaining: 0 };
    taskId.value = "";
    queueId.value = "";

    extractedEntities.value = [];
    generatedArticles.value = [];
    currentContent.value = "";

    // 清理持久化数据
    clearTaskState();

    ElMessage.success('任务已停止，状态已清理');
  }

  // 持久化相关
  const STORAGE_KEY = 'websocket_task_state';

  function saveTaskState() {
    try {
      const state = {
        taskRunning: taskRunning.value,
        taskId: taskId.value,
        queueId: queueId.value,
        taskProgress: taskProgress.value,
        taskStatus: taskStatus.value,
        taskStats: taskStats.value,
        taskConfig: taskConfig.value,
        extractedEntities: extractedEntities.value,
        generatedArticles: generatedArticles.value,
        currentContent: currentContent.value,
        wsConnected: wsConnected.value,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('保存任务状态失败:', error);
    }
  }

  function restoreTaskState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);

        // 检查数据是否太旧（超过24小时）
        if (Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
          clearTaskState();
          return;
        }

        // 恢复非运行时状态
        taskId.value = state.taskId || "";
        queueId.value = state.queueId || "";
        taskProgress.value = state.taskProgress || 0;
        taskStats.value = state.taskStats || { total: 0, completed: 0, failed: 0, remaining: 0 };
        taskConfig.value = state.taskConfig || { maxEntities: 20 };
        extractedEntities.value = state.extractedEntities || [];
        generatedArticles.value = state.generatedArticles || [];
        currentContent.value = state.currentContent || "";

        // 恢复任务状态，但不自动设置为运行中
        if (state.taskRunning && (state.taskStatus === 'running' || state.taskStatus === 'paused')) {
          taskRunning.value = true;
          taskStatus.value = state.taskStatus;
          ElMessage.info('检测到未完成的任务，WebSocket重连后可继续');
        } else {
          taskRunning.value = false;
          taskStatus.value = "idle";
        }
      }
    } catch (error) {
      console.warn('恢复任务状态失败:', error);
    }
  }

  function clearTaskState() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // 计算属性
  const hasActiveTask = computed(() => taskRunning.value && taskStatus.value !== 'idle');
  const taskStatusText = computed(() => {
    const statusMap: Record<string, string> = {
      'idle': '空闲',
      'running': '运行中',
      'paused': '已暂停',
      'stopping': '正在停止',
      'completed': '已完成',
      'error': '错误'
    };
    return statusMap[taskStatus.value] || '未知状态';
  });

  // 初始化时恢复状态
  restoreTaskState();

  return {
    // 状态
    ws,
    wsConnected,
    taskRunning,
    taskId,
    queueId,
    taskProgress,
    taskStatus,
    taskStats,
    taskConfig,
    extractedEntities,
    generatedArticles,
    currentContent,
    messageHandlers,

    // 计算属性
    hasActiveTask,
    taskStatusText,

    // 方法
    initWebSocket,
    sendMessage,
    registerMessageHandler,
    startTask,
    pauseTask,
    resumeTask,
    stopTask,
    cleanupAfterStop,
    saveTaskState,
    restoreTaskState,
    clearTaskState
  };
});
