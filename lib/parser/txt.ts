/**
 * TXT 文件解析器
 */

export async function parseTxt(file: File): Promise<string> {
  const text = await file.text();
  return text;
}
