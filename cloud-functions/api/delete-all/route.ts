/**
 * 清空所有向量数据 API
 *
 * 功能：删除 Pinecone 中的所有向量数据（按用户隔离）
 */

import { getIndex, deleteAllVectors } from '@/lib/pinecone';

export async function DELETE(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');

    if (!userId) {
      return Response.json({ error: '缺少用户身份' }, { status: 401 });
    }

    // 先检查向量库是否为空
    const stats = await getIndex().describeIndexStats();
    const totalVectors = stats.totalRecordCount || 0;

    if (totalVectors === 0) {
      return Response.json({
        success: true,
        message: '向量库已经是空的',
        cleared: false,
      });
    }

    // 按 userId 删除该用户的所有向量
    await deleteAllVectors(userId);

    return Response.json({
      success: true,
      message: '已清空所有文档',
      cleared: true,
    });
  } catch (error: any) {
    console.error('清空向量数据失败:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
