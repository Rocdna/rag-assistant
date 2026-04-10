'use client';

import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/lib/utils';
import type { Document } from '@/types/chat';

interface DocumentListProps {
  documents: Document[];
  onDelete: (docId: string) => void;
  onIndex: (doc: Document & { content: string }) => void;
  indexingId: string | null;
}

export function DocumentList({
  documents,
  onDelete,
  onIndex,
  indexingId,
}: DocumentListProps) {
  if (documents.length === 0) {
    return null;
  }

  return (
    <div className="document-list">
      <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
        已上传的文档 ({documents.length})
      </h3>
      {documents.map((doc) => (
        <div key={doc.id} className="document-item">
          <div className="document-info">
            <div className="document-icon">
              {doc.type === 'pdf' ? '📕' : doc.type === 'docx' || doc.type === 'doc' ? '📘' : '📄'}
            </div>
            <div>
              <div className="document-name">{doc.name}</div>
              <div className="document-size">
                {formatFileSize(doc.size)}
                {doc.indexed && <span style={{ color: 'var(--accent-color)' }}> • 已索引</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!doc.indexed && (
              <Button
                size="sm"
                onClick={() => onIndex(doc as Document & { content: string })}
                disabled={indexingId === doc.id}
              >
                {indexingId === doc.id ? '索引中...' : '索引'}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(doc.id)}
              disabled={indexingId === doc.id}
            >
              删除
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
