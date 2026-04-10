'use client';

/**
 * 删除确认弹窗组件
 */

interface DeleteConfirmModalProps {
  docName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({ docName, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--bg-secondary)',
        padding: '24px',
        borderRadius: '12px',
        maxWidth: '320px',
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}>
        <p style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-primary)' }}>
          确定要删除文档"<strong>{docName}</strong>"吗？
        </p>
        <p style={{ marginBottom: '20px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          删除后将无法恢复，且云端向量数据也会一并删除。
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: '#ef4444',
              color: 'white',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
}
