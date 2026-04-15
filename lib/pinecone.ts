/**
 * Pinecone 向量数据库
 *
 * 功能：
 * 1. 存储文档的文本向量
 * 2. 检索最相关的文档块
 */

import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

// Pinecone 客户端
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const INDEX_NAME = process.env.PINECONE_INDEX || 'rag-assistant';
const EMBEDDING_MODEL = 'text-embedding-v2';
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 100; // Pinecone 免费版限制：每秒约 10 次 upsert

// Pinecone index 引用缓存
let pineconeIndex: ReturnType<typeof pinecone.index> | null = null;

export function getIndex() {
  if (!pineconeIndex) {
    pineconeIndex = pinecone.index({ name: INDEX_NAME });
  }
  return pineconeIndex;
}

// OpenAI 客户端（用于生成 embedding）
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

/**
 * 获取文本的 embedding 向量
 *
 * 注意：OpenAI embedding API 输入限制为 2048 字符，超长文本会被截断
 */
async function getEmbedding(text: string): Promise<number[]> {
  // 空文本抛出错误（不应发生，但如果发生说明调用方有 bug）
  if (!text || text.trim().length === 0) {
    throw new Error('Embedding query cannot be empty');
  }

  // 截断超长文本（保留前 2048 字符）
  const truncatedText = text.length > 2048 ? text.slice(0, 2048) : text;

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: truncatedText,
  });
  return response.data[0].embedding;
}

interface VectorRecord {
  id: string;
  values: number[];
  metadata: {
    content: string;
    documentId: string;
    documentName: string;
    chunkIndex: number;
    version: number;    // 版本号，用于增量更新判断
    updatedAt: number; // 更新时间
    userId: string;     // 用户ID，用于多用户隔离
  };
}

type ProgressCallback = (processed: number, total: number) => void;

// ============================================================
// 工具函数：带重试的请求
// ============================================================

/**
 * 带重试的 Pinecone 操作
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    operationName?: string;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    operationName = 'operation',
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 如果已经超过最大重试次数
      if (attempt >= maxRetries) {
        console.error(`[Pinecone] ${operationName} 失败，已重试 ${maxRetries} 次:`, lastError.message);
        throw lastError;
      }

      // 判断是否是网络/超时错误，可以重试
      const isRetryable =
        lastError.message.includes('fetch failed') ||
        lastError.message.includes('timeout') ||
        lastError.message.includes('ECONNRESET') ||
        lastError.message.includes('ETIMEDOUT') ||
        lastError.message.includes('ConnectTimeoutError') ||
        lastError.message.includes('PineconeConnectionError');

      if (!isRetryable) {
        console.error(`[Pinecone] ${operationName} 失败（非网络错误，不重试）:`, lastError.message);
        throw lastError;
      }

      // 指数退避
      const delay = Math.min(initialDelayMs * Math.pow(2, attempt), maxDelayMs);
      console.warn(`[Pinecone] ${operationName} 第 ${attempt + 1} 次尝试失败，${delay}ms 后重试...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * 添加文档块到向量数据库（分批处理）
 *
 * @param chunks 文本块数组
 * @param documentId 文档ID
 * @param documentName 文档名称
 * @param startIndex 起始索引（用于续传时避免ID冲突）
 * @param onProgress 进度回调函数
 * @param version 版本号（时间戳），用于增量更新判断
 * @param userId 用户ID，用于多用户隔离
 */
export async function addDocumentChunks(
  chunks: string[],
  documentId: string,
  documentName: string,
  startIndex: number = 0,
  onProgress?: ProgressCallback,
  version?: number,
  userId?: string
): Promise<number> {
  const index = getIndex();
  const totalChunks = chunks.length;
  const totalBatches = Math.ceil(totalChunks / BATCH_SIZE);
  const now = version || Date.now();

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const batchStart = batchIdx * BATCH_SIZE;
    const batchEnd = Math.min(batchStart + BATCH_SIZE, chunks.length);
    const batchChunks = chunks.slice(batchStart, batchEnd);

    // 批量生成 embedding（并行 API 调用）
    const embeddings = await Promise.all(
      batchChunks.map(chunk => getEmbedding(chunk))
    );

    const vectors: VectorRecord[] = batchChunks.map((chunk, i) => ({
      id: `${documentId}-${startIndex + batchStart + i}`,
      values: embeddings[i],
      metadata: {
        content: chunk,
        documentId,
        documentName,
        chunkIndex: startIndex + batchStart + i,
        version: now,
        updatedAt: now,
        userId: userId || 'anonymous',
      },
    }));

    // 批量 upsert 到 Pinecone（带重试）
    await withRetry(
      () => index.upsert({ records: vectors }),
      {
        maxRetries: 3,
        initialDelayMs: 2000,
        operationName: `批次 ${batchIdx + 1}/${totalBatches} upsert`,
      }
    );
    console.log(`[Pinecone] 批次 ${batchIdx + 1}/${totalBatches} 上传完成 (${vectors.length} 个向量)`);

    // 报告进度
    const processed = batchEnd;
    const progressPercent = Math.round((processed / totalChunks) * 100);
    console.log(`[Pinecone] 进度回调: ${processed}/${totalChunks} = ${progressPercent}%`);
    onProgress?.(processed, totalChunks);

    // Pinecone 免费版限制：每秒约 10 次 upsert，每批之间稍作延迟
    if (batchIdx < totalBatches - 1) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  return totalChunks;
}

/**
 * 检索最相关的文档块
 *
 * @param query 查询文本
 * @param topK 返回数量
 * @param filterDocumentName 按文档名过滤（可选）
 * @param userId 用户ID（必填，用于多用户隔离）
 */
export async function retrieveRelevantChunks(
  query: string,
  topK: number = 5,
  filterDocumentName?: string,
  userId?: string
): Promise<Array<{ id: string; content: string; score: number; metadata: unknown }>> {
  // 将查询转为向量
  const queryEmbedding = await getEmbedding(query);

  const index = getIndex();

  // 构建过滤条件：强制按 userId 隔离
  const filter: Record<string, unknown> = {};
  if (userId) {
    filter.userId = { $eq: userId };
  }
  if (filterDocumentName) {
    filter.documentName = { $eq: filterDocumentName };
  }

  // 查询 Pinecone（带重试）
  const results = await withRetry(
    () => index.query({
      vector: queryEmbedding,
      topK,
      filter,
      includeMetadata: true,
    }),
    {
      maxRetries: 2,
      initialDelayMs: 1000,
      operationName: 'query',
    }
  );

  // 格式化返回结果
  return (results.matches || []).map(match => ({
    id: match.id || '',
    content: match.metadata?.content as string || '',
    score: match.score || 0,
    metadata: {
      documentId: match.metadata?.documentId,
      documentName: match.metadata?.documentName,
      chunkIndex: match.metadata?.chunkIndex,
      version: match.metadata?.version as number || 0,
    },
  }));
}

/**
 * 删除文档的所有块
 *
 * @param documentId 文档ID
 * @param userId 用户ID（必填，防止跨用户删除）
 */
export async function deleteDocumentChunks(documentId: string, userId?: string): Promise<void> {
  const index = getIndex();

  try {
    // 构建过滤条件：必须匹配 documentId + userId（防止跨用户删除）
    const filter: Record<string, unknown> = { documentId: { $eq: documentId } };
    if (userId) {
      filter.userId = { $eq: userId };
    }

    // 先 fetch 查所有匹配的向量 ID（避免 deleteMany 纯 filter 报 400）
    const fetchResult = await (index.query as any)({
      vector: new Array(1536).fill(0),
      topK: 10000,
      filter,
      includeMetadata: false,
    });

    const matchIds = (fetchResult.matches || []).map((m: any) => m.id);

    if (matchIds.length === 0) {
      // 向量不存在，当作成功（幂等）
      return;
    }

    // 按 ID 删除，避免 filter 400 问题
    await withRetry(
      () => index.deleteMany({ ids: matchIds }),
      {
        maxRetries: 2,
        initialDelayMs: 1000,
        operationName: 'deleteMany',
      }
    );
  } catch (error: any) {
    // 向量不存在（404）或 ID 不存在，当作成功（幂等）
    if (
      error?.message?.includes('404') ||
      error?.message?.includes('Either') ||
      error?.message?.includes('not found')
    ) return;
    console.error('删除文档块失败:', error);
  }
}

/**
 * 清空向量数据库中的所有向量
 * 注意：调用前请先检查向量库是否为空
 *
 * @param userId 用户ID（可选）。如果不传，删除所有向量；如果传了，只删除该用户的向量
 */
export async function deleteAllVectors(userId?: string): Promise<void> {
  const index = getIndex();

  try {
    if (userId) {
      // 按 userId 过滤删除：deleteMany 原生支持 filter
      console.log(`[Pinecone] 按 userId=${userId} 过滤删除向量`);
      await withRetry(
        () => index.deleteMany({ filter: { userId: { $eq: userId } } }),
        {
          maxRetries: 3,
          initialDelayMs: 1000,
          operationName: 'deleteAll (by userId)',
        }
      );
      console.log('[Pinecone] 已删除该用户的所有向量');
    } else {
      // 不传 userId，删除所有向量
      await withRetry(
        () => index.deleteAll(),
        {
          maxRetries: 3,
          initialDelayMs: 1000,
          operationName: 'deleteAll',
        }
      );
      console.log('[Pinecone] 已清空所有向量');
    }
  } catch (error) {
    console.error('清空向量数据库失败:', error);
    throw error;
  }
}

/**
 * 获取集合统计信息
 */
export async function getCollectionStats(): Promise<{
  count: number;
  documents: number;
}> {
  try {
    const index = getIndex();
    const stats = await index.describeIndexStats();

    const totalVectors = stats.totalRecordCount || 0;
    const dimension = stats.dimension || 0;

    // 估算文档数量（因为我们不知道具体每个文档有多少 chunks）
    // 这里返回一个估算值
    return {
      count: totalVectors,
      documents: dimension > 0 ? Math.floor(totalVectors / 10) : 0, // 假设每个文档约 10 个 chunks
    };
  } catch {
    return { count: 0, documents: 0 };
  }
}

/**
 * 获取用户文档统计
 *
 * @param userId 用户ID
 * @returns 用户在 Pinecone 中的文档统计
 */
export async function getUserStats(userId: string): Promise<{
  totalChunks: number;
  totalDocuments: number;
}> {
  const index = getIndex();
  const documentIds = new Set<string>();

  try {
    // 单次查询获取该用户所有向量（上限 10000）
    const result = await (index.query as any)({
      vector: new Array(1536).fill(0),
      topK: 10000,
      filter: { userId: { $eq: userId } },
      includeMetadata: true,
    });

    const matches = result.matches || [];
    for (const match of matches) {
      const docId = match.metadata?.documentId as string | undefined;
      if (docId) documentIds.add(docId);
    }

    return {
      totalChunks: matches.length,
      totalDocuments: documentIds.size,
    };
  } catch {
    return { totalChunks: 0, totalDocuments: 0 };
  }
}

/**
 * 获取用户所有 chunk 的原文（用于 BM25 检索）
 *
 * @param userId 用户ID
 * @param topK 最大返回数量（默认 10000）
 * @returns BM25Doc[] 格式的文档列表
 */
export async function getAllUserChunkContents(
  userId: string,
  topK: number = 10000
): Promise<Array<{ id: string; content: string; metadata: Record<string, unknown> }>> {
  const index = getIndex();

  try {
    // 单次查询，上限为 topK
    const result = await (index.query as any)({
      vector: new Array(1536).fill(0),
      topK,
      filter: { userId: { $eq: userId } },
      includeMetadata: true,
    });

    const matches = result.matches || [];
    return matches
      .map((match: any) => {
        const content = match.metadata?.content as string | undefined;
        if (!content) return null;
        return {
          id: match.id,
          content,
          metadata: {
            documentId: match.metadata?.documentId,
            documentName: match.metadata?.documentName,
            chunkIndex: match.metadata?.chunkIndex,
          },
        };
      })
      .filter((item: any) => item !== null);
  } catch (error) {
    console.error('[Pinecone] getAllUserChunkContents 失败:', error);
    return [];
  }
}
