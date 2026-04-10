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
  const [showTitleTip, setShowTitleTip] = useState<string | null>(null);

  // 移动端检测
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (chats.length === 0) return null;

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: 'var(--text-secondary)',
        padding: '8px 0',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '8px'
      }}>
        <span>💬 历史对话 ({chats.length})</span>
      </div>
      {chats.map((chat) => (
        <div
          key={chat.id}
          onClick={() => {
            if (isMobile && chat.title.length > 15) {
              setShowTitleTip(chat.title);
              setTimeout(() => setShowTitleTip(null), 2000);
            }
            onSwitchChat(chat.id);
          }}
          className="chat-item"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            marginBottom: '4px',
            borderRadius: '8px',
            cursor: 'pointer',
            background: chat.id === currentChatId ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
            color: chat.id === currentChatId ? 'var(--accent-color)' : 'var(--text-primary)',
            borderLeft: chat.id === currentChatId ? '3px solid var(--accent-color)' : '3px solid transparent',
          }}
          onMouseEnter={(e) => {
            if (chat.id !== currentChatId) {
              e.currentTarget.style.background = 'var(--bg-secondary)';
            }
            (e.currentTarget.querySelector('.delete-btn') as HTMLElement).style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            if (chat.id !== currentChatId) {
              e.currentTarget.style.background = 'transparent';
            }
            (e.currentTarget.querySelector('.delete-btn') as HTMLElement).style.opacity = '0';
          }}
        >
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '13px',
              flex: 1,
            }}
            title={chat.title}
          >
            {chat.title}
          </span>
          <button
            className="delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteChat(chat.id);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '4px 8px',
              borderRadius: '4px',
              marginLeft: '8px',
              transition: 'color 0.2s, background-color 0.2s',
              opacity: 0,
            }}
            title="删除对话"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.background = 'none';
            }}
          >
            🗑️
          </button>
        </div>
      ))}
    </div>
  );
}
