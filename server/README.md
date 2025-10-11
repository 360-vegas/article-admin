# 域名检测服务器

这是一个用于检测域名注册状态的Node.js服务器。

## 功能特点

- 使用DNS查询检测域名是否已注册
- 支持单个和批量域名检测
- 使用多个DNS服务器提高准确性
- 使用DNS over HTTPS作为备用检测方式
- 限制并发请求避免过载

## 安装和启动

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 启动服务器

```bash
npm start
```

或者使用开发模式（自动重启）：

```bash
npm run dev
```

服务器将在 http://localhost:3333 启动

## API接口

### 单个域名检测

**POST** `/domain/check`

请求体：
```json
{
  "domain": "example.com"
}
```

响应：
```json
{
  "domain": "example.com",
  "available": false,
  "status": "registered",
  "message": "Domain has DNS records"
}
```

### 批量域名检测

**POST** `/domain/batch-check`

请求体：
```json
{
  "domains": ["example1.com", "example2.com", "example3.com"]
}
```

响应：
```json
{
  "results": [
    {
      "domain": "example1.com",
      "available": false,
      "status": "registered",
      "message": "Domain has DNS records"
    },
    {
      "domain": "example2.com",
      "available": true,
      "status": "available",
      "message": "No DNS records found"
    }
  ],
  "timestamp": 1234567890000
}
```

### 健康检查

**GET** `/health`

响应：
```json
{
  "status": "ok",
  "timestamp": 1234567890000
}
```

## 检测原理

1. **DNS记录检查**：查询域名的A、AAAA、MX、NS、CNAME记录
2. **DNS over HTTPS**：使用Google DNS的DoH服务作为备用
3. **状态判断**：
   - 有DNS记录 = 已注册
   - 无DNS记录 = 可能未注册
   - 查询失败 = 错误状态

## 注意事项

- 此方法不能100%准确判断域名是否可注册
- 某些域名可能已注册但未设置DNS记录
- 建议配合WHOIS查询或域名注册商API获得更准确结果
- 批量检测限制每次最多100个域名
- 请合理使用，避免过度请求

## 生产环境建议

1. 添加请求限流保护
2. 使用缓存减少重复查询
3. 添加API密钥认证
4. 使用PM2或类似工具管理进程
5. 配置日志记录系统
