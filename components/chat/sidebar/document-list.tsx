'use client';

/**
 * 文档列表组件
 */

import { useState, useEffect } from 'react';
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
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          padding: '8px 0',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '8px'
        }}>
          <span>📄 文档 ({documents.length})</span>
        </div>
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="doc-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              marginBottom: '4px',
              borderRadius: '8px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-color)';
              (e.currentTarget.querySelector('.doc-delete-btn') as HTMLElement).style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              (e.currentTarget.querySelector('.doc-delete-btn') as HTMLElement).style.opacity = '0';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '16px' }}>
                {doc.type === 'pdf' ? '📕' : '📄'}
              </span>
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: '13px',
                }}
                title={doc.name}
              >
                {doc.name}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {doc.indexed ? (
                <span style={{
                  fontSize: '11px',
                  color: '#22c55e',
                  padding: '2px 6px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  borderRadius: '4px',
                }}>
                  ✓ 已索引
                </span>
              ) : (
                <button
                  onClick={() => onIndexDocument(doc as Document & { content: string })}
                  disabled={indexingId === doc.id}
                  style={{
                    background: indexingId === doc.id ? 'var(--bg-tertiary)' : 'var(--accent-color)',
                    border: 'none',
                    color: indexingId === doc.id ? 'var(--text-secondary)' : 'white',
                    cursor: indexingId === doc.id ? 'not-allowed' : 'pointer',
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    opacity: indexingId === doc.id ? 0.7 : 1,
                    minWidth: '60px',
                  }}
                >
                  {indexingId === doc.id && indexingProgress
                    ? `${indexingProgress.progress}%`
                    : indexingId === doc.id
                      ? '索引中...'
                      : '索引'}
                </button>
              )}
              <button
                className="doc-delete-btn"
                onClick={() => setDeleteConfirm({ id: doc.id, name: doc.name })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  transition: 'color 0.2s, background-color 0.2s',
                  opacity: 0,
                }}
                title="删除文档"
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'none';
                }}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
