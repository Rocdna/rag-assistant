/**
 * 删除文档向量 API
 *
 * 功能：从 Pinecone 向量数据库中删除指定文档的所有向量
 */

import { deleteDocumentChunks } from '@/lib/pinecone';

export async function DELETE(req: Request) {
  try {
    const headerUserId = req.headers.get('x-user-id');
    const { documentId, userId: bodyUserId } = await req.json();

    if (!headerUserId) {
      return Response.json({ error: '缺少用户身份' }, { status: 401 });
    }
    if (!documentId) {
      return Response.json({ error: '缺少文档ID' }, { status: 400 });
    }
    // 二次校验：body 中的 userId 必须与 header 一致，防止绕过
    if (bodyUserId && bodyUserId !== headerUserId) {
      return Response.json({ error: '用户身份不匹配' }, { status: 403 });
    }

    // 删除向量数据库中的 chunks（按 userId 过滤，防止跨用户删除）
    await deleteDocumentChunks(documentId, headerUserId);

    return Response.json({ success: true });
  } catch (error: any) {
    console.error('删除文档向量失败:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
