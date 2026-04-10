'use client';

/**
 * 侧边栏组件
 *
 * 功能：
 * - 折叠/展开侧边栏
 * - Tab 切换（对话/文档）
 * - 对话历史列表
 * - 文档列表与索引
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import type { Document, Chat } from '@/types/chat';
import { ChatHistoryList } from './chat-history-list';
import { DocumentList } from './document-list';
import { SidebarTabNav } from './tab-nav';

interface SidebarProps {
  collapsed: boolean;
  documents: Document[];
  chats: Chat[];
  currentChatId: string | null;
  onToggleCollapse: () => void;
  onNewChat: () => void;
  onSwitchChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onDeleteDocument: (docId: string) => void;
  onIndexDocument: (doc: Document & { content: string }) => void;
  indexingId: string | null;
  indexingProgress?: { stage: string; progress: number; message: string } | null;
}

export function Sidebar({
  collapsed,
  documents,
  chats,
  currentChatId,
  onToggleCollapse,
  onNewChat,
  onSwitchChat,
  onDeleteChat,
  onDeleteDocument,
  onIndexDocument,
  indexingId,
  indexingProgress,
}: SidebarProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<'conversations' | 'documents'>('conversations');

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {!collapsed && <h2 style={{ fontSize: '16px', fontWeight: 600 }}>知识库</h2>}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            style={{ padding: '6px 8px', borderRadius: '6px' }}
          >
            {collapsed ? '▶' : '◀'}
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="sidebar-content">
          <Button
            onClick={onNewChat}
            className="w-full mb-4"
            style={{ justifyContent: 'center' }}
          >
            + 新对话
          </Button>

          {/* Tab 导航 */}
          <SidebarTabNav activeTab={activeTab} onChange={setActiveTab} />

          {/* Tab 内容 */}
          {activeTab === 'conversations' ? (
            <ChatHistoryList
              chats={chats}
              currentChatId={currentChatId}
              onSwitchChat={onSwitchChat}
              onDeleteChat={onDeleteChat}
            />
          ) : (
            <DocumentList
              documents={documents}
              indexingId={indexingId}
              indexingProgress={indexingProgress}
              onIndexDocument={onIndexDocument}
              onDeleteDocument={onDeleteDocument}
            />
          )}

          {/* 空状态 - 当文档为空且没有非空对话时显示 */}
          {documents.length === 0 && chats.filter((c) => c.messages.length > 0).length === 0 && (
            <div
              style={{
                textAlign: 'center',
                color: 'var(--text-tertiary)',
                padding: '20px 0',
                fontSize: '13px',
              }}
            >
              暂无历史对话
              <br />
              <span style={{ fontSize: '12px' }}>开始对话或上传文档</span>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
