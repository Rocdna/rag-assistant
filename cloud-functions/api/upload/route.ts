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
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return Response.json({ error: '缺少用户身份' }, { status: 401 });
    }

    console.log(`[${new Date().toISOString()}] 开始处理上传请求`);
    const startTime = Date.now();

    const formData = await req.formData();

    const file = formData.get('file') as File;

    console.log(`文件大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

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
      const parseStart = Date.now();

      content = await parseDocument(file);

      console.log(`parseDocument 耗时: ${(Date.now() - parseStart) / 1000}秒`);
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
