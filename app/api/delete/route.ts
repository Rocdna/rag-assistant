/**
 * 删除文档向量 API
 *
 * 功能：从 Pinecone 向量数据库中删除指定文档的所有向量
 */

import { deleteDocumentChunks } from '@/lib/pinecone';

export async function DELETE(req: Request) {
  try {
    const userId = req.headers.get('x-user-id') || undefined;
    const { documentId } = await req.json();

    if (!documentId) {
      return Response.json({ error: '缺少文档ID' }, { status: 400 });
    }

    // 删除向量数据库中的 chunks（按 userId 过滤，防止跨用户删除）
    await deleteDocumentChunks(documentId, userId);

    return Response.json({ success: true });
  } catch (error: any) {
    console.error('删除文档向量失败:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
