'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

const typeStyles = {
  success: { icon: '✓', color: '#67c23a', bg: '#f0f9eb', border: '#e1f3d8' },
  error: { icon: '✕', color: '#f56c6c', bg: '#fef0f0', border: '#fde2e2' },
  info: { icon: 'ℹ', color: '#909399', bg: '#f4f4f5', border: '#e9e9eb' },
};

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const style = typeStyles[type];

  return (
    <div
      className={`toast toast-${type} ${visible ? '' : 'toast-hide'}`}
      style={{
        position: 'fixed',
        top: '24px',
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? '0' : '-20px'})`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 20px',
        borderRadius: '8px',
        fontSize: '14px',
        zIndex: 9999,
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        transition: 'opacity 0.3s, transform 0.3s',
        opacity: visible ? 1 : 0,
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        color: '#303133',
        minWidth: '260px',
        maxWidth: '500px',
      }}
    >
      <span
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: style.color,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {style.icon}
      </span>
      <span style={{ flex: 1, lineHeight: 1.4 }}>{message}</span>
    </div>
  );
}

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

let toastCallback: ((state: ToastState) => void) | null = null;

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  if (toastCallback) {
    toastCallback({ message, type });
  }
}

// Toast 容器组件
export function ToastContainer({ children }: { children?: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    toastCallback = setToast;
    return () => {
      toastCallback = null;
    };
  }, []);

  return (
    <>
      {children}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
