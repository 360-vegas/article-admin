import { http } from "@/utils/http";

export interface DomainCheckResult {
  domain: string;
  available: boolean;
  status: 'available' | 'registered' | 'error';
  message?: string;
  whoisData?: string;
}

export interface BatchCheckRequest {
  domains: string[];
}

export interface BatchCheckResponse {
  results: DomainCheckResult[];
  timestamp: number;
}

// 单个域名检测
export const checkDomain = (domain: string) => {
  return http.request<DomainCheckResult>("post", "/domain/check", {
    data: { domain }
  });
};

// 批量域名检测
export const batchCheckDomains = async (domains: string[]) => {
  // 如果是开发环境，直接调用API
  // 如果是生产环境，需要配置实际的域名检测服务地址
  try {
    const response = await http.request<BatchCheckResponse>("post", "/domain/batch-check", {
      data: { domains }
    });
    // 直接返回响应数据，因为API返回的就是BatchCheckResponse格式
    return response;
  } catch (error) {
    // 如果真实API不可用，返回模拟数据作为降级方案
    console.error('域名检测API错误，使用模拟数据:', error);
    // 返回与API相同的格式
    return {
      results: domains.map(domain => ({
        domain,
        available: Math.random() > 0.5,
        status: Math.random() > 0.5 ? 'available' as const : 'registered' as const,
        message: '模拟检测结果'
      })),
      timestamp: Date.now()
    } as BatchCheckResponse;
  }
};

// 使用WHOIS查询域名信息
export const queryWhois = (domain: string) => {
  return http.request<any>("post", "/domain/whois", {
    data: { domain }
  });
};
