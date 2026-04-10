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
const EMBEDDING_DIMENSION = 1536;
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 100; // Pinecone 免费版限制：每秒约 10 次 upsert

// Pinecone index 引用缓存
let pineconeIndex: ReturnType<typeof pinecone.index> | null = null;

function getIndex() {
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
 */
export async function addDocumentChunks(
  chunks: string[],
  documentId: string,
  documentName: string,
  startIndex: number = 0,
  onProgress?: ProgressCallback,
  version?: number
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
 */
export async function retrieveRelevantChunks(
  query: string,
  topK: number = 5,
  filterDocumentName?: string
): Promise<Array<{ id: string; content: string; score: number; metadata: unknown }>> {
  // 将查询转为向量
  const queryEmbedding = await getEmbedding(query);

  const index = getIndex();

  // 构建过滤条件
  const filter = filterDocumentName
    ? { documentName: { $eq: filterDocumentName } }
    : undefined;

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
 */
export async function deleteDocumentChunks(documentId: string): Promise<void> {
  const index = getIndex();

  try {
    // 通过 filter 直接删除匹配的向量（带重试）
    await withRetry(
      () => index.deleteMany({
        filter: { documentId: { $eq: documentId } },
      }),
      {
        maxRetries: 2,
        initialDelayMs: 1000,
        operationName: 'deleteMany',
      }
    );
  } catch (error) {
    console.error('删除文档块失败:', error);
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
