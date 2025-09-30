import { http } from "@/utils/http";

// AI配置相关接口类型定义 - 基于实际API返回结构
export interface AiConfig {
  id: string; // API返回的真实ID
  provider: string;
  api_key: string;
  model: string;
  temperature: number;
  max_tokens: number;
  base_url: string;
  // 前端添加的字段
  name?: string; // 用于前端显示，基于provider+model生成
  isActive?: boolean; // 用于前端状态管理
}

export interface CreateAiConfigDto {
  provider: string;
  api_key: string;
  model: string;
  temperature: number;
  max_tokens: number;
  base_url: string;
}

export interface UpdateAiConfigDto extends Partial<CreateAiConfigDto> { }

// 配置列表直接返回数组，不是分页结构
export type AiConfigListResponse = AiConfig[];

export interface AiProviderInfo {
  id: string;
  name: string;
  type: string;
  status: string;
  cost_per_token: number;
  max_tokens: number;
  latency: number;
  success_rate: number;
  models?: string[];
}

// 模型详细信息接口
export interface AiModelInfo {
  id: string;
  name: string;
  description: string;
  provider: string;
  type: string;
  max_tokens: number;
  cost_per_token: number;
  status: string;
}

// 当前配置相关接口
export function getCurrentConfig() {
  return http.get<AiConfig, void>("/v1/ai/config");
}

export function saveCurrentConfig(payload: CreateAiConfigDto) {
  return http.post<AiConfig, CreateAiConfigDto>("/v1/ai/config", { data: payload });
}

// 激活配置接口
export function activateConfig(payload: CreateAiConfigDto) {
  return http.post<AiConfig, CreateAiConfigDto>("/v1/ai/config", { data: payload });
}

// 配置列表相关接口
export function getConfigList() {
  return http.get<AiConfigListResponse, void>("/v1/ai/configs");
}

export function createConfig(payload: CreateAiConfigDto) {
  return http.post<AiConfig, CreateAiConfigDto>("/v1/ai/configs", { data: payload });
}

// 使用ID进行配置操作
export function getConfigById(id: string) {
  return http.get<AiConfig, void>(`/v1/ai/configs/${id}`);
}

export function updateConfigById(id: string, payload: UpdateAiConfigDto) {
  return http.request<AiConfig>("put", `/v1/ai/configs/${id}`, { data: payload });
}

export function deleteConfigById(id: string) {
  return http.request<void>("delete", `/v1/ai/configs/${id}`);
}

export function activateConfigById(id: string) {
  return http.post<void, void>(`/v1/ai/configs/${id}/activate`);
}

export function deactivateConfigById(id: string) {
  return http.post<void, void>(`/v1/ai/configs/${id}/deactivate`);
}

// 提供商相关接口
export function getProviders() {
  return http.get<AiProviderInfo[], void>("/v1/ai/providers");
}

// 根据提供商获取可用模型列表
export function getProviderModels(providerId: string) {
  return http.get<AiModelInfo[], void>(`/v1/ai/providers/${providerId}/models`);
}

// 内容生成相关接口
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface GenerateContentRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  [key: string]: any;
}

export interface GenerateContentResponse {
  id?: string;
  content?: string;
  choices?: Array<{ index: number; message: ChatMessage }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  [key: string]: any;
}

export function generateContent(payload: GenerateContentRequest) {
  return http.post<GenerateContentResponse, GenerateContentRequest>("/v1/ai/generate", { data: payload });
}

// 测试AI工具调用
export function testAiConnection() {
  return http.post<{ success: boolean; message: string }, void>("/v1/ai/test", {});
}

// 测试API Key
export function testApiKey(payload: { provider: string; api_key: string; model: string; base_url?: string }) {
  return http.post<{ success: boolean; message: string }, typeof payload>("/v1/ai/configs/test", { data: payload });
}

// 嵌入向量相关接口
export interface EmbeddingsRequest {
  model: string;
  input: string | string[];
  [key: string]: any;
}

export interface EmbeddingsResponse {
  data: Array<{ index: number; embedding: number[] }>;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
  [key: string]: any;
}

export function createEmbeddings(payload: EmbeddingsRequest) {
  return http.post<EmbeddingsResponse, EmbeddingsRequest>("/v1/ai/embeddings", { data: payload });
}

// 内容审核相关接口
export interface ModerateRequest {
  model?: string;
  input: string | string[];
  [key: string]: any;
}

export interface ModerateResponse {
  flagged: boolean;
  categories?: Record<string, boolean>;
  [key: string]: any;
}

export function moderateContent(payload: ModerateRequest) {
  return http.post<ModerateResponse, ModerateRequest>("/v1/ai/moderate", { data: payload });
}