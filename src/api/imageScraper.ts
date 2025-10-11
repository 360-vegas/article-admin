export interface ImageItem {
  src: string;
  alt?: string;
  title?: string;
}

/**
 * 使用公共CORS代理获取网页内容
 * @param url 目标URL
 * @returns HTML内容
 */
async function fetchWithCorsProxy(url: string): Promise<string> {
  // 使用公共CORS代理服务
  const proxyUrls = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://cors-anywhere.herokuapp.com/${url}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
  ];

  for (const proxyUrl of proxyUrls) {
    try {
      const response = await fetch(proxyUrl);
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.warn(`Proxy failed: ${proxyUrl}`, error);
    }
  }

  // 如果所有代理都失败，尝试直接获取（可能会因为CORS失败）
  const response = await fetch(url);
  return await response.text();
}

/**
 * 从HTML内容中提取图片
 * @param html HTML内容
 * @param baseUrl 基础URL，用于处理相对路径
 * @returns 图片列表
 */
function extractImagesFromHtml(html: string, baseUrl: string): ImageItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const images: ImageItem[] = [];

  // 获取所有img标签
  const imgElements = doc.querySelectorAll('img');

  imgElements.forEach(img => {
    let src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');

    if (src) {
      // 处理相对路径
      if (!src.startsWith('http') && !src.startsWith('//')) {
        try {
          const url = new URL(baseUrl);
          if (src.startsWith('/')) {
            src = url.origin + src;
          } else {
            src = url.origin + url.pathname.replace(/\/[^\/]*$/, '/') + src;
          }
        } catch (e) {
          console.warn('Invalid URL:', src);
          return;
        }
      } else if (src.startsWith('//')) {
        src = 'https:' + src;
      }

      images.push({
        src,
        alt: img.getAttribute('alt') || '',
        title: img.getAttribute('title') || ''
      });
    }
  });

  // 获取CSS背景图片
  const elementsWithBg = doc.querySelectorAll('[style*="background-image"]');
  elementsWithBg.forEach(el => {
    const style = el.getAttribute('style') || '';
    const match = style.match(/background-image:\s*url\(['"]?([^'")]+)['"]?\)/);
    if (match && match[1]) {
      let bgUrl = match[1];
      if (!bgUrl.startsWith('http') && !bgUrl.startsWith('//')) {
        try {
          const url = new URL(baseUrl);
          if (bgUrl.startsWith('/')) {
            bgUrl = url.origin + bgUrl;
          } else {
            bgUrl = url.origin + url.pathname.replace(/\/[^\/]*$/, '/') + bgUrl;
          }
        } catch (e) {
          console.warn('Invalid URL:', bgUrl);
          return;
        }
      } else if (bgUrl.startsWith('//')) {
        bgUrl = 'https:' + bgUrl;
      }

      images.push({
        src: bgUrl,
        alt: '',
        title: 'Background Image'
      });
    }
  });

  // 去重
  const uniqueImages = Array.from(new Set(images.map(img => img.src)))
    .map(src => images.find(img => img.src === src)!);

  return uniqueImages;
}

/**
 * 从指定URL抓取图片（前端实现）
 * @param url 要抓取的网页URL
 * @returns 图片列表
 */
export async function scrapeImagesFromUrl(url: string): Promise<ImageItem[]> {
  try {
    // 尝试获取网页内容
    const html = await fetchWithCorsProxy(url);

    // 从HTML中提取图片
    const images = extractImagesFromHtml(html, url);

    return images;
  } catch (error) {
    console.error('Failed to scrape images:', error);
    throw new Error('无法获取网页内容，可能是跨域限制或网络问题');
  }
}

/**
 * 从用户粘贴的HTML内容中提取图片
 * @param html HTML内容
 * @param baseUrl 基础URL（可选）
 * @returns 图片列表
 */
export function extractImagesFromPastedHtml(html: string, baseUrl: string = window.location.origin): ImageItem[] {
  return extractImagesFromHtml(html, baseUrl);
}
