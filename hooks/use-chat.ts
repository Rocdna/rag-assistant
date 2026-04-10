/**
 * 聊天状态管理 Hook
 *
 * 功能：
 * - 对话历史管理（创建、切换、删除）
 * - 消息状态管理
 * - 聊天设置（模型选择）
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { Chat, ChatMessage } from '@/types/chat';
import { generateId } from '@/lib/utils';

const STORAGE_KEY = 'rag_chat_history';

/**
 * 估算 token 数量（简单估算）
 */
function estimateTokens(text: string): number {
  let tokens = 0;
  for (const char of text) {
    tokens += /[\u4e00-\u9fa5]/.test(char) ? 0.5 : 0.25;
  }
  return Math.ceil(tokens);
}

/**
 * 截断消息数组，防止超过上下文窗口
 */
function truncateMessages(msgs: ChatMessage[], maxTokens: number = 6000): ChatMessage[] {
  let totalTokens = 0;
  for (const msg of msgs) {
    totalTokens += estimateTokens(msg.content) + 10;
  }
  if (totalTokens <= maxTokens) return msgs;

  const result = [...msgs];
  while (result.length > 1 && totalTokens > maxTokens) {
    const removed = result.shift();
    if (removed) totalTokens -= estimateTokens(removed.content) + 10;
  }
  return result;
}

/**
 * useChat Hook - 管理对话历史
 */
export function useChat() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [pendingChatId, setPendingChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('qwen3-max-preview');
  // AbortController ref，用于取消 fetch 请求
  const abortControllerRef = useRef<AbortController | null>(null);

  // 使用 ref 存储 chats 最新值，避免 handleSubmit 依赖数组问题
  const chatsRef = useRef<Chat[]>([]);
  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  // 初始化
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { chats: storedChats, currentChatId: storedId } = JSON.parse(stored);
        setChats(storedChats || []);
        setCurrentChatId(storedId || null);
      } catch (e) {
        console.error('Failed to load chats:', e);
      }
    }
  }, []);

  // 保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ chats, currentChatId }));
  }, [chats, currentChatId]);

  const currentChat = useMemo(
    () => chats.find((c) => c.id === currentChatId) || null,
    [chats, currentChatId]
  );

  const visibleChats = useMemo(
    () => chats.filter((c) => c.id !== pendingChatId),
    [chats, pendingChatId]
  );

  const createChat = useCallback(() => {
    // 清理所有空的对话（没有任何消息的）
    setChats((prev) => {
      return prev.filter((c) => c.messages.length > 0);
    });

    // 如果当前有 pending chat 且是空的，先清除
    if (pendingChatId) {
      setChats((prev) => prev.filter((c) => c.id !== pendingChatId));
    }

    const newChat: Chat = {
      id: generateId(),
      title: '新对话',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setChats((prev) => {
      return [newChat, ...prev];
    });
    setCurrentChatId(newChat.id);
    setPendingChatId(newChat.id);
    setInput('');
    return newChat.id;
  }, [pendingChatId]);

  const switchChat = useCallback(
    (chatId: string) => {
      // 切换前清理：如果有 pending 的空对话，删除它
      if (pendingChatId && pendingChatId !== chatId) {
        setChats((prev) => prev.filter((c) => c.id !== pendingChatId));
      }
      // 清除 pending 状态
      setPendingChatId(null);
      setCurrentChatId(chatId);
      setInput('');
    },
    [pendingChatId]
  );

  const deleteChat = useCallback(
    (chatId: string) => {
      setChats((prev) => {
        const newChats = prev.filter((c) => c.id !== chatId);
        // 如果删除的是当前聊天，切换到第一个剩余的聊天
        if (currentChatId === chatId) {
          setCurrentChatId(newChats.length > 0 ? newChats[0].id : null);
        }
        if (pendingChatId === chatId) {
          setPendingChatId(null);
        }
        return newChats;
      });
    },
    [currentChatId, pendingChatId]
  );

  /**
   * 提交消息（由页面组件调用 API）
   */
  const handleSubmit = useCallback(
    async (
      e: React.FormEvent,
      useRAG: boolean = true,
      documentName?: string | null,
      queryExpansion?: boolean,
      hybridSearch?: boolean,
      thinking?: boolean,
      webSearch?: boolean,
      agent?: boolean,
      react?: boolean
    ) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;

      let chatId = currentChatId;
      if (!chatId) {
        chatId = createChat();
      }

      if (chatId === pendingChatId) {
        setPendingChatId(null);
      }

      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: input.trim(),
      };

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== chatId) return chat;
          return {
            ...chat,
            messages: [...chat.messages, userMessage],
            updatedAt: Date.now(),
          };
        })
      );

      setInput('');
      setIsLoading(true);

      // 创建 AbortController
      abortControllerRef.current = new AbortController();

      // 使用 ref 获取最新 chats，避免闭包问题
      const currentMessages = chatsRef.current.find((c) => c.id === chatId)?.messages || [];
      const allMessages = truncateMessages([...currentMessages, userMessage]);

      const assistantMessageId = generateId();

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== chatId) return chat;
          return {
            ...chat,
            messages: [
              ...chat.messages,
              {
                id: assistantMessageId,
                role: 'assistant' as const,
                content: '',
              },
            ],
            updatedAt: Date.now(),
          };
        })
      );

      // 存储已生成的回复内容，用于取消时追加省略号
      let assistantContent = '';

      try {
        // 选择 API：Agent > RAG > 普通 Chat
        // Agent 模式下 react 参数控制是否展示思考过程
        let apiEndpoint = '/api/chat';
        let requestBody: Record<string, unknown>;

        if (agent === true) {
          // Agent API - react 参数控制是否展示思考过程
          apiEndpoint = '/api/agent';
          requestBody = {
            query: input.trim(),
            messages: allMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
            model: selectedModel,
            react: react === true, // 传递 react 参数
          };
        } else if (useRAG) {
          // RAG API
          requestBody = {
            query: input.trim(),
            messages: allMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
            model: selectedModel,
            topK: 5,
            documentName,
            useRAG: true,
            queryExpansion: queryExpansion || false,
            hybridSearch: hybridSearch || false,
            thinking: thinking || false,
            webSearch: webSearch || false,
          };
        } else {
          // 普通 Chat API
          requestBody = {
            messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
            model: selectedModel,
            thinking: thinking || false,
            webSearch: webSearch || false,
          };
        }

        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          let errorMessage = `请求失败 (${response.status})`;
          try {
            const errorData = await response.json();
            if (errorData && typeof errorData === 'object' && 'error' in errorData) {
              errorMessage = String(errorData.error);
            }
          } catch {
            // response body 可能已被消费或不是 JSON，使用默认错误消息
          }
          throw new Error(errorMessage);
        }

        // 处理流式响应
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        const isReactMode = react === true;

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]' || !data) continue;

              try {
                const parsed = JSON.parse(data);
                if (!parsed || typeof parsed !== 'object') continue;

                if (isReactMode && parsed.type && parsed.content) {
                  // ReAct 模式：处理自定义事件格式
                  const { type, content } = parsed;
                  const prefixMap: Record<string, string> = {
                    thought: '💭 思考：',
                    action: '🎯 行动：',
                    observation: '👁️ 观察：',
                    final_answer: '✨ 最终回答：',
                  };
                  const prefix = prefixMap[type] || '';
                  assistantContent += `${prefix}${content}\n\n`;
                } else {
                  // 普通 Chat/Agent/RAG 模式：处理 OpenAI 格式
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    assistantContent += content;
                  }
                }

                // 实时更新 UI
                setChats((prev) =>
                  prev.map((chat) => {
                    if (chat.id !== chatId) return chat;
                    return {
                      ...chat,
                      messages: chat.messages.map((m) =>
                        m.id === assistantMessageId ? { ...m, content: assistantContent } : m
                      ),
                      updatedAt: Date.now(),
                    };
                  })
                );
              } catch {
                // ignore parse errors
              }
            }
          }
        }

        // 生成标题
        if (allMessages.filter((m) => m.role === 'user').length === 1) {
          const title = userMessage.content.slice(0, 20) + (userMessage.content.length > 20 ? '...' : '');
          setChats((prev) =>
            prev.map((chat) => {
              if (chat.id === chatId) return { ...chat, title };
              return chat;
            })
          );
        }
      } catch (error) {
        // 如果是取消请求，不删除消息（保留已生成的内容），追加省略号表示未完成
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('请求已取消');
          const finalContent = assistantContent ? `${assistantContent}...` : '...';
          setChats((prev) =>
            prev.map((chat) => {
              if (chat.id !== chatId) return chat;
              return {
                ...chat,
                messages: chat.messages.map((m) =>
                  m.id === assistantMessageId ? { ...m, content: finalContent } : m
                ),
                updatedAt: Date.now(),
              };
            })
          );
          return;
        }
        console.error('聊天错误:', error);
        setChats((prev) =>
          prev.map((chat) => {
            if (chat.id !== chatId) return chat;
            return {
              ...chat,
              messages: chat.messages.filter((m) => m.id !== assistantMessageId),
            };
          })
        );
        // 显示错误消息给用户
        setChats((prev) =>
          prev.map((chat) => {
            if (chat.id !== chatId) return chat;
            return {
              ...chat,
              messages: [
                ...chat.messages,
                {
                  id: generateId(),
                  role: 'assistant' as const,
                  content: `错误: ${error instanceof Error ? error.message : '未知错误'}`,
                  createdAt: Date.now(),
                },
              ],
            };
          })
        );
      } finally {
        abortControllerRef.current = null;
        setIsLoading(false);
      }
    },
    [input, currentChatId, isLoading, createChat, pendingChatId, selectedModel]
  );

  /**
   * 取消当前生成
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    []
  );

  return {
    chats: visibleChats,
    currentChat,
    currentChatId,
    messages: currentChat?.messages || [],
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
  };
}
