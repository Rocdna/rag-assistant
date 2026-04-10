'use client';

import { Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRef, useEffect } from 'react';
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
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

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

      {/* PC端功能开关栏 */}
      {!isMobile && (
        <div className="input-options-bar">
          {/* 深度思考 */}
          {onThinkingChange && (
            <button
              type="button"
              onClick={() => onThinkingChange(!thinking)}
              className={`option-btn ${thinking ? 'active' : ''}`}
              title="深度思考"
            >
              🧠 思考
            </button>
          )}

          {/* 联网搜索 */}
          {onWebSearchChange && (
            <button
              type="button"
              onClick={() => onWebSearchChange(!webSearch)}
              className={`option-btn ${webSearch ? 'active' : ''}`}
              title="联网搜索"
            >
              🔍 联网
            </button>
          )}

          {/* HyDE 检索优化 */}
          {onQueryExpansionChange && (
            <button
              type="button"
              onClick={() => onQueryExpansionChange(!queryExpansion)}
              className={`option-btn ${queryExpansion ? 'active' : ''}`}
              title="HyDE 检索优化"
            >
              ✨ HyDE
            </button>
          )}

          {/* Agent 深度分析 */}
          {onAgentChange && (
            <button
              type="button"
              onClick={() => onAgentChange(!agent)}
              className={`option-btn ${agent ? 'active' : ''}`}
              title="Agent 深度分析"
            >
              🤖 Agent
            </button>
          )}

          {/* ReAct 思考过程（仅在 Agent 开启时可用） */}
          {onReactChange && agent && (
            <button
              type="button"
              onClick={() => onReactChange(!react)}
              className={`option-btn ${react ? 'active' : ''}`}
              title="展示思考过程"
            >
              🔄 ReAct
            </button>
          )}
        </div>
      )}

      {/* 移动端功能栏 */}
      {isMobile && (
        <div className="mobile-action-row">
          <button
            type="button"
            onClick={onUploadClick}
            className="mobile-upload-btn"
          >
            📎 上传
          </button>
          {onThinkingChange && (
            <button
              type="button"
              onClick={() => onThinkingChange(!thinking)}
              className={`mobile-option-btn ${thinking ? 'active' : ''}`}
            >
              🧠 思考
            </button>
          )}
          {onWebSearchChange && (
            <button
              type="button"
              onClick={() => onWebSearchChange(!webSearch)}
              className={`mobile-option-btn ${webSearch ? 'active' : ''}`}
            >
              🔍 联网
            </button>
          )}
          {onQueryExpansionChange && (
            <button
              type="button"
              onClick={() => onQueryExpansionChange(!queryExpansion)}
              className={`mobile-option-btn ${queryExpansion ? 'active' : ''}`}
            >
              ✨ HyDE
            </button>
          )}
          {onAgentChange && (
            <button
              type="button"
              onClick={() => onAgentChange(!agent)}
              className={`mobile-option-btn ${agent ? 'active' : ''}`}
            >
              🤖 Agent
            </button>
          )}
          {onReactChange && agent && (
            <button
              type="button"
              onClick={() => onReactChange(!react)}
              className={`mobile-option-btn ${react ? 'active' : ''}`}
            >
              🔄 ReAct
            </button>
          )}
        </div>
      )}
    </div>
  );
}
