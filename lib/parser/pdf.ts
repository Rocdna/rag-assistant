/**
 * PDF 文件解析器
 *
 * 使用 pdfjs-dist v5 legacy 构建（Node.js 友好版）
 * 注意：legacy 构建避免了 DOMMatrix 等浏览器 API 在 Node.js 中的问题
 */

import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

/**
 * 解析 PDF 文件
 *
 * @param file PDF 文件
 * @returns 提取的文本内容
 */
export async function parsePdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;

  const textParts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ');
    textParts.push(pageText);
  }

  return textParts.join('\n').trim();
}
