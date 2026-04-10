'use client';

import { useState, useCallback, useEffect } from 'react';
import { useChat } from '@/hooks/use-chat';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useDocumentIndex } from '@/hooks/use-document-index';
import { MessageList } from '@/components/chat/message-list';
import { ChatInput } from '@/components/chat/chat-input';
import { Sidebar } from '@/components/chat/sidebar';
import { SettingsModal } from '@/components/chat/settings-modal';

export default function ChatPage() {
  const {
    chats,
    currentChat,
    currentChatId,
    messages,
    input,
    isLoading,
    selectedModel,
    createChat,
    switchChat,
    deleteChat,
    handleSubmit,
    handleInputChange,
    setSelectedModel,
    cancel,
  } = useChat();

  const isMobile = useIsMobile();

  // 移动端默认侧边栏关闭
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [useRAG, setUseRAG] = useState(true);
  const [selectedDocName, setSelectedDocName] = useState<string | null>(null);
  const [queryExpansion, setQueryExpansion] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [agent, setAgent] = useState(false);
  const [react, setReact] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isDragover, setIsDragover] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // 文档管理
  const {
    documents,
    isUploading,
    indexingId,
    indexingProgress,
    fileInputRef,
    uploadAndIndex,
    indexDocument,
    deleteDocument,
    clearAllDocuments,
    handleUploadClick,
    handleFileSelect,
  } = useDocumentIndex({
    onUploadComplete: () => {
      setError(null);
    },
    onError: (errMsg) => {
      setError(errMsg);
      setTimeout(() => setError(null), 5000);
    },
    onIndexComplete: () => {
      setError(null);
    },
  });

  // 移动端保持侧边栏关闭
  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  }, [isMobile]);

  // 创建新对话
  const handleNewChat = useCallback(() => {
    createChat();
  }, [createChat]);

  // 提交处理
  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      // 如果没有上传文档，自动切换到非 RAG 模式
      const hasIndexedDocs = documents.some(d => d.indexed);
      const shouldUseRAG = useRAG && hasIndexedDocs;

      await handleSubmit(e, shouldUseRAG, selectedDocName, queryExpansion, undefined, thinking, webSearch, agent, react);
    },
    [handleSubmit, useRAG, selectedDocName, queryExpansion, documents, thinking, webSearch, agent, react]
  );

  // PC端拖拽上传
  const handleMainDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragover(true);
    }
  }, []);

  const handleMainDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragover(false);
    }
  }, []);

  const handleMainDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragover(false);
    const file = e.dataTransfer.files[0];
    if (file && !isMobile) {
      uploadAndIndex(file);
      setUploadSuccess(`文档 "${file.name}" 上传成功`);
      setTimeout(() => setUploadSuccess(null), 3000);
    }
  }, [isMobile, uploadAndIndex]);

  return (
    <div className="chat-container">
      <Sidebar
        collapsed={sidebarCollapsed}
        documents={documents}
        chats={chats}
        currentChatId={currentChatId}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onNewChat={handleNewChat}
        onSwitchChat={(chatId) => {
          switchChat(chatId);
          if (isMobile) {
            setSidebarCollapsed(true);
          }
        }}
        onDeleteChat={deleteChat}
        onDeleteDocument={deleteDocument}
        onIndexDocument={indexDocument}
        indexingId={indexingId}
        indexingProgress={indexingProgress}
      />

      {/* 移动端侧边栏遮罩 */}
      {!sidebarCollapsed && (
        <div
          className="sidebar-overlay visible"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* 拖拽遮罩层 */}
      {isDragover && (
        <div
          className="drag-overlay"
          onDragOver={handleMainDragOver}
          onDragEnter={handleMainDragOver}
          onDragLeave={handleMainDragLeave}
          onDrop={handleMainDrop}
        >
          <div className="drag-overlay-content">
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📄</div>
            <p style={{ fontSize: '18px', fontWeight: 500 }}>拖拽文件到此处上传</p>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              支持 PDF、TXT、DOCX、MD 格式
            </p>
          </div>
        </div>
      )}

      <div
        className="flex-1 flex flex-col"
        onDragOver={handleMainDragOver}
        onDragEnter={handleMainDragOver}
        onDragLeave={handleMainDragLeave}
        onDrop={handleMainDrop}
      >
        {/* 头部 */}
        <header className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* 移动端菜单按钮 */}
            <button
              className="header-menu-btn"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '20px',
                padding: '4px 8px',
                borderRadius: '6px',
              }}
              title="菜单"
            >
              ☰
            </button>
            {!isMobile && <h1>{currentChat?.title || '新对话'}</h1>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* 设置按钮 */}
            <button
              onClick={() => setShowSettings(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '4px 8px',
                borderRadius: '6px',
              }}
              title="设置"
            >
              ⚙️
            </button>

            {/* 模型选择 */}
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="model-select"
            >
              <option value="qwen3-max">Qwen3 Max</option>
              <option value="qwen3-max-preview">Qwen3 Max Preview</option>
              <option value="qwen3.6-plus">Qwen3.6 Plus</option>
              <option value="qwen-math-turbo">Qwen Math Turbo</option>
              <option value="glm-5">GLM-5</option>
            </select>

            {/* RAG 开关 */}
            <label className="rag-switch">
              <input
                type="checkbox"
                checked={useRAG}
                onChange={(e) => setUseRAG(e.target.checked)}
              />
              <span className="rag-slider"></span>
              <span className="rag-label">知识库</span>
            </label>

            {/* 文档选择 */}
            {useRAG && documents.length > 0 && (
              <select
                value={selectedDocName || ''}
                onChange={(e) => setSelectedDocName(e.target.value || null)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
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
          </div>
        </header>

        {/* 上传中提示 */}
        {isUploading && (
          <div
            style={{
              padding: '12px 20px',
              backgroundColor: 'rgba(16, 163, 127, 0.2)',
              color: 'var(--accent-color)',
              fontSize: '14px',
            }}
          >
            正在解析文档...
          </div>
        )}

        {/* 移动端对话标题 */}
        {isMobile && currentChat?.title && (
          <div style={{
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            💬 {currentChat.title}
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div
            style={{
              padding: '12px 20px',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        {/* 上传成功提示 */}
        {uploadSuccess && (
          <div
            style={{
              padding: '12px 20px',
              backgroundColor: 'rgba(34, 197, 94, 0.2)',
              color: '#22c55e',
              fontSize: '14px',
            }}
          >
            {uploadSuccess}
          </div>
        )}

        {/* 消息列表 */}
        <MessageList messages={messages} isLoading={isLoading} />

        {/* 隐藏的文件输入框 */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.docx,.doc,.md,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* 输入框 */}
        <ChatInput
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={onSubmit}
          isLoading={isLoading}
          onCancel={cancel}
          onUploadClick={handleUploadClick}
          thinking={thinking}
          onThinkingChange={setThinking}
          webSearch={webSearch}
          onWebSearchChange={setWebSearch}
          queryExpansion={queryExpansion}
          onQueryExpansionChange={setQueryExpansion}
          agent={agent}
          onAgentChange={setAgent}
          react={react}
          onReactChange={setReact}
        />

        {/* 设置模态框 */}
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onClearHistory={() => {
            localStorage.removeItem('rag_chat_history');
            window.location.reload();
          }}
          onClearDocuments={clearAllDocuments}
        />
      </div>
    </div>
  );
}
