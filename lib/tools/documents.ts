/**
 * 文档工具封装
 *
 * 功能：
 * - search_documents - 搜索 Pinecone 向量数据库
 * - list_documents - 列出用户所有文档
 * - get_documents_stats - 获取用户文档统计
 */

import { retrieveRelevantChunks, getUserStats } from '@/lib/pinecone';
import type { ToolResult } from '@/types/chat';

/**
 * 执行文档工具
 *
 * @param toolName 工具名称
 * @param args 工具参数
 * @param userId 用户ID（可选，用于多用户隔离）
 * @returns 工具执行结果
 */
export async function executeDocumentTool(
  toolName: string,
  args: Record<string, unknown>,
  userId?: string
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case 'search_documents': {
        const query = args.query as string;
        const documentName = args.documentName as string | undefined;

        if (!query) {
          return { success: false, result: '', error: 'query 参数不能为空' };
        }

        if (!userId) {
          return { success: false, result: '', error: '缺少用户身份' };
        }

        const topK = 5;
        const results = await retrieveRelevantChunks(query, topK, documentName, userId);

        if (results.length === 0) {
          return { success: true, result: '未找到相关内容' };
        }

        const formatted = results
          .map((r, i) => `[${i + 1}号文档 - ${(r.metadata as { documentName?: string })?.documentName || '未知'}] ${r.content}`)
          .join('\n\n');

        return { success: true, result: formatted };
      }

      case 'list_documents': {
        if (!userId) {
          return { success: true, result: '（暂无文档）' };
        }

        // 从 Pinecone 查询用户所有文档（分批拉取，聚合 documentName）
        const index = (await import('@/lib/pinecone')).getIndex();
        const docMap = new Map<string, number>();
        let cursor: string | undefined;

        while (true) {
          const result = await index.query({
            vector: new Array(1536).fill(0),
            topK: 1000,
            filter: { userId: { $eq: userId } },
            includeMetadata: true,
            cursor,
          });

          for (const match of result.matches || []) {
            const docName = match.metadata?.documentName as string | undefined;
            if (docName) {
              docMap.set(docName, (docMap.get(docName) || 0) + 1);
            }
          }

          if (!result.pagination?.cursor) break;
          cursor = result.pagination.cursor;
        }

        const docList = Array.from(docMap.entries())
          .map(([name, count]) => `- ${name} (${count} 个片段)`)
          .join('\n');

        return {
          success: true,
          result: `共有 ${docMap.size} 个文档，总计 ${Array.from(docMap.values()).reduce((a, b) => a + b, 0)} 个片段：\n${docList || '（暂无文档）'}`,
        };
      }

      case 'get_documents_stats': {
        if (!userId) {
          return {
            success: true,
            result: '文档数量：0\n片段数量：0',
          };
        }
        const stats = await getUserStats(userId);
        return {
          success: true,
          result: `文档数量：${stats.totalDocuments}\n片段数量：${stats.totalChunks}`,
        };
      }

      default:
        return { success: false, result: '', error: `未知文档工具: ${toolName}` };
    }
  } catch (error) {
    return {
      success: false,
      result: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
