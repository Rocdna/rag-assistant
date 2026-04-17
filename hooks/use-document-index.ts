/**
 * 文档上传与索引 Hook
 *
 * 功能：
 * - 管理文档列表状态
 * - 文件上传到服务器
 * - 文档内容解析
 * - SSE 流式索引进度跟踪
 * - 文档删除（前端 + 云端向量）
 * - 文档元数据持久化（localStorage）
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Document } from '@/types/chat';

const SUPPORTED_TYPES = ['.pdf', '.txt', '.docx', '.doc', '.md'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const DOCS_STORAGE_KEY = 'rag_documents';

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

  const [documents, setDocuments] = useState<(Document & { content?: string })[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [indexingId, setIndexingId] = useState<string | null>(null);
  const [indexingProgress, setIndexingProgress] = useState<IndexingProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 从 localStorage 加载文档列表
  const loadDocumentsFromStorage = useCallback((): (Document & { indexed: boolean; chunkCount?: number })[] => {
    try {
      const stored = localStorage.getItem(DOCS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('加载文档列表失败:', e);
    }
    return [];
  }, []);

  // 保存文档列表到 localStorage
  const saveDocumentsToStorage = useCallback((docs: (Document & { content?: string })[]) => {
    try {
      // 只保存元数据，不保存 content
      const metadata = docs.map(({ content: _content, ...rest }) => rest);
      localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(metadata));
    } catch (e) {
      console.error('保存文档列表失败:', e);
    }
  }, []);

  // 初始化：从 localStorage 加载文档列表
  useEffect(() => {
    const storedDocs = loadDocumentsFromStorage();
    if (storedDocs.length > 0) {
      setDocuments(storedDocs);
    }
  }, [loadDocumentsFromStorage]);

  // 文档列表变化时保存到 localStorage
  useEffect(() => {
    saveDocumentsToStorage(documents);
  }, [documents, saveDocumentsToStorage]);

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

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '上传失败');
      }

      return data.document as Document & { content: string };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      onError?.(errorMessage);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [validateFile, onError]);

  /**
   * 处理文档索引（SSE 流式进度）
   */
  const indexDocument = useCallback(async (doc: Document & { content: string }): Promise<void> => {
    if (!doc.content) return;

    setIndexingId(doc.id);
    setIndexingProgress({ stage: 'starting', progress: 0, message: '开始索引...' });

    try {
      const response = await fetch('/api/index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
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
                // 更新文档状态为已索引
                setDocuments((prev) =>
                  prev.map((d) =>
                    d.id === doc.id ? { ...d, indexed: true, chunkCount: data.chunkCount } : d
                  )
                );
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
  }, [onError, onIndexComplete]);

  /**
   * 上传并自动索引
   */
  const uploadAndIndex = useCallback(async (file: File): Promise<void> => {
    // 上传文件
    const doc = await uploadFile(file);
    if (!doc) return;

    // 检查是否已存在同名文档
    const existingDoc = documents.find((d) => d.name === doc.name);

    // 处理上传完成
    setDocuments((prev) => {
      if (existingDoc) {
        // 替换为新文档（new ID），保持未索引状态等待重新索引
        return prev.map((d) => d.id === existingDoc.id ? { ...doc, indexed: false, chunkCount: 0 } : d);
      }
      return [{ ...doc, indexed: false }, ...prev];
    });

    onUploadComplete?.(doc);

    // 如果是同名文档替换，先删除云端旧数据再重新索引
    if (existingDoc) {
      await fetch('/api/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: existingDoc.id }),
      });
    }

    // 自动索引
    await indexDocument(doc);
  }, [uploadFile, indexDocument, onUploadComplete, documents]);

  /**
   * 删除文档（云端 + 前端）
   * - 先从列表移除，用户立即看到效果
   * - 再调 API 删除 Pinecone 向量（幂等，404 当成功）
   * - 不依赖前端 indexed 状态，因为刷新后会丢失
   */
  const deleteDocument = useCallback(async (docId: string): Promise<void> => {
    // 先从列表移除，用户立即看到效果
    setDocuments((prev) => prev.filter((d) => d.id !== docId));

    try {
      await fetch('/api/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId, userId }),
      });
    } catch (error) {
      console.error('删除文档向量失败:', error);
    }
  }, []);

  /**
   * 清空所有文档（云端 + 本地）
   */
  const clearAllDocuments = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    // 调用统一清空 API，同时删除云端所有向量和本地 chunks
    try {
      const res = await fetch('/api/delete-all', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '清空失败');
      }
      setDocuments([]);
      localStorage.removeItem(DOCS_STORAGE_KEY);
      return { success: true, message: data.message };
    } catch (error) {
      console.error('清空文档向量失败:', error);
      return { success: false, message: error instanceof Error ? error.message : '清空失败' };
    }
  }, []);

  /**
   * 点击上传按钮 - 触发文件选择
   */
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * 文件选择后的处理 - 仅上传，不自动索引（由外部决定是否索引）
   */
  const handleFileSelect = useCallback((
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file).then((doc) => {
        if (!doc) return;
        // 添加到文档列表（标记为未索引）
        setDocuments((prev) => {
          // 如果已存在同名文档，替换
          const existingIndex = prev.findIndex((d) => d.name === doc.name);
          if (existingIndex >= 0) {
            const existingDoc = prev[existingIndex];
            // 通过 deleteDocument 删除（幂等，always 调 API）
            deleteDocument(existingDoc.id);

            return [...prev.slice(0, existingIndex), { ...doc, indexed: false, chunkCount: 0 }, ...prev.slice(existingIndex + 1)];
          }
          return [{ ...doc, indexed: false }, ...prev];
        });
        onUploadComplete?.(doc);
      });
    }
    // 重置 input 以便下次选择相同文件
    e.target.value = '';
  }, [uploadFile, onUploadComplete]);

  /**
   * 拖拽文件后的处理 - 仅上传，不自动索引
   */
  const handleDrop = useCallback(async (file: File): Promise<void> => {
    const doc = await uploadFile(file);
    if (!doc) return;
    // 添加到文档列表（标记为未索引）
    setDocuments((prev) => {
      // 如果已存在同名文档，替换
      const existingIndex = prev.findIndex((d) => d.name === doc.name);
      if (existingIndex >= 0) {
        const existingDoc = prev[existingIndex];
        // 通过 deleteDocument 删除（幂等，always 调 API）
        deleteDocument(existingDoc.id);

        return [...prev.slice(0, existingIndex), { ...doc, indexed: false, chunkCount: 0 }, ...prev.slice(existingIndex + 1)];
      }
      return [{ ...doc, indexed: false }, ...prev];
    });
    onUploadComplete?.(doc);
  }, [uploadFile, onUploadComplete]);

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
