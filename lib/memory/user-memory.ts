/**
 * 用户记忆存储管理
 *
 * 功能：
 * - 跨会话持久化存储用户信息
 * - 存储用户偏好、重要事实、会话摘要
 * - 支持记忆过期自动清理
 */

const MEMORY_STORAGE_KEY_PREFIX = 'rag_user_memory';

// 记忆配置
const MEMORY_CONFIG = {
  /** 事实记忆过期时间（毫秒），默认 30 天 */
  factExpiryMs: 30 * 24 * 60 * 60 * 1000,
  /** 最多保留的事实数量 */
  maxFacts: 20,
  /** 会话摘要过期时间（毫秒），默认 7 天 */
  sessionExpiryMs: 7 * 24 * 60 * 60 * 1000,
  /** 最多保留的会话摘要数量 */
  maxSessions: 10,
};

/**
 * 事实记忆结构
 */
interface Fact {
  key: string;            // 事实 key，如"姓名"、"公司"
  value: string;          // 事实 value
  context: string;         // 在什么场景下提到的
  confidence: number;      // 置信度 0-1
  updatedAt: number;       // 更新时间
  source?: 'user' | 'session'; // 来源：user=用户明确提供，session=会话上下文提取
  chatId?: string;         // 关联的对话 ID（session 级事实才有）
}

/**
 * 用户记忆结构
 */
export interface UserMemory {
  /** 用户偏好 */
  preferences: {
    name?: string;           // 姓名
    location?: string;      // 所在地
    interests?: string[];   // 感兴趣的话题
    defaultModel?: string;   // 默认模型
  };
  /** 重要事实 */
  facts: Fact[];
  /** 过往会话摘要 */
  sessionSummaries: Array<{
    date: string;           // 日期
    topics: string[];      // 讨论主题
    outcome: string;        // 结果/结论
    chatId: string;         // 对话 ID
    updatedAt: number;      // 更新时间
  }>;
  /** 最后更新时间 */
  updatedAt: number;
}

/**
 * 默认空记忆
 */
function createEmptyMemory(): UserMemory {
  return {
    preferences: {},
    facts: [],
    sessionSummaries: [],
    updatedAt: Date.now(),
  };
}

/**
 * 清理过期记忆
 */
function cleanupExpiredMemory(memory: UserMemory): UserMemory {
  const now = Date.now();

  // 清理过期的事实
  memory.facts = memory.facts
    .filter((f) => now - f.updatedAt < MEMORY_CONFIG.factExpiryMs)
    .slice(-MEMORY_CONFIG.maxFacts); // 保留最新的

  // 清理过期的会话摘要
  memory.sessionSummaries = memory.sessionSummaries
    .filter((s) => now - s.updatedAt < MEMORY_CONFIG.sessionExpiryMs)
    .slice(-MEMORY_CONFIG.maxSessions); // 保留最新的

  return memory;
}

/**
 * 清理旧的 session 级事实（兼容迁移）
 *
 * 旧版记忆没有 source 字段，这些 facts 可能是会话级抽取的。
 * 调用此函数可清除所有 source !== 'user' 的事实。
 * 新增的事实通过 addFact 的 source 参数区分。
 *
 * @param userId 用户ID
 * @returns 清理后保留的记忆
 */
export function cleanupContextFacts(userId?: string): UserMemory {
  const memory = loadUserMemory(userId);
  const before = memory.facts.length;

  // 保留有明确 source 且 source !== 'session' 的事实
  // 没有 source 字段的旧事实也一并清理（可能是会话级抽取的）
  memory.facts = memory.facts.filter((f) => f.source === 'user');

  const removed = before - memory.facts.length;
  if (removed > 0) {
    console.log(`[记忆清理] 移除了 ${removed} 条 session 级旧事实`);
    saveUserMemory(memory, userId);
  }

  return memory;
}

/**
 * 从 localStorage 加载用户记忆
 * @param userId 用户ID，未登录时为 undefined
 */
export function loadUserMemory(userId?: string): UserMemory {
  const key = `${MEMORY_STORAGE_KEY_PREFIX}_${userId || ''}`;
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const memory = JSON.parse(stored) as UserMemory;
      if (memory && typeof memory === 'object') {
        return cleanupExpiredMemory(memory);
      }
    }
  } catch (e) {
    console.error('加载用户记忆失败:', e);
  }
  return createEmptyMemory();
}

/**
 * 保存用户记忆到 localStorage
 * @param memory 记忆对象
 * @param userId 用户ID，未登录时为 undefined
 */
export function saveUserMemory(memory: UserMemory, userId?: string): void {
  const key = `${MEMORY_STORAGE_KEY_PREFIX}_${userId || ''}`;
  try {
    memory.updatedAt = Date.now();
    localStorage.setItem(key, JSON.stringify(memory));
  } catch (e) {
    console.error('保存用户记忆失败:', e);
  }
}

/**
 * 更新用户偏好
 */
export function updatePreference(key: keyof UserMemory['preferences'], value: string | string[] | undefined, userId?: string): UserMemory {
  const memory = loadUserMemory(userId);
  (memory.preferences as Record<string, unknown>)[key] = value;
  saveUserMemory(memory, userId);
  return memory;
}

/**
 * 添加重要事实（支持置信度和来源）
 */
export function addFact(
  key: string,
  value: string,
  context: string,
  confidence: number = 0.8,
  userId?: string,
  source?: 'user' | 'session',
  chatId?: string
): UserMemory {
  const memory = loadUserMemory(userId);
  const existingIndex = memory.facts.findIndex((f) => f.key === key);
  if (existingIndex >= 0) {
    // 只有新记忆置信度更高时才更新
    if (confidence > (memory.facts[existingIndex].confidence || 0)) {
      memory.facts[existingIndex] = {
        key,
        value,
        context,
        confidence,
        updatedAt: Date.now(),
        source,
        chatId,
      };
    }
  } else {
    // 添加新事实
    memory.facts.push({
      key,
      value,
      context,
      confidence,
      updatedAt: Date.now(),
      source,
      chatId,
    });

    // 限制最大数量
    if (memory.facts.length > MEMORY_CONFIG.maxFacts) {
      memory.facts = memory.facts
        .sort((a, b) => b.confidence - a.confidence) // 按置信度排序
        .slice(0, MEMORY_CONFIG.maxFacts); // 保留置信度最高的
    }
  }

  saveUserMemory(memory, userId);
  return memory;
}

/**
 * 添加会话摘要
 */
export function addSessionSummary(
  topics: string[],
  outcome: string,
  chatId: string,
  userId?: string
): UserMemory {
  const memory = loadUserMemory(userId);

  memory.sessionSummaries.push({
    date: new Date().toISOString().split('T')[0],
    topics,
    outcome,
    chatId,
    updatedAt: Date.now(),
  });

  // 只保留最近 N 个摘要
  if (memory.sessionSummaries.length > MEMORY_CONFIG.maxSessions) {
    memory.sessionSummaries = memory.sessionSummaries.slice(-MEMORY_CONFIG.maxSessions);
  }

  saveUserMemory(memory, userId);
  return memory;
}

/**
 * 删除指定会话的摘要
 */
export function deleteSessionSummary(chatId: string, userId?: string): void {
  const memory = loadUserMemory(userId);
  memory.sessionSummaries = memory.sessionSummaries.filter((s) => s.chatId !== chatId);
  saveUserMemory(memory, userId);
}

/**
 * 删除指定会话抽取的事实（session 级记忆）
 */
export function deleteFactsByChatId(chatId: string, userId?: string): void {
  const memory = loadUserMemory(userId);
  const before = memory.facts.length;
  memory.facts = memory.facts.filter((f) => f.chatId !== chatId);
  const removed = before - memory.facts.length;
  if (removed > 0) {
    console.log(`[记忆] 删除对话 ${chatId} 的 ${removed} 条 session 级事实`);
    saveUserMemory(memory, userId);
  }
}

/**
 * 清空所有记忆（仅清当前用户的）
 */
export function clearMemory(userId?: string): void {
  const key = `${MEMORY_STORAGE_KEY_PREFIX}_${userId || ''}`;
  localStorage.removeItem(key);
}

/**
 * 生成记忆上下文（用于注入到 System Prompt）
 */
export function generateMemoryContext(userId?: string): string {
  const memory = loadUserMemory(userId);
  const parts: string[] = [];

  // 用户偏好
  if (Object.keys(memory.preferences).length > 0) {
    const prefs = Object.entries(memory.preferences)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}: ${v}`)
      .join('，');
    if (prefs) {
      parts.push(`用户偏好：${prefs}`);
    }
  }

  // 重要事实（按置信度排序，取最高的 5 个）
  // session facts 也会进入新会话，只在删除关联对话时清除
  if (memory.facts.length > 0) {
    const topFacts = [...memory.facts].sort((a, b) => b.confidence - a.confidence).slice(0, 5);
    const factsStr = topFacts.map((f) => `${f.key}: ${f.value}`).join('，');
    if (factsStr) {
      parts.push(`用户背景：${factsStr}`);
    }
  }

  if (parts.length === 0) {
    return '';
  }

  return `\n\n【用户背景】\n${parts.join('\n')}`;
}
