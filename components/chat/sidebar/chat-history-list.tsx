'use client';

/**
 * 对话历史列表组件
 */

import { useState, useEffect } from 'react';
import type { Chat } from '@/types/chat';

interface ChatHistoryListProps {
  chats: Chat[];
  currentChatId: string | null;
  onSwitchChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
}

export function ChatHistoryList({ chats, currentChatId, onSwitchChat, onDeleteChat }: ChatHistoryListProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (chats.length === 0) return null;

  return (
    <div className="chat-history-list">
      {chats.map((chat) => (
        <div
          key={chat.id}
          onClick={() => onSwitchChat(chat.id)}
          className={`conversation-item ${chat.id === currentChatId ? 'active' : ''}`}
        >
          <span className="conversation-item-title">{chat.title}</span>
          <div className="conversation-item-meta">
            <span className="conversation-item-time">
              {new Date(chat.updatedAt).toLocaleDateString('zh-CN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <button
              className="conversation-item-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteChat(chat.id);
              }}
              title="删除对话"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
