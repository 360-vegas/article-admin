import { http } from "@/utils/http";
import type { PureHttpRequestConfig } from "@/utils/http/types.d";

export interface CloudflareZone {
  id: string;
  name: string;
  group_id?: string;
  group_name?: string;
  group_description?: string;
}

export interface CloudflareZonesResponse {
  success: boolean;
  data: CloudflareZone[];
}

export interface DnsRecord {
  id: string;
  type: string; // e.g., A, AAAA, CNAME
  name: string; // record name
  content: string; // record value
  ttl: number;
  proxied: boolean;
}

export interface DnsRecordsResponse {
  success: boolean;
  data: DnsRecord[];
}

export type CreateDnsRecordDto = Omit<DnsRecord, "id">;
export type UpdateDnsRecordDto = Partial<CreateDnsRecordDto>;

// 1.1 获取域名区域列表
export function getCloudflareZones() {
  return http.get<CloudflareZonesResponse, void>("/v1/cloudflare/zones");
}

// 1.2 获取域名DNS记录
export function getDnsRecords(zoneId: string) {
  return http.get<DnsRecordsResponse, void>(`/v1/cloudflare/zones/${zoneId}/records`);
}

// 1.3 创建DNS记录
export function createDnsRecord(zoneId: string, payload: CreateDnsRecordDto) {
  return http.request<DnsRecord>("post", `/v1/cloudflare/zones/${zoneId}/records`, { data: payload });
}

// 1.4 更新DNS记录
export function updateDnsRecord(zoneId: string, recordId: string, payload: UpdateDnsRecordDto) {
  return http.request<DnsRecord>("put", `/v1/cloudflare/zones/${zoneId}/records/${recordId}` as string, { data: payload });
}

// 1.5 删除DNS记录
export function deleteDnsRecord(zoneId: string, recordId: string) {
  return http.request<void>("delete", `/v1/cloudflare/zones/${zoneId}/records/${recordId}`);
}

// 批量操作
export function deleteDnsRecordsByType(zoneId: string, type: string) {
  return http.request<void>("delete", `/v1/cloudflare/zones/${zoneId}/records`, { params: { type } });
}

export function deleteDnsRecordsBatch(zoneId: string, recordIds: string[]) {
  return http.request<void>("delete", `/v1/cloudflare/zones/${zoneId}/records/batch`, { data: { record_ids: recordIds } });
}

export function createDnsRecordsBatch(zoneId: string, records: CreateDnsRecordDto[]) {
  return http.request<void>("post", `/v1/cloudflare/zones/${zoneId}/records/batch`, { data: { records } });
}

export function updateDnsRecordsBatch(zoneId: string, records: (Partial<DnsRecord> & { id: string })[]) {
  return http.request<void>("put", `/v1/cloudflare/zones/${zoneId}/records/batch`, { data: { records } });
}

// 本地域名批量删除
export function deleteLocalDomainsBatch(ids: string[]) {
  return http.request<void>("delete", "/v1/domains/batch", { data: { ids } });
}

// 多域名：按类型批量删除指定类型记录
export function deleteDnsRecordsByTypeAcrossZones(zoneIds: string[], type: string) {
  return http.request<{ results: any[] }>(
    "post",
    "/v1/cloudflare/records/batch-delete-by-type",
    { data: { zone_ids: zoneIds, type } }
  );
}

// 多域名：批量新增解析记录
export function createDnsRecordsAcrossZones(
  zoneIds: string[],
  records: CreateDnsRecordDto[],
  axiosConfig?: PureHttpRequestConfig
) {
  return http.request<{ results: any[] }>(
    "post",
    "/v1/cloudflare/records/batch-create-across-zones",
    { data: { zone_ids: zoneIds, records } },
    axiosConfig
  );
}

// ----- Domain groups -----
export interface DomainGroup {
  id: string;
  name: string;
  description?: string;
  created_at?: string | number;
  updated_at?: string | number;
}

export function getDomainGroups() {
  return http.get<{ data: DomainGroup[] }, void>("/v1/domain-groups");
}

export function createOrUpdateDomainGroup(payload: Partial<DomainGroup>) {
  return http.request<{ data: { id: string } }>("post", "/v1/domain-groups", { data: payload });
}

export function batchAssignDomainGroup(params: { group_id: string; ids?: string[]; names?: string[]; zone_ids?: string[] }) {
  return http.request<{ success: boolean; data: { updated: number } }>(
    "post",
    "/v1/domains/batch-assign-group",
    { data: params }
  );
}

// ----- SSL Certificate Management -----

// Cloudflare Universal SSL interfaces
export interface CloudflareSslStatus {
  success: boolean;
  data?: {
    status: string;
    type: string;
    validation_method?: string;
    certificate_authority?: string;
  };
}

export interface CustomSslRequest {
  cert_pem: string;
  key_pem: string;
  bundle_pem?: string;
}

export interface CustomSslResponse {
  success: boolean;
  data?: {
    id: string;
    status: string;
    uploaded_on: string;
    expires_on?: string;
  };
}

// Let's Encrypt interfaces
export interface LetsEncryptRequest {
  deploy: "edge" | "origin";
  domains: string[];
  email: string;
}

export interface LetsEncryptResponse {
  success: boolean;
  data?: {
    request_id: string;
  };
}

export interface LetsEncryptLog {
  step: string;
  message: string;
  details: Record<string, any>;
  created_at: string;
}

export interface LetsEncryptCertificate {
  cert_pem: string;
  key_pem: string;
  has_certificate: boolean;
}

export interface LetsEncryptStatus {
  success: boolean;
  data?: {
    request_id: string;
    deploy: "edge" | "origin";
    domains: string[];
    email: string;
    status: "queued" | "pending" | "valid" | "failed";
    error: string;
    created_at: string;
    updated_at: string;
    logs: LetsEncryptLog[];
    certificate?: LetsEncryptCertificate;
  };
}

export interface LetsEncryptDownload {
  success: boolean;
  data?: {
    request_id: string;
    status: string;
    deploy: "edge" | "origin";
    created_at: string;
    updated_at: string;
    certificate: LetsEncryptCertificate;
    format: string;
    key_type: string;
    logs: LetsEncryptLog[];
  };
}

// WebSocket 消息类型
export interface WebSocketMessage {
  type: 'ssl_status' | 'ssl_log' | 'ssl_error' | 'ssl_completed';
  data: any;
}

export interface WebSocketClientMessage {
  type: 'request_certificate' | 'get_status';
  data?: any;
}

// Cloudflare Universal SSL API functions
export function enableCloudflareUniversalSsl(zoneId: string) {
  return http.request<CloudflareSslStatus>("post", `/v1/cloudflare/zones/${zoneId}/ssl`);
}

export function getCloudflareUniversalSsl(zoneId: string) {
  return http.request<CloudflareSslStatus>("get", `/v1/cloudflare/zones/${zoneId}/ssl`);
}

export function disableCloudflareUniversalSsl(zoneId: string) {
  return http.request<CloudflareSslStatus>("delete", `/v1/cloudflare/zones/${zoneId}/ssl`);
}

export function uploadCustomSslCertificate(zoneId: string, payload: CustomSslRequest) {
  return http.request<CustomSslResponse>("post", `/v1/cloudflare/zones/${zoneId}/ssl/custom`, { data: payload });
}

// Let's Encrypt API functions
export function requestLetsEncryptCertificate(payload: LetsEncryptRequest) {
  return http.request<LetsEncryptResponse>("post", "/v1/ssl/lets-encrypt/request", { data: payload });
}

export function getLetsEncryptStatus(requestId: string) {
  return http.request<LetsEncryptStatus>("get", `/v1/ssl/lets-encrypt/status/${requestId}`);
}

export function downloadLetsEncryptCertificate(requestId: string) {
  return http.request<LetsEncryptDownload>("get", `/v1/ssl/lets-encrypt/download/${requestId}`);
}

// 获取证书列表
export interface LetsEncryptListParams {
  page?: number;
  limit?: number;
  status?: 'queued' | 'pending' | 'valid' | 'failed';
}

export interface LetsEncryptListResponse {
  success: boolean;
  data: {
    filters: {
      status: string;
    };
    pagination: {
      has_next: boolean;
      has_prev: boolean;
      limit: number;
      page: number;
      total: number;
      total_pages: number;
    };
    requests: {
      created_at: string;
      deploy: 'edge' | 'origin';
      domains: string[];
      email: string;
      error: string;
      request_id: string;
      status: 'queued' | 'pending' | 'valid' | 'failed';
      updated_at: string;
    }[];
  };
}

export function getLetsEncryptList(params?: LetsEncryptListParams) {
  return http.request<LetsEncryptListResponse>("get", "/v1/ssl/lets-encrypt/list", { params });
}

// WebSocket 连接管理
export class SSLWebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private listeners: Map<string, Function[]> = new Map();

  constructor(private baseUrl: string) { }

  connect() {
    try {
      // 确保WebSocket URL正确处理协议
      let wsUrl = this.baseUrl.replace('http', 'ws') + '/v1/ssl/lets-encrypt/ws';
      // 如果是HTTPS环境，确保使用WSS协议
      if (window.location.protocol === 'https:' && wsUrl.startsWith('ws://')) {
        wsUrl = wsUrl.replace('ws://', 'wss://');
      }
      this.ws = new WebSocket(wsUrl);
      this.setupWebSocketHandlers();
    } catch (error) {
      console.error('Failed to connect SSL WebSocket:', error);
      this.emit('error', error);
    }
  }

  private setupWebSocketHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('SSL WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocket received message:', message);

        // 处理不同的消息格式
        if (message.type) {
          // 标准格式: {type: "ssl_status", data: {...}}
          this.emit(message.type, message);
        } else if (message.message) {
          // 直接格式: {message: "状态查询成功", data: {...}}
          this.emit('ssl_status', message);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('SSL WebSocket disconnected');
      this.emit('disconnected');
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('SSL WebSocket error:', error);
      this.emit('error', error);
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: WebSocketClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket sending message:', message);
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not ready, message not sent:', message);
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }


  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect SSL WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached for SSL WebSocket');
      this.emit('max_reconnect_attempts_reached');
    }
  }
}


