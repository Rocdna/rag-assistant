/**
 * 文档上传与索引 Hook
 *
 * 功能：
 * - 管理文档列表状态（Supabase 持久化）
 * - 文件上传到服务器
 * - 文档内容解析
 * - SSE 流式索引进度跟踪
 * - 文档删除（Supabase 元数据 + Pinecone 向量）
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Document } from '@/types/chat';

const SUPPORTED_TYPES = ['.pdf', '.txt', '.docx', '.doc', '.md'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

interface IndexingProgress {
  stage: string;
  progress: number;
  message: string;
}

interface UseDocumentIndexOptions {
  userId?: string;
  onUploadComplete?: (doc: Document & { content: string }) => void;
  onError?: (error: string) => void;
  onIndexComplete?: (docId: string, chunkCount: number) => void;
}

/**
 * 文档上传与索引 Hook
 */
export function useDocumentIndex(options: UseDocumentIndexOptions = {}) {
  const { userId, onUploadComplete, onError, onIndexComplete } = options;

  const [documents, setDocuments] = useState<(Document & { indexed: boolean; chunkCount?: number })[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [indexingId, setIndexingId] = useState<string | null>(null);
  const [indexingProgress, setIndexingProgress] = useState<IndexingProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================
  // 核心：从 Supabase 加载文档列表
  // ============================================================
  const loadDocumentsFromSupabase = useCallback(async (uid: string) => {
    try {
      const res = await fetch('/api/documents', {
        headers: { 'x-user-id': uid },
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('[loadDocumentsFromSupabase] server error:', data.error);
        throw new Error(data.error || '加载文档列表失败');
      }
      // 映射 Supabase 字段 → 前端字段
      const docs = (data.documents || []).map((d: Record<string, unknown>) => ({
        id: d.id as string,
        name: d.name as string,
        size: d.size as number,
        type: d.type as string,
        indexed: d.indexed as boolean,
        chunkCount: d.chunk_count as number,
      }));
      setDocuments(docs);
    } catch (e) {
      console.error('加载文档列表失败:', e);
    }
  }, []);

  // userId 变化时（登录）从 Supabase 加载
  useEffect(() => {
    if (userId) {
      loadDocumentsFromSupabase(userId);
    } else {
      setDocuments([]);
    }
  }, [userId, loadDocumentsFromSupabase]);

  // ============================================================
  // 文档操作：写入 Supabase（上传后）/ 更新 Supabase（索引后）/ 删除 Supabase
  // ============================================================

  /** 创建文档记录（上传后调用） */
  const createDocumentRecord = useCallback(async (doc: Document & { content: string }) => {
    if (!userId) return;
    try {
      await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          id: doc.id,
          name: doc.name,
          size: doc.size,
          type: doc.type,
        }),
      });
    } catch (e) {
      console.error('创建文档记录失败:', e);
    }
  }, [userId]);

  /** 更新文档状态（索引完成后调用） */
  const updateDocumentRecord = useCallback(async (docId: string, chunkCount: number) => {
    if (!userId) return;
    try {
      await fetch('/api/documents', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          id: docId,
          indexed: true,
          chunk_count: chunkCount,
        }),
      });
    } catch (e) {
      console.error('更新文档状态失败:', e);
    }
  }, [userId]);

  /** 删除文档记录 */
  const deleteDocumentRecord = useCallback(async (docId: string) => {
    if (!userId) return;
    try {
      await fetch('/api/documents', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ documentId: docId }),
      });
    } catch (e) {
      console.error('删除文档记录失败:', e);
    }
  }, [userId]);

  /**
   * 验证文件类型和大小
   */
  const validateFile = useCallback((file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!SUPPORTED_TYPES.includes(ext)) {
      return `不支持的文件类型: ${file.name}，仅支持 PDF、TXT、DOCX、MD`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `文件超过 25MB 限制: ${file.name}`;
    }
    return null;
  }, []);

  /**
   * 上传文件到服务器
   */
  const uploadFile = useCallback(async (file: File): Promise<Document & { content: string } | null> => {
    const error = validateFile(file);
    if (error) {
      onError?.(error);
      return null;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const headers: Record<string, string> = {};
      if (userId) headers['x-user-id'] = userId;

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '上传失败');
      }

      const doc = data.document as Document & { content: string };

      // 写入 Supabase 文档记录
      await createDocumentRecord(doc);

      return doc;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      onError?.(errorMessage);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [validateFile, onError, userId, createDocumentRecord]);

  /**
   * 处理文档索引（SSE 流式进度）
   */
  const indexDocument = useCallback(async (doc: Document & { content?: string }): Promise<void> => {
    if (!doc.content) return;

    setIndexingId(doc.id);
    setIndexingProgress({ stage: 'starting', progress: 0, message: '开始索引...' });

    try {
      const indexHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      };
      if (userId) indexHeaders['x-user-id'] = userId;

      const response = await fetch('/api/index', {
        method: 'POST',
        headers: indexHeaders,
        body: JSON.stringify({
          documentId: doc.id,
          documentName: doc.name,
          content: doc.content,
          chunkSize: 500,
          chunkOverlap: 50,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '索引失败');
      }

      // 读取 SSE 流
      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.stage === 'error') {
                throw new Error(data.message);
              }

              if (data.stage === 'complete') {
                setIndexingProgress({ stage: 'complete', progress: 100, message: '索引完成' });
                // 更新本地状态
                setDocuments((prev) =>
                  prev.map((d) =>
                    d.id === doc.id ? { ...d, indexed: true, chunkCount: data.chunkCount } : d
                  )
                );
                // 更新 Supabase 记录
                await updateDocumentRecord(doc.id, data.chunkCount);
                onIndexComplete?.(doc.id, data.chunkCount);
              } else {
                // 更新进度
                setIndexingProgress({
                  stage: data.stage,
                  progress: data.progress,
                  message: data.message,
                });
              }
            } catch {
              // 忽略 JSON 解析错误（可能是部分数据）
            }
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      onError?.(errorMessage);
    } finally {
      setIndexingId(null);
      setTimeout(() => setIndexingProgress(null), 2000);
    }
  }, [onError, onIndexComplete, userId, updateDocumentRecord]);

  /**
   * 上传并自动索引
   */
  const uploadAndIndex = useCallback(async (file: File): Promise<void> => {
    // 上传文件（已在 uploadFile 中写 Supabase）
    const doc = await uploadFile(file);
    if (!doc) return;

    // 检查是否已存在同名文档（从当前列表判断）
    const existingDoc = documents.find((d) => d.name === doc.name);

    // 更新本地列表（未索引状态）
    if (existingDoc) {
      setDocuments((prev) =>
        prev.map((d) => d.id === existingDoc.id ? { ...doc, indexed: false, chunkCount: 0 } : d)
      );
    } else {
      setDocuments((prev) => [{ ...doc, indexed: false }, ...prev]);
    }

    onUploadComplete?.(doc);

    // 如果是同名文档替换，先删除云端旧向量再重新索引
    if (existingDoc) {
      await fetch('/api/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: existingDoc.id, userId }),
      });
    }

    // 自动索引
    await indexDocument(doc);
  }, [uploadFile, indexDocument, onUploadComplete, documents]);

  /**
   * 删除文档（Pinecone 向量 + Supabase 记录）
   */
  const deleteDocument = useCallback(async (docId: string): Promise<void> => {
    // 先从列表移除，用户立即看到效果
    setDocuments((prev) => prev.filter((d) => d.id !== docId));

    try {
      // 并行删除 Pinecone 向量 + Supabase 记录
      await Promise.all([
        fetch('/api/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: docId, userId }),
        }),
        deleteDocumentRecord(docId),
      ]);
    } catch (error) {
      console.error('删除文档失败:', error);
    }
  }, [userId, deleteDocumentRecord]);

  /**
   * 清空所有文档（云端 + 本地）
   */
  const clearAllDocuments = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    if (!userId) return { success: false, message: '未登录' };
    try {
      // 删除 Pinecone 所有向量
      const res = await fetch('/api/delete-all', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '清空失败');
      // 清空本地列表
      setDocuments([]);
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : '清空失败' };
    }
  }, [userId]);

  /**
   * 点击上传按钮 - 触发文件选择
   */
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * 文件选择后的处理 - 仅上传，不自动索引
   */
  const handleFileSelect = useCallback((
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file).then((doc) => {
        if (!doc) return;
        setDocuments((prev) => {
          const existingIndex = prev.findIndex((d) => d.name === doc.name);
          if (existingIndex >= 0) {
            const existingDoc = prev[existingIndex];
            deleteDocument(existingDoc.id);
            return [...prev.slice(0, existingIndex), { ...doc, indexed: false, chunkCount: 0 }, ...prev.slice(existingIndex + 1)];
          }
          return [{ ...doc, indexed: false }, ...prev];
        });
        onUploadComplete?.(doc);
      });
    }
    e.target.value = '';
  }, [uploadFile, onUploadComplete, deleteDocument]);

  /**
   * 拖拽文件后的处理 - 仅上传，不自动索引
   */
  const handleDrop = useCallback(async (file: File): Promise<void> => {
    const doc = await uploadFile(file);
    if (!doc) return;
    setDocuments((prev) => {
      const existingIndex = prev.findIndex((d) => d.name === doc.name);
      if (existingIndex >= 0) {
        const existingDoc = prev[existingIndex];
        deleteDocument(existingDoc.id);
        return [...prev.slice(0, existingIndex), { ...doc, indexed: false, chunkCount: 0 }, ...prev.slice(existingIndex + 1)];
      }
      return [{ ...doc, indexed: false }, ...prev];
    });
    onUploadComplete?.(doc);
  }, [uploadFile, onUploadComplete, deleteDocument]);

  return {
    // State
    documents,
    isUploading,
    indexingId,
    indexingProgress,
    fileInputRef,
    // Actions
    uploadFile,
    uploadAndIndex,
    indexDocument,
    deleteDocument,
    clearAllDocuments,
    handleUploadClick,
    handleFileSelect,
    handleDrop,
    validateFile,
    SUPPORTED_TYPES,
  };
}
