'use client';

/**
 * 对话历史列表组件
 */

import { useState } from 'react';
import type { Chat } from '@/types/chat';
import { ConfirmModal } from '@/components/chat/confirm-modal';

interface ChatHistoryListProps {
  chats: Chat[];
  currentChatId: string | null;
  onSwitchChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
}

export function ChatHistoryList({ chats, currentChatId, onSwitchChat, onDeleteChat }: ChatHistoryListProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  // 过滤掉没有消息的空对话
  const nonEmptyChats = chats.filter((chat) => chat.messages.length > 0);

  if (nonEmptyChats.length === 0) return null;

  return (
    <>
      {deleteConfirm && (
        <ConfirmModal
          title="删除对话"
          message={`确定要删除对话"${deleteConfirm.title}"吗？删除后将无法恢复。`}
          confirmText="删除"
          variant="danger"
          onConfirm={() => {
            onDeleteChat(deleteConfirm.id);
            setDeleteConfirm(null);
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
      <div className="chat-history-list">
        {nonEmptyChats.map((chat) => (
          <div
            key={chat.id}
            className={`conversation-item ${chat.id === currentChatId ? 'active' : ''}`}
          >
            <div className="conversation-item-content" onClick={() => onSwitchChat(chat.id)}>
              <span className="conversation-item-title">{chat.title}</span>
              <span className="conversation-item-time">
                {new Date(chat.updatedAt).toLocaleDateString('zh-CN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <button
              className="conversation-item-delete"
              onClick={() => setDeleteConfirm({ id: chat.id, title: chat.title })}
              title="删除对话"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
