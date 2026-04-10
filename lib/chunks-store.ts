/**
 * Chunks 本地存储
 *
 * 用于 BM25 混合检索，需要保存所有文档的 chunks 副本
 * 注意：适合小规模文档（<10000 chunks），大规模请用 Qdrant/Elasticsearch
 */

import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const CHUNKS_FILE = path.join(DATA_DIR, 'chunks.json');

interface ChunkDoc {
  id: string;
  documentId: string;
  documentName: string;
  content: string;
  chunkIndex: number;
  version: number;    // 版本号，用于增量更新判断
  updatedAt: number; // 更新时间
}

interface ChunksStore {
  chunks: ChunkDoc[];
  updatedAt: number;
}

type ChunkResult = {
  id: string;
  content: string;
  metadata: { documentId: string; documentName: string; chunkIndex: number; version: number };
};

/**
 * 将 ChunkDoc 转换为统一结果格式
 */
function mapChunkToResult(chunk: ChunkDoc): ChunkResult {
  return {
    id: chunk.id,
    content: chunk.content,
    metadata: {
      documentId: chunk.documentId,
      documentName: chunk.documentName,
      chunkIndex: chunk.chunkIndex,
      version: chunk.version,
    },
  };
}

/**
 * 确保数据目录存在
 */
async function ensureDataDir(): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

/**
 * 加载 chunks 存储
 */
async function loadChunksStore(): Promise<ChunksStore> {
  try {
    const data = await fs.readFile(CHUNKS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { chunks: [], updatedAt: 0 };
  }
}

/**
 * 保存 chunks 存储
 */
async function saveChunksStore(store: ChunksStore): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(CHUNKS_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

/**
 * 添加文档 chunks 到本地存储
 *
 * @param chunks 文本块数组
 * @param documentId 文档ID
 * @param documentName 文档名称
 * @param version 版本号（时间戳），用于增量更新判断
 */
export async function addChunksToStore(
  chunks: string[],
  documentId: string,
  documentName: string,
  version?: number
): Promise<number> {
  const store = await loadChunksStore();
  const now = version ?? Date.now();

  // 删除该文档已有的 chunks（如果是更新）
  store.chunks = store.chunks.filter(c => c.documentId !== documentId);

  // 添加新的 chunks
  const newChunks: ChunkDoc[] = chunks.map((content, idx) => ({
    id: `${documentId}-${idx}`,
    documentId,
    documentName,
    content,
    chunkIndex: idx,
    version: now,
    updatedAt: now,
  }));

  store.chunks.push(...newChunks);
  store.updatedAt = now;

  await saveChunksStore(store);

  return newChunks.length;
}

/**
 * 获取所有 chunks（用于 BM25 检索）
 */
export async function getAllChunksFromStore(): Promise<ChunkResult[]> {
  const store = await loadChunksStore();
  return store.chunks.map(mapChunkToResult);
}

/**
 * 按文档名获取 chunks
 */
export async function getChunksByDocument(documentName: string): Promise<ChunkResult[]> {
  const store = await loadChunksStore();
  return store.chunks
    .filter(c => c.documentName === documentName)
    .map(mapChunkToResult);
}

/**
 * 按文档ID获取 chunks（用于检查文档是否存在）
 */
export async function getChunksByDocumentId(documentId: string): Promise<ChunkDoc[]> {
  const store = await loadChunksStore();
  return store.chunks.filter(c => c.documentId === documentId);
}

/**
 * 删除文档的 chunks
 */
export async function deleteChunksFromStore(documentId: string): Promise<void> {
  const store = await loadChunksStore();

  store.chunks = store.chunks.filter(c => c.documentId !== documentId);
  store.updatedAt = Date.now();

  await saveChunksStore(store);
}

/**
 * 获取存储统计
 */
export async function getChunksStoreStats(): Promise<{
  totalChunks: number;
  totalDocuments: number;
  updatedAt: number;
}> {
  const store = await loadChunksStore();

  const uniqueDocs = new Set(store.chunks.map(c => c.documentId));

  return {
    totalChunks: store.chunks.length,
    totalDocuments: uniqueDocs.size,
    updatedAt: store.updatedAt,
  };
}
