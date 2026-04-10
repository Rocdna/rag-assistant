/**
 * DOCX 文件解析器
 *
 * 使用 mammoth 解析 Word 文档
 */

import mammoth from 'mammoth';

export async function parseDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  // mammoth.extractRawText 期望 buffer 或 path 选项，不是 arrayBuffer
  const buffer = Buffer.from(arrayBuffer);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
