'use client';

import { Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import React, { useRef, useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-is-mobile';

interface ChatInputProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent) => void | Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
  onUploadClick?: () => void;
  thinking?: boolean;
  onThinkingChange?: (enabled: boolean) => void;
  webSearch?: boolean;
  onWebSearchChange?: (enabled: boolean) => void;
  queryExpansion?: boolean;
  onQueryExpansionChange?: (enabled: boolean) => void;
  agent?: boolean;
  onAgentChange?: (enabled: boolean) => void;
  react?: boolean;
  onReactChange?: (enabled: boolean) => void;
  onSettingsClick?: () => void;
}

export function ChatInput({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  onCancel,
  onUploadClick,
  thinking = false,
  onThinkingChange,
  webSearch = false,
  onWebSearchChange,
  queryExpansion = false,
  onQueryExpansionChange,
  agent = false,
  onAgentChange,
  react = false,
  onReactChange,
  onSettingsClick,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // 工具按钮配置
  const toolButtons: Array<{
    key: string;
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
    show: boolean;
  }> = [
    {
      key: 'upload',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      ),
      label: '上传文件',
      active: false,
      onClick: () => onUploadClick?.(),
      show: !!onUploadClick,
    },
    {
      key: 'thinking',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
      ),
      label: '深度思考',
      active: thinking,
      onClick: () => {
        onThinkingChange?.(!thinking);
        setActiveTooltip(activeTooltip === 'thinking' ? null : 'thinking');
      },
      show: !!onThinkingChange,
    },
    {
      key: 'websearch',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      ),
      label: '联网搜索',
      active: webSearch,
      onClick: () => {
        onWebSearchChange?.(!webSearch);
        setActiveTooltip(activeTooltip === 'websearch' ? null : 'websearch');
      },
      show: !!onWebSearchChange,
    },
    {
      key: 'agent',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="10" rx="2"/>
          <circle cx="12" cy="5" r="2"/>
          <path d="M12 7v4"/>
          <circle cx="8" cy="16" r="1"/>
          <circle cx="16" cy="16" r="1"/>
        </svg>
      ),
      label: 'Agent 模式',
      active: agent,
      onClick: () => {
        onAgentChange?.(!agent);
        setActiveTooltip(activeTooltip === 'agent' ? null : 'agent');
      },
      show: !!onAgentChange,
    },
    {
      key: 'react',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
          <path d="M16 16h5v5"/>
        </svg>
      ),
      label: 'ReAct 展示',
      active: react,
      onClick: () => {
        onReactChange?.(!react);
        setActiveTooltip(activeTooltip === 'react' ? null : 'react');
      },
      show: !!onReactChange,
    },
    {
      key: 'settings',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      ),
      label: '更多设置',
      active: false,
      onClick: () => onSettingsClick?.(),
      show: !!onSettingsClick,
    },
  ];

  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  // 点击其他区域关闭气泡
  useEffect(() => {
    if (!activeTooltip) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.mobile-icon-btn')) {
        setActiveTooltip(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [activeTooltip]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isLoading) {
        onCancel?.();
      } else {
        handleSubmit(e);
      }
    }
  };

  const placeholder = isMobile
    ? '输入问题...'
    : '输入你的问题... (Enter 发送，Shift+Enter 换行)';

  return (
    <div className="chat-input-container">
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <div className="chat-input-wrapper">
          <Textarea
            ref={textareaRef}
            className="chat-input"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            rows={1}
          />
        </div>
        {!isMobile && onUploadClick && (
          <button
            type="button"
            onClick={onUploadClick}
            className="upload-btn"
            title="上传文件"
          >
            📎
          </button>
        )}
        <Button
          type="button"
          className="submit-button"
          disabled={!isLoading && !input.trim()}
          onClick={isLoading ? onCancel : handleSubmit}
        >
          {isLoading ? '停止' : '发送'}
        </Button>
      </form>

      {/* 移动端功能栏 - 小图标按钮 */}
      {isMobile && (
        <div className="mobile-icon-row">
          {toolButtons.filter(b => b.show).map((btn) => (
            <div key={btn.key} style={{ position: 'relative' }}>
              {activeTooltip === btn.key && (
                <div className="mobile-tooltip">
                  {btn.label}
                </div>
              )}
              <button
                type="button"
                onClick={btn.onClick}
                className={`mobile-icon-btn ${btn.active ? 'active' : ''}`}
              >
                {btn.icon}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
