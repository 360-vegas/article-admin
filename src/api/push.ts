import { http } from "@/utils/http";

// 推送相关API接口

// 测试连接
export const testConnection = (data: {
  accountName: string;
  bingApiKey: string;
  cloudflareToken: string;
  accountId: string;
}) => {
  return http.request({
    url: "/api/push/test-connection",
    method: "post",
    data
  });
};

// 保存账号配置
export const saveAccount = (data: {
  id?: number;
  name: string;
  bingApiKey: string;
  cloudflareToken: string;
  accountId: string;
}) => {
  return http.request({
    url: "/api/push/account",
    method: "post",
    data
  });
};

// 删除账号
export const deleteAccount = (id: number) => {
  return http.request({
    url: `/api/push/account/${id}`,
    method: "delete"
  });
};

// 获取账号列表
export const getAccounts = () => {
  return http.request({
    url: "/api/push/accounts",
    method: "get"
  });
};

// 保存IndexNow密钥
export const saveIndexNowKeys = (keys: string[]) => {
  return http.request({
    url: "/api/push/indexnow-keys",
    method: "post",
    data: { keys }
  });
};

// 获取IndexNow密钥
export const getIndexNowKeys = () => {
  return http.request({
    url: "/api/push/indexnow-keys",
    method: "get"
  });
};

// 保存路径模式
export const savePathModes = (modes: string[]) => {
  return http.request({
    url: "/api/push/path-modes",
    method: "post",
    data: { modes }
  });
};

// 获取路径模式
export const getPathModes = () => {
  return http.request({
    url: "/api/push/path-modes",
    method: "get"
  });
};

// 批量生成推送IndexNow
export const batchGenerateIndexNow = (data: {
  maxGeneration: number;
  pathModes: string[];
  indexNowKeys: string[];
}) => {
  return http.request({
    url: "/api/push/batch-generate",
    method: "post",
    data
  });
};

// 检查系统状态
export const checkSystemStatus = () => {
  return http.request({
    url: "/api/push/system-status",
    method: "get"
  });
};

// 启动定时任务
export const startTimer = (data: {
  type: "indexnow" | "general";
  interval?: number;
}) => {
  return http.request({
    url: "/api/push/start-timer",
    method: "post",
    data
  });
};

// 停止定时任务
export const stopTimer = (type: "indexnow" | "general") => {
  return http.request({
    url: "/api/push/stop-timer",
    method: "post",
    data: { type }
  });
};

// 强制停止所有任务
export const forceStopAll = () => {
  return http.request({
    url: "/api/push/force-stop",
    method: "post"
  });
};

// 紧急清理
export const emergencyCleanup = () => {
  return http.request({
    url: "/api/push/emergency-cleanup",
    method: "post"
  });
};

// 获取实时日志
export const getRealtimeLogs = () => {
  return http.request({
    url: "/api/push/logs",
    method: "get"
  });
};

// 清空日志
export const clearLogs = () => {
  return http.request({
    url: "/api/push/logs",
    method: "delete"
  });
};

// 保存Sitemap路径
export const saveSitemapPath = (path: string) => {
  return http.request({
    url: "/api/push/sitemap-path",
    method: "post",
    data: { path }
  });
};

// 获取Sitemap路径
export const getSitemapPath = () => {
  return http.request({
    url: "/api/push/sitemap-path",
    method: "get"
  });
};

// URL推送项目管理API

// 添加URL推送项目
export const addUrlPushProject = (data: {
  bingApiKey: string;
  domains: string[];
  urlMustContain: string;
  titleKeywords: string[];
  excludeWords: string[];
  titleTimeout: number;
  maxTitleCount: number;
  enableTimer: boolean;
  pushInterval: string;
  batchSize: number;
}) => {
  return http.request({
    url: "/api/push/url-projects",
    method: "post",
    data
  });
};

// 获取URL推送项目列表
export const getUrlPushProjects = () => {
  return http.request({
    url: "/api/push/url-projects",
    method: "get"
  });
};

// 更新URL推送项目
export const updateUrlPushProject = (id: number, data: any) => {
  return http.request({
    url: `/api/push/url-projects/${id}`,
    method: "put",
    data
  });
};

// 删除URL推送项目
export const deleteUrlPushProject = (id: number) => {
  return http.request({
    url: `/api/push/url-projects/${id}`,
    method: "delete"
  });
};

// 批量运行所有项目
export const batchRunAllProjects = () => {
  return http.request({
    url: "/api/push/batch-run-all",
    method: "post"
  });
};

// 启动定时任务
export const startUrlPushTimer = () => {
  return http.request({
    url: "/api/push/start-url-timer",
    method: "post"
  });
};

// 停止定时任务
export const stopUrlPushTimer = () => {
  return http.request({
    url: "/api/push/stop-url-timer",
    method: "post"
  });
};

// 获取推送统计信息
export const getPushStats = () => {
  return http.request({
    url: "/api/push/stats",
    method: "get"
  });
};

// 获取项目执行结果
export const getProjectResults = (projectId: number) => {
  return http.request({
    url: `/api/push/project-results/${projectId}`,
    method: "get"
  });
};