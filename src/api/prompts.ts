import { http } from "@/utils/http";

export interface PromptPreset {
  id?: string;
  code: string; // unique code identifier
  name: string;
  system_body?: string;
  user_body?: string;
  remark?: string;
  created_at?: string | number;
  updated_at?: string | number;
  [key: string]: any;
}

export interface CreatePromptPresetDto {
  code: string;
  name: string;
  system_body?: string;
  user_body?: string;
  remark?: string;
}

export interface UpdatePromptPresetDto extends Partial<CreatePromptPresetDto> {
  id?: string;
}

export interface ListPresetsParams {
  page?: number;
  size?: number;
  keyword?: string;
  [key: string]: any;
}

export type ListPresetsResponse = PromptPreset[] | { items: PromptPreset[]; total?: number };

export async function listPresets(params?: ListPresetsParams) {
  const res = await http.get<ListPresetsResponse, typeof params>("/v1/prompts/presets", { params });
  // Normalize to array
  return Array.isArray(res) ? res : (res?.items || []);
}

export function createPreset(payload: CreatePromptPresetDto) {
  return http.post<PromptPreset, CreatePromptPresetDto>("/v1/prompts/presets", { data: payload });
}

export function getPresetByCode(code: string) {
  return http.get<PromptPreset, void>(`/v1/prompts/presets/${code}`);
}

export function updatePresetByCode(code: string, payload: UpdatePromptPresetDto) {
  return http.request<PromptPreset>("put", `/v1/prompts/presets/${code}`, { data: payload });
}

export function deletePresetByCode(code: string) {
  return http.request<void>("delete", `/v1/prompts/presets/${code}`);
}


