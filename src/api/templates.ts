import { http } from "@/utils/http";

export interface TemplateItem {
  id: string;
  name: string;
  body: string; // HTML with placeholders
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface CreateTemplateDto {
  name: string;
  body: string;
}

export interface UpdateTemplateDto extends Partial<CreateTemplateDto> { }

export interface ListTemplatesParams {
  page?: number;
  size?: number;
  keyword?: string;
  [key: string]: any;
}

export interface ListTemplatesResponse {
  items: TemplateItem[];
  total: number;
}

export function listTemplates(params?: ListTemplatesParams) {
  return http.get<ListTemplatesResponse, typeof params>("/v1/templates", { params });
}

export function createTemplate(payload: CreateTemplateDto) {
  return http.post<TemplateItem, CreateTemplateDto>("/v1/templates", { data: payload });
}

export function getTemplateById(id: string) {
  return http.get<TemplateItem, void>(`/v1/templates/${id}`);
}

export function updateTemplate(id: string, payload: UpdateTemplateDto) {
  return http.request<TemplateItem>("put", `/v1/templates/${id}`, { data: payload });
}

export function deleteTemplate(id: string) {
  return http.request<void>("delete", `/v1/templates/${id}`);
}

// Render returns text/html; variables should be at JSON root (no nested data key)
export function renderTemplateHtml<TVariables extends Record<string, any> = Record<string, any>>(
  id: string,
  variables: TVariables
) {
  return http.request<string>("post", `/v1/templates/${id}/render`, {
    // Put variables at root of the JSON body
    data: variables,
    // Expect text/html back
    responseType: "text",
    headers: {
      Accept: "text/html"
    }
  });
}


