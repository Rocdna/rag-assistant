/**
 * 混合检索入口
 *
 * 功能：
 * - 组合向量检索 + BM25 + RRF 融合
 * - 支持 HyDE 假设答案增强
 * - 提供统一的检索接口
 */

import { retrieveRelevantChunks } from '@/lib/chromadb';
import type { BM25Doc } from './bm25';
import { bm25Search } from './bm25';
import type { RetrievedDoc } from './rrf';
import { reciprocalRankFusion } from './rrf';
import { generateHypotheticalAnswer, quickVerify, verifyAndCorrectHyDE } from './hyde';

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: unknown;
  source: 'vector' | 'bm25' | 'rrf';
}

export interface SearchStats {
  vectorTime: number;
  hydeTime: number;
  correctionTime: number;
  bm25Time: number;
  rrfTime: number;
  wasCorrected: boolean;
}

export interface HybridSearchOptions {
  topK: number;
  documentName?: string;
  useHyDE?: boolean;
  useHybrid?: boolean;
  model?: string;
}

/**
 * 混合检索 + HyDE 修正
 *
 * @param query 检索 query
 * @param options 检索选项
 * @param allChunks BM25 检索用文档（可选，如果不传，只做向量检索）
 */
export async function hybridSearchWithHyDE(
  query: string,
  options: HybridSearchOptions,
  allChunks?: BM25Doc[]
): Promise<{
  results: SearchResult[];
  stats: SearchStats;
}> {
  const {
    topK,
    documentName,
    useHyDE = false,
    useHybrid = false,
    model = 'qwen3-max',
  } = options;

  const stats: SearchStats = {
    vectorTime: 0,
    hydeTime: 0,
    correctionTime: 0,
    bm25Time: 0,
    rrfTime: 0,
    wasCorrected: false,
  };

  let searchQuery = query;
  let hydeCorrectedQuery = query;

  // Step 1: HyDE 扩展（如果启用）
  if (useHyDE) {
    const hydeStart = Date.now();
    searchQuery = await generateHypotheticalAnswer(searchQuery, model);
    stats.hydeTime = Date.now() - hydeStart;
    console.log(`[HyDE] 生成假设答案耗时: ${stats.hydeTime}ms`);
    console.log(`[HyDE] 假设答案: ${searchQuery.slice(0, 100)}...`);
  }

  // Step 2: 向量检索（初步检索，用于 HyDE 修正）
  const vectorStart = Date.now();
  // 多取一些结果，用于 HyDE 修正验证
  const initialResults = await retrieveRelevantChunks(searchQuery, topK * 3, documentName);
  stats.vectorTime = Date.now() - vectorStart;

  let results: SearchResult[] = initialResults.map(r => ({ ...r, source: 'vector' as const }));

  // Step 3: HyDE 修正（如果启用）
  if (useHyDE && results.length > 0) {
    const correctionStart = Date.now();

    // 优先用快速验证（不需要 LLM 调用）
    const quickResult = quickVerify(query, searchQuery, results);

    if (quickResult.wasCorrected) {
      // 快速验证认为需要修正，再用 LLM 修正
      console.log(`[HyDE] 快速验证发现可能偏离，开始 LLM 验证...`);

      const { corrected, wasCorrected } = await verifyAndCorrectHyDE(
        query,
        searchQuery,
        results,
        model
      );

      stats.correctionTime = Date.now() - correctionStart;
      stats.wasCorrected = wasCorrected;

      console.log(`[HyDE] ${wasCorrected ? '已修正' : 'LLM验证通过'}`);
      console.log(`[HyDE] LLM 修正耗时: ${stats.correctionTime}ms`);

      if (wasCorrected) {
        hydeCorrectedQuery = corrected;
        const reRetreiveStart = Date.now();
        results = (await retrieveRelevantChunks(corrected, topK, documentName))
          .map(r => ({ ...r, source: 'vector' as const }));
        stats.vectorTime += Date.now() - reRetreiveStart;
      }
    } else {
      // 快速验证通过，不需要修正
      stats.correctionTime = Date.now() - correctionStart;
      stats.wasCorrected = false;
      console.log(`[HyDE] 快速验证通过，跳过 LLM 修正`);
    }
  }

  // Step 4: 混合检索（如果启用且有 allChunks）
  if (useHybrid && allChunks && allChunks.length > 0) {
    const bm25Start = Date.now();
    const bm25Results = bm25Search(hydeCorrectedQuery, allChunks, topK * 2);
    stats.bm25Time = Date.now() - bm25Start;

    const rrfStart = Date.now();
    const rrfResults = reciprocalRankFusion(results, bm25Results, 60);
    stats.rrfTime = Date.now() - rrfStart;

    console.log(`[混合检索] 向量: ${results.length}个, BM25: ${bm25Results.length}个, RRF融合后: ${rrfResults.length}个`);

    results = rrfResults.slice(0, topK).map(r => ({ ...r, source: 'rrf' as const }));
  } else {
    results = results.slice(0, topK).map(r => ({ ...r, source: 'vector' as const }));
  }

  return {
    results,
    stats,
  };
}
