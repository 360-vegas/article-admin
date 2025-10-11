const express = require('express');
const cors = require('cors');
const dns = require('dns').promises;
const net = require('net');
const https = require('https');

const app = express();
const PORT = 3333;

// 中间件配置
app.use(cors());
app.use(express.json());

// DNS服务器列表
const DNS_SERVERS = [
  '8.8.8.8',      // Google DNS
  '1.1.1.1',      // Cloudflare DNS
  '223.5.5.5',    // 阿里DNS
  '114.114.114.114' // 114 DNS
];

// 检查域名是否有DNS记录
async function checkDNSRecords(domain) {
  try {
    // 尝试解析域名的各种记录
    const checks = [
      dns.resolve4(domain).catch(() => null),    // A记录
      dns.resolve6(domain).catch(() => null),    // AAAA记录
      dns.resolveMx(domain).catch(() => null),   // MX记录
      dns.resolveNs(domain).catch(() => null),   // NS记录
      dns.resolveCname(domain).catch(() => null) // CNAME记录
    ];

    const results = await Promise.all(checks);

    // 如果有任何一种记录存在，说明域名已被注册
    return results.some(result => result !== null);
  } catch (error) {
    console.error(`DNS check error for ${domain}:`, error.message);
    return null;
  }
}

// 使用免费的域名查询API (通过DNS over HTTPS)
async function checkDomainViaDoH(domain) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'dns.google',
      path: `/resolve?name=${domain}&type=A`,
      method: 'GET',
      headers: {
        'Accept': 'application/dns-json'
      }
    };

    https.get(options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          // Status 0 = NOERROR (域名存在), Status 3 = NXDOMAIN (域名不存在)
          if (json.Status === 0 && json.Answer && json.Answer.length > 0) {
            resolve(true); // 域名已注册
          } else if (json.Status === 3) {
            resolve(false); // 域名可能未注册
          } else {
            resolve(null); // 不确定
          }
        } catch (error) {
          resolve(null);
        }
      });
    }).on('error', () => {
      resolve(null);
    });
  });
}

// 检查域名格式是否有效
function isValidDomain(domain) {
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
  return domainRegex.test(domain);
}

// 综合检查域名状态
async function comprehensiveCheck(domain) {
  if (!isValidDomain(domain)) {
    return {
      domain,
      available: false,
      status: 'error',
      message: 'Invalid domain format'
    };
  }

  try {
    // 1. 先通过DNS记录检查
    const hasDNS = await checkDNSRecords(domain);

    // 2. 如果DNS检查不确定，使用DoH再次确认
    if (hasDNS === null) {
      const dohResult = await checkDomainViaDoH(domain);

      if (dohResult !== null) {
        return {
          domain,
          available: !dohResult,
          status: dohResult ? 'registered' : 'available',
          message: dohResult ? 'Domain has DNS records' : 'No DNS records found'
        };
      }
    } else {
      return {
        domain,
        available: !hasDNS,
        status: hasDNS ? 'registered' : 'available',
        message: hasDNS ? 'Domain has DNS records' : 'No DNS records found'
      };
    }

    // 3. 如果都无法确定，返回不确定状态
    return {
      domain,
      available: false,
      status: 'error',
      message: 'Unable to determine domain status'
    };
  } catch (error) {
    return {
      domain,
      available: false,
      status: 'error',
      message: error.message
    };
  }
}

// API路由

// 单个域名检测
app.post('/domain/check', async (req, res) => {
  const { domain } = req.body;

  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  const result = await comprehensiveCheck(domain);
  res.json(result);
});

// 批量域名检测
app.post('/domain/batch-check', async (req, res) => {
  const { domains } = req.body;

  if (!domains || !Array.isArray(domains)) {
    return res.status(400).json({ error: 'Domains array is required' });
  }

  if (domains.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 domains per request' });
  }

  // 批量检测，但限制并发数量避免过载
  const batchSize = 5;
  const results = [];

  for (let i = 0; i < domains.length; i += batchSize) {
    const batch = domains.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(domain => comprehensiveCheck(domain))
    );
    results.push(...batchResults);

    // 添加小延迟避免请求过快
    if (i + batchSize < domains.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  res.json({
    results,
    timestamp: Date.now()
  });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Domain check server is running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  POST /domain/check - Check single domain');
  console.log('  POST /domain/batch-check - Check multiple domains');
  console.log('  GET /health - Health check');
});

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
