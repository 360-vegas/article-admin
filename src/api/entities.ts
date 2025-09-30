import { http } from "@/utils/http";

// 实体相关接口
export interface Entity {
  id: string;
  name: string;
  description?: string;
  type?: string;
  articleCount?: number;
  categoryCount?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface CreateEntityDto {
  name: string;
  description?: string;
  type?: string;
  [key: string]: any;
}

export interface UpdateEntityDto extends Partial<CreateEntityDto> { }

// 实体CRUD操作
export function listEntities(params?: { page?: number; size?: number; keyword?: string; type?: string;[k: string]: any }) {
  return http.get<{ items: Entity[]; total: number }, typeof params>("/v1/entities", { params });
}

export function createEntity(payload: CreateEntityDto) {
  return http.post<Entity, CreateEntityDto>("/v1/entities", { data: payload });
}

export function getEntityById(id: string) {
  return http.get<Entity, void>(`/v1/entities/${id}`);
}

export function updateEntity(id: string, payload: UpdateEntityDto) {
  return http.request<Entity>("put", `/v1/entities/${id}`, { data: payload });
}

export function deleteEntity(id: string) {
  return http.request<void>("delete", `/v1/entities/${id}`);
}

// 实体提取接口
export interface ExtractEntitiesRequest {
  content: string;
  title?: string;
  description?: string;
  url?: string;
  maxEntities?: number;
  entityTypes?: string[];
}

export function extractEntitiesFromContent(data: ExtractEntitiesRequest) {
  return http.post<Entity[], ExtractEntitiesRequest>("/v1/entities/extract", { data });
}

// 为了向后兼容，保留原有的标签相关函数
export type Tag = Entity;
export type CreateTagDto = CreateEntityDto;
export type UpdateTagDto = UpdateEntityDto;

export const listTags = (params?: { page?: number; size?: number; keyword?: string;[k: string]: any }) => {
  return listEntities({ ...params, type: 'tag' });
};

export const createTag = (payload: CreateTagDto) => {
  return createEntity({ ...payload, type: 'tag' });
};

export const getTagById = getEntityById;
export const updateTag = updateEntity;
export const deleteTag = deleteEntity;
