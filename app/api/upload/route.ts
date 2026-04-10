/**
 * 文件上传 API
 *
 * 功能：接收上传的文件，解析内容，返回文本
 */

import { parseDocument } from '@/lib/parser';
import { generateId } from '@/lib/utils';

export const maxDuration = 120; // 120秒超时

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return Response.json({ error: '没有上传文件' }, { status: 400 });
    }

    // 检查文件类型
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'txt', 'docx', 'doc', 'md'].includes(ext || '')) {
      return Response.json(
        { error: '不支持的文件类型，仅支持 PDF、TXT、DOCX、MD' },
        { status: 400 }
      );
    }

    let content;
    try {
      content = await parseDocument(file);
    } catch (parseError: any) {
      console.error('Parse error:', parseError);
      return Response.json({ error: '解析文档失败: ' + parseError.message }, { status: 500 });
    }

    // 生成文档ID
    const documentId = generateId();

    return Response.json({
      success: true,
      document: {
        id: documentId,
        name: file.name,
        size: file.size,
        type: ext,
        content,
      },
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
