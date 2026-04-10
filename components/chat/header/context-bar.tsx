'use client';

/**
 * Context Bar 组件
 *
 * 功能：
 * - 根据当前模式显示不同的配置选项
 * - 对话模式：RAG开关、文档选择、思考、联网、HyDE
 * - Agent 模式：Agent开关、ReAct、自我纠错
 */

import { FeatureToggle } from '@/components/ui/toggle';
import type { ChatMode } from './mode-tabs';
import type { Document } from '@/types/chat';

interface ContextBarProps {
  mode: ChatMode;
  useRAG: boolean;
  onUseRAGChange: (enabled: boolean) => void;
  selectedDocName: string | null;
  onSelectedDocChange: (docName: string | null) => void;
  documents: (Document & { content?: string })[];
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
}

export function ContextBar({
  mode,
  useRAG,
  onUseRAGChange,
  selectedDocName,
  onSelectedDocChange,
  documents,
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
}: ContextBarProps) {
  const hasIndexedDocs = documents.some((d) => d.indexed);

  return (
    <div className="context-bar">
      <div className="context-bar-left">
        {/* RAG 开关 - 仅对话模式显示 */}
        {mode === 'chat' && (
          <>
            <FeatureToggle
              icon="📚"
              label="知识库"
              enabled={useRAG}
              onChange={onUseRAGChange}
              disabled={!hasIndexedDocs}
            />

            {/* 文档选择 - RAG 开启时显示 */}
            {useRAG && hasIndexedDocs && (
              <select
                value={selectedDocName || ''}
                onChange={(e) => onSelectedDocChange(e.target.value || null)}
                className="model-select"
                style={{
                  padding: '4px 28px 4px 10px',
                  fontSize: '12px',
                  backgroundPosition: 'right 8px center',
                }}
              >
                <option value="">全部文档</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.name}>
                    {doc.name}
                  </option>
                ))}
              </select>
            )}

            <div className="context-bar-divider" />

            {/* 对话模式功能开关 */}
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
          </>
        )}

        {/* Agent 模式功能开关 */}
        {mode === 'agent' && (
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

      <div className="context-bar-right">
        {/* 预留：快捷操作 */}
      </div>
    </div>
  );
}
