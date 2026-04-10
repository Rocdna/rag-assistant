/**
 * HyDE (Hypothetical Document Embeddings) 假设答案生成与修正
 *
 * 功能：
 * - 根据用户问题生成假设性答案
 * - 验证假设答案与检索结果的一致性
 * - 对偏离的假设答案进行修正
 */

import OpenAI from 'openai';
import type { RetrievedDoc } from './rrf';
import { tokenize } from './bm25';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

// ============================================================
// HyDE Prompt 模板
// ============================================================

const HYDE_PROMPT = `你是一个文档片段生成器。请根据用户问题，生成一个假设性的文档片段来回答。

要求：
1. 写得像是从真实技术文档或知识库中摘录的
2. 内容详细，包含相关术语、概念、技术细节
3. 长度适中（100-300字）
4. 风格正式、专业

问题：{query}

假设性文档：`;

const HYDE_CORRECTION_PROMPT = `判断：假设答案和检索文档是否匹配？

假设答案：{hypotheticalAnswer}
文档摘要：{docSummary}

一致回复：OK
不一致回复：FIX: [修正版]`;

// ============================================================
// 假设答案生成
// ============================================================

/**
 * 生成假设答案（用于 HyDE）
 */
export async function generateHypotheticalAnswer(query: string, model: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model,
    messages: [{ role: 'user', content: HYDE_PROMPT.replace('{query}', query) }],
    temperature: 0.7,
    max_tokens: 500,
  });

  return response.choices[0]?.message?.content || query;
}

// ============================================================
// 假设答案验证与修正
// ============================================================

/**
 * 快速验证（简化版：用预设判断替代 LLM）
 * 只检查关键词是否出现在检索结果中
 */
export function quickVerify(
  query: string,
  hypotheticalAnswer: string,
  retrievedDocs: RetrievedDoc[]
): { corrected: string; wasCorrected: boolean } {
  if (retrievedDocs.length === 0) {
    return { corrected: hypotheticalAnswer, wasCorrected: false };
  }

  // 提取假设答案中的关键词（在检索结果中查找）
  const answerTerms = tokenize(hypotheticalAnswer).slice(0, 10);
  const docContents = retrievedDocs.map(d => d.content.toLowerCase());

  // 检查有多少关键词出现在文档中
  let matchCount = 0;
  for (const term of answerTerms) {
    if (docContents.some(content => content.includes(term))) {
      matchCount++;
    }
  }

  const matchRatio = answerTerms.length > 0 ? matchCount / answerTerms.length : 0;

  // 如果匹配度 > 60%，认为基本一致
  if (matchRatio > 0.6) {
    return { corrected: hypotheticalAnswer, wasCorrected: false };
  }

  // 否则用 LLM 修正
  return { corrected: hypotheticalAnswer, wasCorrected: true };
}

/**
 * 验证并修正 HyDE 假设答案
 * @returns 修正后的答案，以及是否被修正过
 */
export async function verifyAndCorrectHyDE(
  query: string,
  hypotheticalAnswer: string,
  retrievedDocs: RetrievedDoc[],
  model: string
): Promise<{ corrected: string; wasCorrected: boolean }> {
  // 只取前5个文档的摘要，避免 prompt 太长
  const docSummary = retrievedDocs
    .slice(0, 5)
    .map((d, i) => `[文档${i + 1}] ${d.content.slice(0, 200)}`)
    .join('\n');

  const prompt = HYDE_CORRECTION_PROMPT
    .replace('{hypotheticalAnswer}', hypotheticalAnswer)
    .replace('{docSummary}', docSummary);

  const response = await openai.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 500,
  });

  const result = response.choices[0]?.message?.content || '';

  if (result.startsWith('OK')) {
    return { corrected: hypotheticalAnswer, wasCorrected: false };
  }

  if (result.startsWith('FIX:')) {
    const correctedAnswer = result.slice('FIX:'.length).trim();
    return { corrected: correctedAnswer, wasCorrected: true };
  }

  // 默认返回原始答案
  return { corrected: hypotheticalAnswer, wasCorrected: false };
}
