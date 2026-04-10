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
  // 过滤掉没有消息的空对话（新建的对话如果没有发消息就不显示）
  const nonEmptyChats = chats.filter((chat) => chat.messages.length > 0);

  if (nonEmptyChats.length === 0) return null;

  return (
    <div className="chat-history-list">
      {nonEmptyChats.map((chat) => (
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
