/**
 * 删除文档向量 API
 *
 * 功能：从向量数据库和本地 chunks-store 中删除指定文档的所有向量
 */

import { deleteDocumentChunks } from '@/lib/chromadb';
import { deleteChunksFromStore } from '@/lib/chunks-store';

export async function DELETE(req: Request) {
  try {
    const { documentId } = await req.json();

    if (!documentId) {
      return Response.json({ error: '缺少文档ID' }, { status: 400 });
    }

    // 删除向量数据库中的 chunks
    await deleteDocumentChunks(documentId);

    // 删除本地 chunks-store 中的 chunks
    await deleteChunksFromStore(documentId);

    return Response.json({ success: true });
  } catch (error: any) {
    console.error('删除文档向量失败:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
