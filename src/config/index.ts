import axios from "axios";
import type { App } from "vue";

let config: object = {};
const { VITE_PUBLIC_PATH, BASE_URL } = import.meta.env as any;

/**
 * 生成安全的 publicPath，优先级：VITE_PUBLIC_PATH -> BASE_URL -> "/"
 * 并规范结尾斜杠
 */
function getSafePublicPath(): string {
  const candidates = [VITE_PUBLIC_PATH, BASE_URL, "/"];
  const base = candidates.find(v => typeof v === "string" && v.length > 0) || "/";
  // 规范为以 / 结尾
  return base.endsWith("/") ? base : `${base}/`;
}

const setConfig = (cfg?: unknown) => {
  config = Object.assign(config, cfg);
};

const getConfig = (key?: string): PlatformConfigs => {
  if (typeof key === "string") {
    const arr = key.split(".");
    if (arr && arr.length) {
      let data = config;
      arr.forEach(v => {
        if (data && typeof data[v] !== "undefined") {
          data = data[v];
        } else {
          data = null;
        }
      });
      return data;
    }
  }
  return config;
};

/** 获取项目动态全局配置 */
export const getPlatformConfig = async (app: App): Promise<undefined> => {
  app.config.globalProperties.$config = getConfig();
  const publicPath = getSafePublicPath();
  const url = `${publicPath}platform-config.json`;
  return axios({
    method: "get",
    url
  })
    .then(({ data: config }) => {
      let $config = app.config.globalProperties.$config;
      // 自动注入系统配置
      if (app && $config && typeof config === "object") {
        $config = Object.assign($config, config);
        app.config.globalProperties.$config = $config;
        // 设置全局配置
        setConfig($config);
      }
      return $config;
    })
    .catch(() => {
      throw "请在public文件夹下添加platform-config.json配置文件";
    });
};

/** 本地响应式存储的命名空间 */
const responsiveStorageNameSpace = () => getConfig().ResponsiveStorageNameSpace;

export { getConfig, setConfig, responsiveStorageNameSpace };
