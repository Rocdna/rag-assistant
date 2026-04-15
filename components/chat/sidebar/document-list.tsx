'use client';

/**
 * 文档列表组件
 */

import { useState } from 'react';
import type { Document } from '@/types/chat';
import { ConfirmModal } from '@/components/chat/confirm-modal';

interface DocumentListProps {
  documents: Document[];
  indexingId: string | null;
  indexingProgress?: { stage: string; progress: number; message: string } | null;
  onIndexDocument: (doc: Document & { content: string }) => void;
  onDeleteDocument: (docId: string) => void;
}

export function DocumentList({
  documents,
  indexingId,
  indexingProgress,
  onIndexDocument,
  onDeleteDocument,
}: DocumentListProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  if (documents.length === 0) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <>
      {deleteConfirm && (
        <ConfirmModal
          title="删除文档"
          message={`确定要删除文档"${deleteConfirm.name}"吗？删除后将无法恢复，云端向量数据也会一并删除。`}
          confirmText="删除"
          variant="danger"
          onConfirm={() => {
            onDeleteDocument(deleteConfirm.id);
            setDeleteConfirm(null);
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
      <div className="document-list-new">
        {documents.map((doc) => {
          const isIndexing = indexingId === doc.id;
          const progress = isIndexing && indexingProgress ? indexingProgress.progress : 0;

          return (
            <div key={doc.id} className="document-item-new">
              <div className="document-item-main">
                <div className="document-item-icon">
                  {doc.type === 'pdf' ? '📕' : '📄'}
                </div>
                <div className="document-item-content">
                  <div className="document-item-row">
                    <span className="document-item-name">{doc.name}</span>
                    <button
                      className="document-item-delete"
                      onClick={() => setDeleteConfirm({ id: doc.id, name: doc.name })}
                      title="删除文档"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                  <div className="document-item-row document-item-meta-row">
                    <span className="document-item-meta">
                      {formatFileSize(doc.size || 0)}
                      <span className="meta-separator">·</span>
                      {doc.chunkCount || 0} chunks
                    </span>
                    {doc.indexed ? (
                      <span className="document-index-btn indexed">✓ 已索引</span>
                    ) : (
                      <button
                        className={`document-index-btn ${isIndexing ? 'indexing' : ''}`}
                        onClick={() => onIndexDocument(doc as Document & { content: string })}
                        disabled={isIndexing}
                      >
                        {isIndexing ? `${progress}%` : '索引'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {isIndexing && (
                <div className="document-progress">
                  <div
                    className="document-progress-bar"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
