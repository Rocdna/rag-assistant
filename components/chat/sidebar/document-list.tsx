'use client';

/**
 * 文档列表组件
 */

import { useState } from 'react';
import type { Document } from '@/types/chat';
import { DeleteConfirmModal } from './delete-confirm-modal';

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
        <DeleteConfirmModal
          docName={deleteConfirm.name}
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
              <div className="document-item-header">
                <div className="document-item-info">
                  <div className="document-item-icon">
                    {doc.type === 'pdf' ? '📕' : '📄'}
                  </div>
                  <div>
                    <div className="document-item-name">{doc.name}</div>
                    <div className="document-item-meta">
                      <span>{formatFileSize(doc.size || 0)}</span>
                      <span>·</span>
                      <span>{doc.chunkCount || 0} chunks</span>
                    </div>
                  </div>
                </div>
                <div className="document-item-actions">
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
                  <button
                    className="document-delete-btn"
                    onClick={() => setDeleteConfirm({ id: doc.id, name: doc.name })}
                    title="删除文档"
                  >
                    🗑️
                  </button>
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
