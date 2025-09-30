import { http } from "@/utils/http";

export interface Article {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface CreateArticleDto {
  title: string;
  content: string;
  tags?: string[];
  [key: string]: any;
}

export interface UpdateArticleDto extends Partial<CreateArticleDto> { }

export function listArticles(params?: { page?: number; size?: number; keyword?: string;[k: string]: any }) {
  return http.get<{ items: Article[]; total: number }, typeof params>("/v1/articles", { params });
}

export function createArticle(payload: CreateArticleDto) {
  return http.post<Article, CreateArticleDto>("/v1/articles", { data: payload });
}

export function getArticleById(id: string) {
  return http.get<Article, void>(`/v1/articles/${id}`);
}

export function updateArticle(id: string, payload: UpdateArticleDto) {
  return http.request<Article>("put", `/v1/articles/${id}`, { data: payload });
}

export function deleteArticle(id: string) {
  return http.request<void>("delete", `/v1/articles/${id}`);
}


