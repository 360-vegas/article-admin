/**
 * 安全的字符串分割函数
 * 防止在 undefined 或 null 值上调用 split 方法
 */
export function safeSplit(
  str: string | undefined | null,
  separator: string | RegExp,
  limit?: number
): string[] {
  if (!str || typeof str !== 'string') {
    return [];
  }

  try {
    if (limit !== undefined) {
      return str.split(separator, limit);
    }
    return str.split(separator);
  } catch (error) {
    console.warn('safeSplit 发生错误:', error);
    return [];
  }
}

/**
 * 安全的字符串分割并过滤空值
 */
export function safeSplitAndFilter(
  str: string | undefined | null,
  separator: string | RegExp,
  limit?: number
): string[] {
  return safeSplit(str, separator, limit)
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

/**
 * 安全的字符串分割并映射
 */
export function safeSplitAndMap<T>(
  str: string | undefined | null,
  separator: string | RegExp,
  mapper: (item: string, index: number) => T,
  limit?: number
): T[] {
  return safeSplit(str, separator, limit).map(mapper);
}
