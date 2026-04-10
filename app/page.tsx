'use client';

import { useState, useCallback, useEffect } from 'react';
import { useChat } from '@/hooks/use-chat';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useDocumentIndex } from '@/hooks/use-document-index';
import { MessageList } from '@/components/chat/message-list';
import { ChatInput } from '@/components/chat/chat-input';
import { Sidebar } from '@/components/chat/sidebar';
import { SettingsModal } from '@/components/chat/settings-modal';
import { ModeTabs, type ChatMode } from '@/components/chat/header/mode-tabs';
import { ContextBar } from '@/components/chat/header/context-bar';
import { EmptyState } from '@/components/chat/message/empty-state';
import { MobileSettingsSheet } from '@/components/chat/mobile-settings-sheet';

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

  // 模式状态
  const [mode, setMode] = useState<ChatMode>('chat');

  // RAG 配置
  const [useRAG, setUseRAG] = useState(true);
  const [selectedDocName, setSelectedDocName] = useState<string | null>(null);

  // 功能开关
  const [queryExpansion, setQueryExpansion] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [agent, setAgent] = useState(false);
  const [react, setReact] = useState(false);

  // UI 状态
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [isDragover, setIsDragover] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // 文档管理
  const {
    documents,
    isUploading,
    indexingId,
    indexingProgress,
    fileInputRef,
    handleDrop,
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

  // 如果没有已索引的文档，关闭 RAG
  useEffect(() => {
    const hasIndexedDocs = documents.some((d) => d.indexed);
    if (!hasIndexedDocs) {
      setUseRAG(false);
    }
  }, [documents]);

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
      // 仅上传，不自动索引（用户需手动点击索引按钮）
      handleDrop(file);
      setUploadSuccess(`文档 "${file.name}" 上传成功`);
      setTimeout(() => setUploadSuccess(null), 3000);
    }
  }, [isMobile, handleDrop]);

  // 模式切换时同步 agent 状态
  const handleModeChange = useCallback((newMode: ChatMode) => {
    setMode(newMode);
    if (newMode === 'agent') {
      setAgent(true);
    }
  }, []);

  const handleAgentChange = useCallback((enabled: boolean) => {
    setAgent(enabled);
    if (enabled && mode === 'chat') {
      // 可选：切换到 Agent 模式
    }
  }, [mode]);

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
        {/* 头部 - 简化版 */}
        <header className={`chat-header ${agent ? 'agent-mode' : ''}`}>
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

            {/* 标题 - 移动端显示当前对话标题或模式标识 */}
            {isMobile ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {agent ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      backgroundColor: 'var(--accent-green-subtle)',
                      border: '1px solid var(--accent-green-dim)',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '11px',
                      fontWeight: 500,
                      color: 'var(--accent-green)',
                    }}
                  >
                    🤖 Agent 模式
                  </span>
                ) : (
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {currentChat?.title || '新对话'}
                  </span>
                )}
              </div>
            ) : (
              <h1>{currentChat?.title || '新对话'}</h1>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* PC 端显示 Mode Tabs */}
            {!isMobile && (
              <ModeTabs activeMode={mode} onChange={handleModeChange} />
            )}

            {/* 设置按钮 */}
            <button
              onClick={() => isMobile ? setShowMobileSettings(true) : setShowSettings(true)}
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
              {isMobile ? '⚡' : '⚙️'}
            </button>

            {/* 模型选择 */}
            {!isMobile && (
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
            )}
          </div>
        </header>

        {/* Context Bar - PC 端显示 */}
        {!isMobile && (
          <ContextBar
            mode={mode}
            useRAG={useRAG}
            onUseRAGChange={setUseRAG}
            selectedDocName={selectedDocName}
            onSelectedDocChange={setSelectedDocName}
            documents={documents}
            thinking={thinking}
            onThinkingChange={setThinking}
            webSearch={webSearch}
            onWebSearchChange={setWebSearch}
            queryExpansion={queryExpansion}
            onQueryExpansionChange={setQueryExpansion}
            agent={agent}
            onAgentChange={handleAgentChange}
            react={react}
            onReactChange={setReact}
          />
        )}

        {/* 上传中提示 */}
        {isUploading && (
          <div
            style={{
              padding: '12px 20px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--accent-green)',
              fontSize: '14px',
            }}
          >
            正在解析文档...
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div
            style={{
              padding: '12px 20px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--accent-red)',
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
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              color: '#22c55e',
              fontSize: '14px',
            }}
          >
            {uploadSuccess}
          </div>
        )}

        {/* 消息列表 */}
        {messages.length === 0 && !isLoading ? (
          <EmptyState
            hasDocuments={documents.some(d => d.indexed)}
            onUploadClick={handleUploadClick}
          />
        ) : (
          <MessageList messages={messages} isLoading={isLoading} />
        )}

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
          onAgentChange={handleAgentChange}
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

        {/* 移动端设置面板 */}
        <MobileSettingsSheet
          isOpen={showMobileSettings}
          onClose={() => setShowMobileSettings(false)}
          mode={mode}
          thinking={thinking}
          onThinkingChange={setThinking}
          webSearch={webSearch}
          onWebSearchChange={setWebSearch}
          queryExpansion={queryExpansion}
          onQueryExpansionChange={setQueryExpansion}
          agent={agent}
          onAgentChange={handleAgentChange}
          react={react}
          onReactChange={setReact}
          useRAG={useRAG}
          onUseRAGChange={setUseRAG}
        />
      </div>
    </div>
  );
}
