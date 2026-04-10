/**
 * 工具函数
 */

export function cn(...classes: (string | boolean | undefined | null | Record<string, boolean>)[]): string {
  return classes
    .filter(Boolean)
    .map((c) => {
      if (typeof c === 'string') return c;
      if (typeof c === 'object') {
        return Object.entries(c || {})
          .filter(([, v]) => v)
          .map(([k]) => k)
          .join(' ');
      }
      return '';
    })
    .filter(Boolean)
    .join(' ');
}

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * 判断是否为支持的文件类型
 */
export function isSupportedFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ['pdf', 'txt', 'docx', 'doc', 'md'].includes(ext);
}
