/**
 * RRF (Reciprocal Rank Fusion) 融合排序算法
 *
 * 功能：
 * - 将多个检索结果按排名融合
 * - 向量检索 + BM25 检索 结果合并
 */

import type { BM25Doc } from './bm25';

export interface RetrievedDoc {
  id: string;
  content: string;
  score: number;
  metadata: unknown;
}

/**
 * RRF 融合排序
 * @param vectorResults 向量检索结果
 * @param bm25Results BM25 检索结果
 * @param k RRF 参数，默认 60
 */
export function reciprocalRankFusion(
  vectorResults: RetrievedDoc[],
  bm25Results: Array<{ doc: BM25Doc; score: number }>,
  k: number = 60
): RetrievedDoc[] {
  const scoreMap = new Map<string, number>();
  const docMap = new Map<string, RetrievedDoc>();

  // 向量检索得分
  vectorResults.forEach((doc, idx) => {
    const rrfScore = 1 / (k + idx + 1);
    scoreMap.set(doc.id, (scoreMap.get(doc.id) || 0) + rrfScore);
    docMap.set(doc.id, doc);
  });

  // BM25 检索得分
  bm25Results.forEach((item, idx) => {
    const rrfScore = 1 / (k + idx + 1);
    scoreMap.set(item.doc.id, (scoreMap.get(item.doc.id) || 0) + rrfScore);
    docMap.set(item.doc.id, {
      id: item.doc.id,
      content: item.doc.content,
      score: item.score,
      metadata: item.doc.metadata,
    });
  });

  // 按 RRF 综合分数排序
  const fused = Array.from(scoreMap.entries())
    .map(([id, rrfScore]) => ({
      ...docMap.get(id)!,
      rrfScore,
    }))
    .sort((a, b) => b.rrfScore - a.rrfScore);

  return fused;
}
