import { http } from "@/utils/http";

// 批量生成相关接口
export interface BatchGenerationRequest {
  url?: string;
  entityName?: string;
  maxArticles: number;
  maxEntities: number;
}

export interface BatchGenerationResponse {
  id: string;
  status: string;
  progress: number;
  total: number;
  completed: number;
  failed: number;
  remaining: number;
}

// 开始批量生成
export function startBatchGeneration(data: BatchGenerationRequest) {
  return http.post<{ id: string }, BatchGenerationRequest>("/v1/generation/batch", { data });
}

// 监控批量生成进度
export function getBatchProgress(id: string) {
  return http.get<BatchGenerationResponse, void>(`/v1/generation/batch/${id}`);
}

// 暂停批量生成
export function pauseBatchGeneration() {
  return http.post<void, void>("/v1/generation/batch/pause");
}

// 恢复批量生成
export function resumeBatchGeneration() {
  return http.post<void, void>("/v1/generation/batch/resume");
}

// 停止批量生成
export function stopBatchGeneration() {
  return http.post<void, void>("/v1/generation/batch/stop");
}

// WebSocket批量复制相关接口
export interface BatchCopyRequest {
  url?: string;
  entityName?: string;
  maxArticles: number;
  maxEntities: number;
}

export interface WebSocketMessage {
  type: 'progress' | 'status' | 'entity' | 'article' | 'error';
  progress?: number;
  status?: string;
  total?: number;
  completed?: number;
  failed?: number;
  remaining?: number;
  entity?: any;
  article?: any;
  message?: string;
}

// WebSocket批量复制消息类型定义 - 根据图片示例更新
export interface BatchCopyWebSocketRequest {
  type: 'start_batch_copy' | 'pause_batch_copy' | 'stop_batch_copy';
  data?: {
    url?: string;
    entity_name?: string;
    max_articles?: number;
    max_entities?: number;
  };
}

export interface BatchCopyWebSocketResponse {
  channel?: 'entities' | 'articles' | 'error' | 'log' | 'task' | 'system';
  type: string; // 实际返回的消息类型，如 'entities_extracted', 'article_generated' 等
  message?: string;
  timestamp?: string;
  data?: {
    entities?: Array<{
      id: string;
      name: string;
      type: string;
      description?: string;
      short_description?: string;
      category_name?: string;
      category_id?: string | null;
      is_verified: boolean;
      confidence: number;
      confidence_score?: number;
      slug: string;
      lang: string;
      country_code?: string;
      aliases?: string[];
      processed: boolean;
      created_at: string;
      updated_at: string;
    }>;
    article?: {
      id?: string;
      title?: string;
      content?: string;
      created_at?: string;
      updated_at?: string;
    };
    articles?: Array<{
      id?: string;
      title?: string;
      content?: string;
      created_at?: string;
      updated_at?: string;
    }>;
    task_id?: string;
    taskId?: string;
    queue_id?: string; // 添加队列ID支持
    queueId?: string; // 备用字段名
    level?: string;
    fatal?: boolean;
    [key: string]: any; // 允许其他属性
  };
  success?: boolean;
  taskId?: string;
  task_id?: string;
  queue_id?: string; // 添加顶层队列ID支持
  queueId?: string; // 备用字段名
  level?: string;
  fatal?: boolean;
}

// 注意：批量复制现在完全通过WebSocket处理，不使用HTTP接口
// WebSocket连接地址: ws://host:port/v1/generation/batchCopy

// URL内容处理相关接口
export interface UrlExtractionResponse {
  content: string;
  title: string;
  description: string;
  metadata?: {
    content_length: number;
    country_code: string;
    entities_count: number;
    extracted_at: string;
    language: string;
    url: string;
  };
  success?: boolean;
  message?: string;
}

export interface Entity {
  id?: string;
  name: string;
  type?: string;
  slug?: string;
  aliases?: string[];
  confidence?: number;
  country_code?: string;
  lang?: string;
  category_id?: number;
  category_name?: string;
  description?: string;
  short_description?: string;
  confidence_score?: number;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  metadata?: any;
}

export interface EntitiesExtractionResponse {
  entities: Entity[];
  count: number;
  message: string;
}

export interface Article {
  id?: string;
  title: string;
  content: string;
  tags?: string[];
  category?: string;
  metadata?: any;
}

export interface GeneratedArticle {
  article_id: string;
  title: string;
  content: string;
  status: string;
  success: boolean;
  message: string;
  metadata: {
    article_type: string;
    entity_category: string;
    entity_id: string;
    entity_name: string;
    entity_type: string;
    generated_at: string;
    language: string;
    target_audience: string;
    template_id: string;
    tone: string;
    variables: any;
  };
  generated_at: string;
  entity_id: string;
  entity_name: string;
  entity_type: string;
  entity_description: string;
  entity_category: string;
}

// 提取URL内容
export function extractUrlContent(url: string) {
  return http.post<UrlExtractionResponse, { url: string }>("/v1/articles/extract-url", {
    data: { url }
  });
}

// 提取实体
export function extractEntities(data: { content: string; title?: string; description?: string; url?: string }) {
  return http.post<EntitiesExtractionResponse, typeof data>("/v1/entities/extract", {
    data
  });
}

// 基于实体生成文章
export function generateArticleFromEntity(entity: Entity) {
  return http.post<GeneratedArticle, { entity: Entity }>("/v1/articles/generate-from-entity", {
    data: { entity }
  });
}

// 保存文章
export function saveGeneratedArticle(article: Article) {
  return http.post<Article, Article>("/v1/articles", {
    data: article
  });
}
