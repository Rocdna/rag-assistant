'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { formatFileSize, isSupportedFile } from '@/lib/utils';
import type { Document } from '@/types/chat';

interface FileUploadProps {
  onUploadComplete: (doc: Document & { content: string }) => void;
  onUploadError: (error: string) => void;
  isUploading: boolean;
  setIsUploading: (loading: boolean) => void;
  onClose?: () => void;
}

export function FileUpload({
  onUploadComplete,
  onUploadError,
  isUploading,
  setIsUploading,
  onClose,
}: FileUploadProps) {
  const [isDragover, setIsDragover] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!isSupportedFile(file.name)) {
        onUploadError(`不支持的文件类型: ${file.name}，仅支持 PDF、TXT、DOCX、MD`);
        return;
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

        onUploadComplete(data.document);
      } catch (error: any) {
        onUploadError(error.message);
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadComplete, onUploadError, setIsUploading]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragover(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragover(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragover(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  return (
    <div className="p-4 border-b border-[var(--border-color)]">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>上传文档</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '4px 8px',
          }}
          title="关闭"
        >
          ✕
        </button>
      </div>
      <div
        className={`upload-zone ${isDragover ? 'dragover' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept=".pdf,.txt,.docx,.doc,.md,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
          onChange={handleInputChange}
          disabled={isUploading}
          style={{ display: 'none' }}
          id="file-input"
        />
        <label htmlFor="file-input" style={{ cursor: 'pointer', display: 'block' }}>
          {isUploading ? (
            <>
              <div className="loading-indicator">
                <div className="loading-dots">
                  <div className="loading-dot" />
                  <div className="loading-dot" />
                  <div className="loading-dot" />
                </div>
              </div>
              <p className="mt-2">正在解析文档...</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📄</div>
              <p style={{ fontWeight: 500 }}>点击或拖拽上传文件</p>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                支持 PDF、TXT、DOCX、MD 格式
              </p>
            </>
          )}
        </label>
      </div>
    </div>
  );
}
