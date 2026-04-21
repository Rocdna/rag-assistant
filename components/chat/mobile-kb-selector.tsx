/**
 * 移动端知识库选择器
 *
 * 功能描述：
 * - 点击按钮弹出文档选择面板
 * - 支持搜索过滤
 * - 勾选/取消文档
 * - 显示已选数量
 */
'use client';

import { useState } from 'react';
import { useDocumentIndex } from '@/hooks/use-document-index';

interface MobileKBSelectorProps {
  userId?: string;
  selectedDocName: string | null;
  onChange: (docName: string | null) => void;
}

export function MobileKBSelector({ userId, selectedDocName, onChange }: MobileKBSelectorProps) {
  const { documents } = useDocumentIndex({ userId });
  const [showPanel, setShowPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [localSelectedName, setLocalSelectedName] = useState<string | null>(selectedDocName);

  const indexedDocs = documents.filter(d => d.indexed);
  const filteredDocs = searchQuery
    ? indexedDocs.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : indexedDocs;

  const selectedCount = indexedDocs.filter(d => d.name === localSelectedName).length;
  const selectedDoc = indexedDocs.find(d => d.name === localSelectedName);

  const handleToggle = (docName: string) => {
    if (localSelectedName === docName) {
      setLocalSelectedName(null);
    } else {
      setLocalSelectedName(docName);
    }
  };

  const handleConfirm = () => {
    onChange(localSelectedName);
    setShowPanel(false);
  };

  const handleClose = () => {
    setLocalSelectedName(selectedDocName);
    setShowPanel(false);
  };

  return (
    <>
      {/* 知识库按钮 */}
      <button
        onClick={() => setShowPanel(true)}
        style={{
          background: 'none',
          border: 'none',
          color: selectedDoc ? 'var(--accent-green)' : 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: '18px',
          padding: '4px 8px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
        title="选择知识库"
      >
        📚
        {selectedCount > 0 && (
          <span style={{
            fontSize: '10px',
            fontWeight: 600,
            color: 'var(--accent-green)',
          }}>
            {selectedCount}
          </span>
        )}
      </button>

      {/* 文档选择面板 */}
      {showPanel && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
          onClick={handleClose}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '400px',
              maxHeight: '70vh',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '16px 16px 0 0',
              padding: '16px',
              paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
              animation: 'slideUp 0.3s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div style={{
              width: '40px',
              height: '4px',
              backgroundColor: 'var(--border-default)',
              borderRadius: '2px',
              margin: '0 auto 16px',
            }} />

            {/* 标题 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                选择知识库
              </h3>
              <button
                onClick={handleClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '20px',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            {/* 搜索框 */}
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="搜索文档..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* 文档列表 */}
            <div style={{
              maxHeight: '40vh',
              overflowY: 'auto',
              marginBottom: '16px',
            }}>
              {filteredDocs.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  color: 'var(--text-tertiary)',
                  fontSize: '14px',
                  padding: '24px',
                }}>
                  {indexedDocs.length === 0
                    ? '暂无已索引的文档'
                    : '未找到匹配的文档'}
                </div>
              ) : (
                filteredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleToggle(doc.name)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      borderRadius: '8px',
                      marginBottom: '4px',
                      backgroundColor: localSelectedName === doc.name
                        ? 'rgba(16, 185, 129, 0.1)'
                        : 'var(--bg-primary)',
                      border: `1px solid ${localSelectedName === doc.name ? 'var(--accent-green)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      border: `2px solid ${localSelectedName === doc.name ? 'var(--accent-green)' : 'var(--border-default)'}`,
                      backgroundColor: localSelectedName === doc.name
                        ? 'var(--accent-green)'
                        : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px',
                      flexShrink: 0,
                    }}>
                      {localSelectedName === doc.name && (
                        <span style={{ color: 'white', fontSize: '12px' }}>✓</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '14px',
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {doc.name}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--text-tertiary)',
                        marginTop: '2px',
                      }}>
                        {doc.size} · {doc.indexed ? '已索引' : '未索引'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 确认按钮 */}
            <button
              onClick={handleConfirm}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, var(--accent-green) 0%, #0d9669 100%)',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              确认 {localSelectedName ? `"${localSelectedName}"` : ''}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
