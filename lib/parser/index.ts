/**
 * 文档解析统一入口
 */

import { parseTxt } from './txt';
import { parsePdf } from './pdf';
import { parseDocx } from './docx';
import { getFileExtension } from '../utils';

export type SupportedFileType = 'pdf' | 'txt' | 'docx' | 'doc' | 'md';

export async function parseDocument(file: File): Promise<string> {
  const ext = getFileExtension(file.name);

  switch (ext) {
    case 'pdf':
      return await parsePdf(file);
    case 'txt':
    case 'md':
      return await parseTxt(file);
    case 'docx':
    case 'doc':
      return await parseDocx(file);
    default:
      throw new Error(`不支持的文件类型: .${ext}`);
  }
}
