'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearHistory: () => void;
  onClearDocuments: () => void;
}

export function SettingsModal({ isOpen, onClose, onClearHistory, onClearDocuments }: SettingsModalProps) {
  const [fontSize, setFontSize] = useState(16);

  // 初始化字体大小
  useEffect(() => {
    const saved = localStorage.getItem('font-size');
    if (saved) {
      const size = parseInt(saved);
      setFontSize(size);
      document.documentElement.style.setProperty('--font-size', saved);
    }
  }, []);

  const handleFontSizeChange = (value: number) => {
    setFontSize(value);
    const size = value + 'px';
    document.documentElement.style.setProperty('--font-size', size);
    localStorage.setItem('font-size', size);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">设置</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* 清空历史 */}
          <div className="setting-item">
            <label className="setting-label">对话历史</label>
            <button
              className="danger-btn"
              onClick={() => {
                if (confirm('确定清空所有对话历史吗？')) {
                  onClearHistory();
                  onClose();
                }
              }}
            >
              清空所有对话
            </button>
          </div>

          {/* 清空文档 */}
          <div className="setting-item">
            <label className="setting-label">知识库文档</label>
            <button
              className="danger-btn"
              onClick={() => {
                if (confirm('确定清空所有文档吗？文档的云端向量数据也会一并删除。')) {
                  onClearDocuments();
                  onClose();
                }
              }}
            >
              清空所有文档
            </button>
          </div>

          {/* 主题颜色 */}
          <div className="setting-item">
            <label className="setting-label">主题颜色</label>
            <div className="theme-options">
              {[
                { name: '深空', color: '#1e1e1e' },
                { name: '暗紫', color: '#1a1a2e' },
                { name: '碳灰', color: '#0f1419' },
                { name: '浅灰', color: '#2d2d2d' },
              ].map((theme) => (
                <button
                  key={theme.color}
                  className="theme-color-btn"
                  style={{ background: theme.color }}
                  onClick={() => {
                    document.documentElement.style.setProperty('--bg-primary', theme.color);
                    localStorage.setItem('theme-color', theme.color);
                  }}
                  title={theme.name}
                />
              ))}
            </div>
          </div>

          {/* 字体大小 */}
          <div className="setting-item">
            <label className="setting-label">字体大小</label>
            <div className="setting-control">
              <input
                type="range"
                min="12"
                max="20"
                value={fontSize}
                className="setting-range"
                onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
              />
              <span className="setting-value">{fontSize}px</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <Button variant="outline" onClick={onClose}>关闭</Button>
        </div>
      </div>
    </div>
  );
}
