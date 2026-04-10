/**
 * Tavily 搜索工具
 */

import { tavily } from '@tavily/core';
import type { ToolResult } from '@/types/chat';

export async function executeSearchTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    const { query } = args as { query: string };

    if (!query) {
      return { success: false, result: '', error: '搜索关键词不能为空' };
    }

    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      return { success: false, result: '', error: '未配置 TAVILY_API_KEY 环境变量' };
    }

    const tvly = tavily({ apiKey });
    const response = await tvly.search(query, {
      maxResults: 5,
      includeAnswer: true,
    });

    if (!response.results || response.results.length === 0) {
      return { success: true, result: '未找到相关搜索结果', error: '' };
    }

    // 格式化结果
    const formattedResults = response.results.map((item, index) =>
      `[${index + 1}] ${item.title}\n${item.url}\n${item.content?.slice(0, 300) || ''}`
    ).join('\n\n');

    let result = `搜索结果：\n\n${formattedResults}`;

    if (response.answer) {
      result = `【摘要】${response.answer}\n\n${result}`;
    }

    return { success: true, result, error: '' };
  } catch (e) {
    return {
      success: false,
      result: '',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
