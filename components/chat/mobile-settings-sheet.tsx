'use client';

/**
 * 移动端设置 Bottom Sheet 组件
 *
 * 功能：
 * - 从底部滑出的设置面板
 * - 包含所有功能开关
 * - 点击外部自动关闭
 */

import { useEffect, useState } from 'react';
import { FeatureToggle } from '@/components/ui/toggle';
import type { ChatMode } from './header/mode-tabs';

interface MobileSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ChatMode;
  thinking: boolean;
  onThinkingChange: (enabled: boolean) => void;
  webSearch: boolean;
  onWebSearchChange: (enabled: boolean) => void;
  queryExpansion: boolean;
  onQueryExpansionChange: (enabled: boolean) => void;
  agent: boolean;
  onAgentChange: (enabled: boolean) => void;
  react: boolean;
  onReactChange: (enabled: boolean) => void;
  useRAG: boolean;
  onUseRAGChange: (enabled: boolean) => void;
}

export function MobileSettingsSheet({
  isOpen,
  onClose,
  mode,
  thinking,
  onThinkingChange,
  webSearch,
  onWebSearchChange,
  queryExpansion,
  onQueryExpansionChange,
  agent,
  onAgentChange,
  react,
  onReactChange,
  useRAG,
  onUseRAGChange,
}: MobileSettingsSheetProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 200,
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Bottom Sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'var(--bg-secondary)',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          padding: '20px',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
          zIndex: 201,
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s ease',
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: '40px',
            height: '4px',
            backgroundColor: 'var(--border-strong)',
            borderRadius: '2px',
            margin: '0 auto 16px',
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '20px',
            textAlign: 'center',
          }}
        >
          {mode === 'chat' ? '对话设置' : 'Agent 设置'}
        </div>

        {/* Settings Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
          }}
        >
          {mode === 'chat' ? (
            <>
              <FeatureToggle
                icon="📚"
                label="知识库"
                enabled={useRAG}
                onChange={onUseRAGChange}
              />
              <FeatureToggle
                icon="🧠"
                label="思考"
                enabled={thinking}
                onChange={onThinkingChange}
              />
              <FeatureToggle
                icon="🔍"
                label="联网"
                enabled={webSearch}
                onChange={onWebSearchChange}
              />
              <FeatureToggle
                icon="✨"
                label="HyDE"
                enabled={queryExpansion}
                onChange={onQueryExpansionChange}
              />
              <FeatureToggle
                icon="🤖"
                label="Agent"
                enabled={agent}
                onChange={onAgentChange}
              />
              {agent && (
                <FeatureToggle
                  icon="🔄"
                  label="ReAct"
                  enabled={react}
                  onChange={onReactChange}
                />
              )}
            </>
          ) : (
            <>
              <FeatureToggle
                icon="🤖"
                label="Agent"
                enabled={agent}
                onChange={onAgentChange}
              />
              <FeatureToggle
                icon="🔄"
                label="ReAct"
                enabled={react}
                onChange={onReactChange}
                disabled={!agent}
              />
            </>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: '20px',
            padding: '12px',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          关闭
        </button>
      </div>
    </>
  );
}
