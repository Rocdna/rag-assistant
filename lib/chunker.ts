/**
 * 文本分块器
 *
 * 将长文档切成小段落，以便进行向量化和检索
 */

export interface ChunkOptions {
  chunkSize?: number;      // 块大小（字符数）
  chunkOverlap?: number;   // 块重叠大小
}

/**
 * 按字数分块
 *
 * @param text 原始文本
 * @param options 分块配置
 * @returns 分块后的文本数组
 */
export function chunkBySize(
  text: string,
  options: ChunkOptions = {}
): string[] {
  const { chunkSize = 500, chunkOverlap = 50 } = options;

  // 清理文本
  const cleanedText = text
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanedText.length <= chunkSize) {
    return [cleanedText];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < cleanedText.length) {
    // 找到当前块的结束位置
    let endIndex = startIndex + chunkSize;

    // 如果不是最后一块，尝试在句号、换行符或逗号处断开
    if (endIndex < cleanedText.length) {
      // 优先在换行符处断开
      const lastNewline = cleanedText.lastIndexOf('\n', endIndex);
      if (lastNewline > startIndex + chunkSize * 0.5) {
        endIndex = lastNewline + 1;
      } else {
        // 否则在句号或逗号处断开
        const lastPeriod = Math.max(
          cleanedText.lastIndexOf('。', endIndex),
          cleanedText.lastIndexOf('.', endIndex),
          cleanedText.lastIndexOf('，', endIndex),
          cleanedText.lastIndexOf(',', endIndex)
        );
        if (lastPeriod > startIndex + chunkSize * 0.5) {
          endIndex = lastPeriod + 1;
        }
      }
    }

    // 提取当前块
    const chunk = cleanedText.slice(startIndex, endIndex).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    // 移动起始位置（考虑重叠）
    startIndex = endIndex - chunkOverlap;
    if (startIndex <= chunks.length && chunks.length > 0 && chunks[chunks.length - 1] === cleanedText.slice(startIndex, endIndex).trim()) {
      // 防止死循环
      startIndex = startIndex + chunkOverlap;
    }
  }

  return chunks;
}

/**
 * 按段落分块
 *
 * @param text 原始文本
 * @param maxChunkSize 每个块的最大字符数
 * @returns 分块后的文本数组
 */
export function chunkByParagraph(
  text: string,
  maxChunkSize: number = 500
): string[] {
  // 按换行符分割段落
  const paragraphs = text
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    // 如果单个段落超过最大大小，进一步分割
    if (paragraph.length > maxChunkSize) {
      // 先保存当前块
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      // 递归分割大段落
      const subChunks = chunkBySize(paragraph, {
        chunkSize: maxChunkSize,
        chunkOverlap: Math.floor(maxChunkSize * 0.1),
      });
      chunks.push(...subChunks);
    } else if (currentChunk.length + paragraph.length + 1 <= maxChunkSize) {
      // 当前块加上这个段落还在限制内
      currentChunk += (currentChunk ? '\n' : '') + paragraph;
    } else {
      // 保存当前块，开始新块
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = paragraph;
    }
  }

  // 处理最后一个块
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * 智能分块
 *
 * @param text 原始文本
 * @param options 分块配置
 * @returns 分块后的文本数组
 */
export function chunkText(
  text: string,
  options: ChunkOptions = {}
): string[] {
  const { chunkSize = 500, chunkOverlap = 50 } = options;

  // 清理文本
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanedText.length <= chunkSize) {
    return [cleanedText];
  }

  // 先尝试按段落分割
  const paragraphs = cleanedText.split(/\n+/).filter(p => p.trim());

  if (paragraphs.length > 1) {
    // 多段落情况：按段落分组
    return chunkByParagraph(cleanedText, chunkSize);
  } else {
    // 单段落情况：按字数分割
    return chunkBySize(cleanedText, options);
  }
}
