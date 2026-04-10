/**
 * BM25 关键词检索算法
 *
 * 功能：
 * - 中文按字符分词，英文按空格分词
 * - 计算 TF-IDF 风格的文本相关性分数
 */

export interface BM25Doc {
  id: string;
  content: string;
  metadata: unknown;
}

/**
 * 简单分词（中文按字符，英文按空格）
 */
export function tokenize(text: string): string[] {
  // 中文：按字符分
  const chineseChars = text.match(/[\u4e00-\u9fa5]/gu) || [];
  // 英文：按空格和标点分
  const englishWords = text.toLowerCase().split(/[\s\p{P}]+/u).filter(w => w.length > 1);
  // 合并
  return [...chineseChars, ...englishWords];
}

/**
 * 计算 BM25 分数
 * @param query 查询文本
 * @param doc 文档内容
 * @param allDocs 所有文档（用于计算 IDF）
 * @param k1 BM25 参数，默认 1.5
 * @param b BM25 参数，默认 0.75
 */
export function bm25Score(
  query: string,
  doc: string,
  allDocs: string[],
  k1: number = 1.5,
  b: number = 0.75
): number {
  const queryTerms = tokenize(query);
  const docTerms = tokenize(doc);
  const docLength = docTerms.length;
  const avgDocLength = allDocs.reduce((sum, d) => sum + tokenize(d).length, 0) / allDocs.length;

  let score = 0;

  for (const term of queryTerms) {
    // Term Frequency
    const tf = docTerms.filter(t => t === term).length / docLength;

    // Inverse Document Frequency
    const numDocsWithTerm = allDocs.filter(d => tokenize(d).includes(term)).length;
    const idf = numDocsWithTerm === 0
      ? 0
      : Math.log((allDocs.length - numDocsWithTerm + 0.5) / (numDocsWithTerm + 0.5) + 1);

    // BM25 formula
    const termWeight = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * docLength / avgDocLength));
    score += idf * termWeight;
  }

  return score;
}

/**
 * BM25 检索
 * @param query 查询文本
 * @param docs 文档数组
 * @param topK 返回数量
 */
export function bm25Search(
  query: string,
  docs: BM25Doc[],
  topK: number
): Array<{ doc: BM25Doc; score: number }> {
  const allContents = docs.map(d => d.content);

  const scored = docs.map(doc => ({
    doc,
    score: bm25Score(query, doc.content, allContents),
  }));

  // 按分数降序排序
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
}
