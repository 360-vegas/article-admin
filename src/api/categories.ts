import { http } from "@/utils/http";

export interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string | null;
  path?: string;
  depth?: number;
  country_code?: string;
  lang?: string;
  template_key?: string | null;
  deleted_at?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
  parent_id?: string | null;
  country_code?: string;
  lang?: string;
  template_key?: string | null;
  [key: string]: any;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> { }

export function listCategories(params?: { page?: number; size?: number; keyword?: string; country_code?: string; lang?: string; include_deleted?: boolean;[k: string]: any }) {
  return http.get<{ items: Category[]; total: number }, typeof params>("/v1/categories/tree", { params });
}

export function createCategory(payload: CreateCategoryDto) {
  return http.post<Category, CreateCategoryDto>("/v1/categories", { data: payload });
}

export function getCategoryById(id: string) {
  return http.get<Category, void>(`/v1/categories/${id}`);
}

export function updateCategory(id: string, payload: UpdateCategoryDto) {
  return http.request<Category>("put", `/v1/categories/${id}`, { data: payload });
}

export function deleteCategory(id: string) {
  return http.request<void>("delete", `/v1/categories/${id}`);
}

// --- Clustering APIs ---
export interface AutoClusterParams {
  algo: string; // e.g., "graph_hybrid"
  params?: Record<string, any>;
}

export interface AutoClusterResponse {
  cluster_run_id: number;
  clusters: number;
  status: string;
}

export function autoClusterCategories(parentId: string, payload: AutoClusterParams) {
  return http.post<AutoClusterResponse, AutoClusterParams>(
    `/v1/categories/${parentId}/auto-cluster`,
    { data: payload }
  );
}

export interface MaterializeClustersParams {
  cluster_run_id: number;
  naming?: "top-entity" | "relation-hint" | "mixed" | string;
  min_size?: number;
  dry_run?: boolean;
}

export interface MaterializeClustersResponse {
  created_categories: Array<{ id: string | number; name: string; members?: number }>;
  updated_entities: number;
}

export function materializeClusters(parentId: string, payload: MaterializeClustersParams) {
  return http.post<MaterializeClustersResponse, MaterializeClustersParams>(
    `/v1/categories/${parentId}/materialize-clusters`,
    { data: payload }
  );
}

// --- Children Management ---
export interface BatchCreateChildrenDto {
  names: string[];
  lang?: string;
  country_code?: string;
}

export interface BatchCreateChildrenResultItem {
  id: string | number;
  name: string;
}

export interface BatchCreateChildrenResponse {
  created: BatchCreateChildrenResultItem[];
}

export function batchCreateChildren(parentId: string, payload: BatchCreateChildrenDto) {
  return http.post<BatchCreateChildrenResponse, BatchCreateChildrenDto>(
    `/v1/categories/${parentId}/children/batch`,
    { data: payload }
  );
}

export function getCategoryChildren(parentId: string) {
  return http.get<{ items: Category[] } | Category[], void>(
    `/v1/categories/${parentId}/children`
  );
}

// --- Auto assign by rules ---
export interface AutoAssignRule {
  child_name: string;
  include: string[];
  type?: string;
}

export interface AutoAssignRequest {
  rules: AutoAssignRule[];
  lang?: string;
  country_code?: string;
  dry_run?: boolean;
}

export interface AutoAssignChildStat {
  child_name: string;
  matched_entities: number;
  updated_entities: number;
}

export interface AutoAssignResponse {
  total_matched: number;
  total_updated: number;
  details: AutoAssignChildStat[];
  dry_run?: boolean;
}

export function autoAssignChildren(parentId: string, payload: AutoAssignRequest) {
  return http.post<AutoAssignResponse, AutoAssignRequest>(
    `/v1/categories/${parentId}/children/auto-assign`,
    { data: payload }
  );
}