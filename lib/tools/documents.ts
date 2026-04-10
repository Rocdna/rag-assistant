/**
 * 文档工具封装
 *
 * 功能：
 * - search_documents - 搜索本地文档
 * - list_documents - 列出所有本地文档
 * - get_documents_stats - 获取本地文档统计
 */

import { retrieveRelevantChunks } from '@/lib/chromadb';
import { getAllChunksFromStore, getChunksStoreStats } from '@/lib/chunks-store';
import type { ToolResult } from '@/types/chat';

/**
 * 执行文档工具
 *
 * @param toolName 工具名称
 * @param args 工具参数
 * @returns 工具执行结果
 */
export async function executeDocumentTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case 'search_documents': {
        const query = args.query as string;
        const documentName = args.documentName as string | undefined;

        if (!query) {
          return { success: false, result: '', error: 'query 参数不能为空' };
        }

        const topK = 5;
        const results = await retrieveRelevantChunks(query, topK, documentName);

        if (results.length === 0) {
          return { success: true, result: '未找到相关内容' };
        }

        const formatted = results
          .map((r, i) => `[${i + 1}号文档 - ${(r.metadata as { documentName?: string })?.documentName || '未知'}] ${r.content}`)
          .join('\n\n');

        return { success: true, result: formatted };
      }

      case 'list_documents': {
        const stats = await getChunksStoreStats();
        const allChunks = await getAllChunksFromStore();

        // 按文档名分组
        const docMap = new Map<string, number>();
        for (const chunk of allChunks) {
          const name = chunk.metadata.documentName;
          docMap.set(name, (docMap.get(name) || 0) + 1);
        }

        const docList = Array.from(docMap.entries())
          .map(([name, count]) => `- ${name} (${count} 个片段)`)
          .join('\n');

        return {
          success: true,
          result: `共有 ${stats.totalDocuments} 个文档，总计 ${stats.totalChunks} 个片段：\n${docList || '（暂无文档）'}`,
        };
      }

      case 'get_documents_stats': {
        const stats = await getChunksStoreStats();
        return {
          success: true,
          result: `文档数量：${stats.totalDocuments}\n片段数量：${stats.totalChunks}\n最后更新：${stats.updatedAt ? new Date(stats.updatedAt).toLocaleString() : '无'}`,
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
