/**
 * 工具结果评估器
 *
 * 功能：
 * - 评估工具执行结果的质量（相关性 + 充分性）
 * - 判断是否需要纠错
 */

import OpenAI from 'openai';
import type { ToolResult } from '@/types/chat';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

/**
 * 评估结果结构
 */
export interface Evaluation {
  /** 相关性分数 1-5 */
  relevance: number;
  /** 充分性分数 1-5 */
  sufficiency: number;
  /** 总分 */
  total: number;
  /** 评估理由 */
  reasoning: string;
  /** 建议的纠错策略 */
  suggestion: 'continue' | 'rewrite_query' | 'expand_search' | 'switch_to_web' | 'retry';
  /** 是否需要纠错 */
  needsCorrection: boolean;
}

/**
 * 评估工具执行结果是否能回答用户问题
 *
 * @param question 用户问题
 * @param toolName 工具名称
 * @param toolResult 工具执行结果
 * @returns 评估结果
 */
export async function evaluateToolResult(
  question: string,
  toolName: string,
  toolResult: ToolResult
): Promise<Evaluation> {
  // 如果工具执行失败，直接建议重试
  if (!toolResult.success) {
    return {
      relevance: 0,
      sufficiency: 0,
      total: 0,
      reasoning: `工具执行失败: ${toolResult.error}`,
      suggestion: 'retry',
      needsCorrection: true,
    };
  }

  const result = toolResult.result;

  // 空结果处理
  if (!result || result.trim() === '' || result.includes('未找到') || result.includes('知识库为空')) {
    return {
      relevance: 0,
      sufficiency: 0,
      total: 0,
      reasoning: '工具返回结果为空或未找到相关内容',
      suggestion: toolName.includes('document') ? 'switch_to_web' : 'rewrite_query',
      needsCorrection: true,
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: process.env.DEFAULT_MODEL || 'qwen3.6-flash',
      messages: [
        {
          role: 'system',
          content: `你是一个专业的搜索结果评估专家。请评估检索结果是否能回答用户问题。

评估标准：
1. 相关性（1-5分）：结果与问题主题的匹配程度。5分表示完全匹配，1分表示完全不相关。
2. 充分性（1-5分）：结果内容是否足够详细、完整。5分表示非常充分，1分表示非常不足。

请用 JSON 格式返回评估结果：
{
  "relevance": 数字,
  "sufficiency": 数字,
  "reasoning": "评估理由（20字以内）",
  "suggestion": "纠错建议（continue/rewrite_query/expand_search/switch_to_web/retry）",
  "needsCorrection": boolean
}

纠错建议说明：
- continue：结果质量良好，可以继续
- rewrite_query：需要改写查询词重新检索
- expand_search：需要扩大搜索范围
- switch_to_web：需要切换到联网搜索
- retry：需要重试当前工具`,
        },
        {
          role: 'user',
          content: `用户问题：${question}\n\n工具名称：${toolName}\n\n检索结果：${result.slice(0, 1000)}${result.length > 1000 ? '...' : ''}`,
        },
      ],
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || '{}';

    // 解析 JSON 响应
    try {
      // 尝试提取 JSON（可能有 markdown 代码块）
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      const parsed = JSON.parse(jsonStr);

      return {
        relevance: Math.min(5, Math.max(1, parsed.relevance || 3)),
        sufficiency: Math.min(5, Math.max(1, parsed.sufficiency || 3)),
        total: 0,
        reasoning: parsed.reasoning || '评估完成',
        suggestion: ['continue', 'rewrite_query', 'expand_search', 'switch_to_web', 'retry'].includes(parsed.suggestion)
          ? parsed.suggestion
          : 'continue',
        needsCorrection: parsed.needsCorrection ?? false,
      };
    } catch {
      // 解析失败，使用默认评估
      return defaultEvaluation(result);
    }
  } catch (error) {
    // LLM 调用失败，返回默认评估
    console.error('评估器 LLM 调用失败:', error);
    return defaultEvaluation(result);
  }
}

/**
 * 默认评估（当 LLM 调用失败时使用）
 */
function defaultEvaluation(result: string): Evaluation {
  const isEmpty = !result || result.trim() === '' || result.includes('未找到');
  const isShort = result.length < 50;

  return {
    relevance: isEmpty ? 1 : 3,
    sufficiency: isEmpty ? 1 : isShort ? 2 : 3,
    total: isEmpty ? 2 : isShort ? 5 : 6,
    reasoning: '默认评估',
    suggestion: isEmpty ? 'switch_to_web' : isShort ? 'expand_search' : 'continue',
    needsCorrection: isEmpty || isShort,
  };
}

/**
 * 快速检查结果是否为空（不需要调用 LLM）
 */
export function isResultEmpty(toolResult: ToolResult): boolean {
  if (!toolResult.success) return true;
  const result = toolResult.result;
  return !result || result.trim() === '' ||
    result.includes('未找到') ||
    result.includes('知识库为空') ||
    result.includes('没有上传任何文档');
}
