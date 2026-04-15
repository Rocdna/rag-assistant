'use client';

/**
 * 增强的空状态组件
 */

interface EmptyStateProps {
  hasDocuments: boolean;
  onSuggestionClick?: (text: string) => void;
  onUploadClick?: () => void;
}

const SUGGESTIONS = [
  { icon: '💡', text: '帮我总结这篇文档的核心观点' },
  { icon: '💡', text: '对比这两篇文章的分析方法有什么不同' },
];

export function EmptyState({ hasDocuments, onSuggestionClick, onUploadClick }: EmptyStateProps) {
  return (
    <div className="empty-state-enhanced">
      <div className="empty-state-logo">🤖</div>
      <h2 className="empty-state-title-new">RAG 知识库助手</h2>
      <p className="empty-state-subtitle">
        {hasDocuments
          ? '已加载知识库，可以开始提问了'
          : '上传文档，构建属于你的知识库'}
      </p>

      {hasDocuments ? (
        <div className="empty-state-suggestions">
          {SUGGESTIONS.map((suggestion, index) => (
            <button
              key={index}
              className="empty-state-suggestion"
              onClick={() => onSuggestionClick?.(suggestion.text)}
            >
              <span className="empty-state-suggestion-icon">{suggestion.icon}</span>
              <span className="empty-state-suggestion-text">{suggestion.text}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state-upload">
          <button
            className="empty-state-suggestion"
            onClick={onUploadClick}
            style={{ maxWidth: '300px' }}
          >
            <span className="empty-state-suggestion-icon">📎</span>
            <span className="empty-state-suggestion-text">点击上传或拖拽文件至此处</span>
          </button>
          <span className="empty-state-upload-formats">
            支持 PDF、TXT、DOCX、MD，单文件不超过 25MB
          </span>
        </div>
      )}
    </div>
  );
}
