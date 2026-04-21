'use client';

import React, { useRef, useEffect, useState } from 'react';
import { MessageItem } from './message/message-item';
import type { ChatMessage } from '@/types/chat';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  userLocation?: { lng: number; lat: number } | null;
}

export function MessageList({ messages, isLoading, userLocation }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevIsLoadingRef = useRef(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      setShouldAutoScroll(true);
      scrollToBottom();
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isLoading && !prevIsLoadingRef.current) {
      setShouldAutoScroll(true);
      scrollToBottom();
    }
    prevIsLoadingRef.current = isLoading ?? false;
  }, [isLoading]);

  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom();
    }
  }, [shouldAutoScroll]);

  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom();
    }
  }, [messages]);

  const handleScroll = () => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceFromBottom > 1) {
      setShouldAutoScroll(false);
    } else if (distanceFromBottom < 5) {
      setShouldAutoScroll(true);
      scrollToBottom();
    }
  };

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📚</div>
        <div className="empty-state-title">RAG 知识库助手</div>
        <p>上传文档后，我可以基于文档内容回答你的问题</p>
      </div>
    );
  }

  return (
    <div className="message-list" ref={containerRef} onScroll={handleScroll}>
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          isLoading={isLoading}
          userLocation={userLocation}
        />
      ))}
    </div>
  );
}
