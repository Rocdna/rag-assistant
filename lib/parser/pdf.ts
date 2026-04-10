/**
 * PDF 文件解析器
 *
 * 使用 pdf-parse v2 解析 PDF 文件（Node.js 专用）
 * 注意：pdf-parse 会一次性加载整个文件到内存，适合中小型 PDF
 */

import { PDFParse } from 'pdf-parse';

/**
 * 解析 PDF 文件
 *
 * @param file PDF 文件
 * @returns 提取的文本内容
 */
export async function parsePdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // pdf-parse v2 API
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();

  return result.text.trim();
}
