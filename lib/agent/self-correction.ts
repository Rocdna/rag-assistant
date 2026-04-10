/**
 * 自我纠错策略管理器
 *
 * 功能：
 * - 根据评估结果选择纠错策略
 * - 管理纠错循环，防止死循环
 */

import type { Evaluation } from './evaluator';
import type { ToolNameType } from '@/lib/tools/definitions';

/**
 * 纠错策略类型
 */
export type CorrectionStrategy =
  | 'continue'           // 继续，不纠错
  | 'rewrite_query'       // 改写查询词重新检索
  | 'expand_search'       // 扩大搜索范围
  | 'switch_to_web'       // 切换到联网搜索
  | 'retry'               // 重试当前工具
  | 'give_up';            // 放弃，结束纠错

/**
 * 纠错上下文
 */
export interface CorrectionContext {
  /** 当前工具名称 */
  currentTool: ToolNameType | string;
  /** 用户原始问题 */
  originalQuestion: string;
  /** 当前查询词 */
  currentQuery: string;
  /** 纠错次数 */
  correctionRound: number;
  /** 最大纠错次数 */
  maxCorrectionRounds: number;
  /** 是否已尝试联网 */
  hasTriedWebSearch: boolean;
}

/**
 * 纠错结果
 */
export interface CorrectionResult {
  /** 选择的策略 */
  strategy: CorrectionStrategy;
  /** 生成的新查询（如果有） */
  newQuery?: string;
  /** 是否继续循环 */
  shouldContinue: boolean;
  /** 纠错原因 */
  reason: string;
}

/**
 * 根据评估结果和上下文选择纠错策略
 */
export function selectStrategy(
  evaluation: Evaluation,
  context: CorrectionContext
): CorrectionResult {
  const { correctionRound, maxCorrectionRounds, hasTriedWebSearch, currentTool } = context;

  // 超过最大纠错次数，停止纠错
  if (correctionRound >= maxCorrectionRounds) {
    return {
      strategy: 'give_up',
      shouldContinue: false,
      reason: `已达到最大纠错次数（${maxCorrectionRounds}次），停止纠错`,
    };
  }

  // 根据评估建议和上下文选择策略
  switch (evaluation.suggestion) {
    case 'continue':
      return {
        strategy: 'continue',
        shouldContinue: false,
        reason: '评估通过，继续执行',
      };

    case 'retry':
      if (correctionRound < 2) {
        return {
          strategy: 'retry',
          shouldContinue: true,
          reason: `工具执行失败，尝试重试（第${correctionRound + 1}次）`,
        };
      }
      // 重试次数用完，尝试换策略
      return {
        strategy: 'switch_to_web',
        shouldContinue: true,
        reason: '重试次数用完，切换到联网搜索',
        newQuery: context.currentQuery,
      };

    case 'rewrite_query':
      return {
        strategy: 'rewrite_query',
        shouldContinue: true,
        reason: '评估建议改写查询词',
        newQuery: generateRewrittenQuery(context),
      };

    case 'expand_search':
      return {
        strategy: 'expand_search',
        shouldContinue: true,
        reason: '评估建议扩大搜索范围',
        newQuery: expandQuery(context),
      };

    case 'switch_to_web':
      if (hasTriedWebSearch) {
        // 已经尝试过联网，尝试扩大范围
        return {
          strategy: 'expand_search',
          shouldContinue: true,
          reason: '联网搜索无果，尝试扩大文档搜索范围',
          newQuery: expandQuery(context),
        };
      }
      return {
        strategy: 'switch_to_web',
        shouldContinue: true,
        reason: '文档搜索无果，切换到联网搜索',
        newQuery: context.currentQuery,
      };

    default:
      // 评估分数过低也触发纠错
      if (evaluation.total < 6) {
        if (!hasTriedWebSearch && currentTool.toString().includes('document')) {
          return {
            strategy: 'switch_to_web',
            shouldContinue: true,
            reason: `结果评分过低（${evaluation.total}/10），切换到联网搜索`,
            newQuery: context.currentQuery,
          };
        }
        return {
          strategy: 'expand_search',
          shouldContinue: true,
          reason: `结果评分过低（${evaluation.total}/10），扩大搜索范围`,
          newQuery: expandQuery(context),
        };
      }

      return {
        strategy: 'continue',
        shouldContinue: false,
        reason: '评估通过',
      };
  }
}

/**
 * 生成改写后的查询词
 * 改写策略：简化、提取核心实体、换角度
 */
function generateRewrittenQuery(context: CorrectionContext): string {
  const { currentQuery, originalQuestion } = context;

  // 如果当前查询和原始问题不同，说明已经改写过一次了
  // 尝试从原始问题重新生成
  if (currentQuery !== originalQuestion) {
    // 提取核心名词
    const coreTerms = extractCoreTerms(originalQuestion);
    return coreTerms || currentQuery;
  }

  // 第一次改写：提取核心术语
  const coreTerms = extractCoreTerms(currentQuery);
  return coreTerms || `关于 ${currentQuery} 的详细信息`;
}

/**
 * 提取查询的核心术语
 */
function extractCoreTerms(query: string): string | null {
  // 移除常见停用词
  const stopWords = ['的', '了', '是', '在', '和', '与', '对', '有', '吗', '呢', '吧', '啊', '怎么样', '如何', '什么', '为什么', '怎么'];
  let cleaned = query;

  for (const word of stopWords) {
    cleaned = cleaned.replace(new RegExp(word, 'g'), ' ');
  }

  // 提取连续的中文术语（2个字符以上）
  const terms = cleaned.match(/[\u4e00-\u9fa5]{2,}/g);

  if (terms && terms.length > 0) {
    // 返回最长的几个术语组合
    return terms.slice(0, 3).join(' ');
  }

  return null;
}

/**
 * 扩大搜索范围的查询
 */
function expandQuery(context: CorrectionContext): string {
  const { currentQuery, originalQuestion } = context;

  // 策略：追加"详细"、"相关内容"等，或使用更通用的表述
  const expansions = [
    `${currentQuery} 相关内容`,
    `${currentQuery} 详细信息`,
    originalQuestion,
  ];

  return expansions[Math.floor(Math.random() * expansions.length)];
}

/**
 * 创建纠错上下文
 */
export function createCorrectionContext(
  toolName: string,
  question: string,
  query: string,
  maxRounds: number = 3
): CorrectionContext {
  return {
    currentTool: toolName,
    originalQuestion: question,
    currentQuery: query,
    correctionRound: 0,
    maxCorrectionRounds: maxRounds,
    hasTriedWebSearch: false,
  };
}
