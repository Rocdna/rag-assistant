/**
 * 用户记忆存储管理
 *
 * 功能：
 * - 跨会话持久化存储用户信息
 * - 存储用户偏好、重要事实、会话摘要
 * - 支持记忆过期自动清理
 */

const MEMORY_STORAGE_KEY = 'rag_user_memory';

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
 * 从 localStorage 加载用户记忆
 */
export function loadUserMemory(): UserMemory {
  try {
    const stored = localStorage.getItem(MEMORY_STORAGE_KEY);
    if (stored) {
      const memory = JSON.parse(stored) as UserMemory;
      // 验证结构并清理过期记忆
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
 */
export function saveUserMemory(memory: UserMemory): void {
  try {
    memory.updatedAt = Date.now();
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memory));
    console.log(`[💾 saveUserMemory] 已保存 ${memory.facts.length} 条事实到 localStorage`);
  } catch (e) {
    console.error('保存用户记忆失败:', e);
  }
}

/**
 * 更新用户偏好
 */
export function updatePreference(key: keyof UserMemory['preferences'], value: string | string[] | undefined): UserMemory {
  const memory = loadUserMemory();
  (memory.preferences as Record<string, unknown>)[key] = value;
  saveUserMemory(memory);
  return memory;
}

/**
 * 添加重要事实（支持置信度）
 */
export function addFact(
  key: string,
  value: string,
  context: string,
  confidence: number = 0.8
): UserMemory {
  console.log(`[💾 addFact] 尝试添加记忆: key="${key}", value="${value}", confidence=${confidence}`);
  const memory = loadUserMemory();
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
    });

    // 限制最大数量
    if (memory.facts.length > MEMORY_CONFIG.maxFacts) {
      memory.facts = memory.facts
        .sort((a, b) => b.confidence - a.confidence) // 按置信度排序
        .slice(0, MEMORY_CONFIG.maxFacts); // 保留置信度最高的
    }
  }

  saveUserMemory(memory);
  return memory;
}

/**
 * 添加会话摘要
 */
export function addSessionSummary(
  topics: string[],
  outcome: string,
  chatId: string
): UserMemory {
  const memory = loadUserMemory();

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

  saveUserMemory(memory);
  return memory;
}

/**
 * 清空所有记忆
 */
export function clearMemory(): void {
  localStorage.removeItem(MEMORY_STORAGE_KEY);
}

/**
 * 生成记忆上下文（用于注入到 System Prompt）
 */
export function generateMemoryContext(): string {
  const memory = loadUserMemory();
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
  if (memory.facts.length > 0) {
    const topFacts = [...memory.facts].sort((a, b) => b.confidence - a.confidence).slice(0, 5);
    const factsStr = topFacts.map((f) => `${f.key}: ${f.value}`).join('，');
    if (factsStr) {
      parts.push(`用户背景：${factsStr}`);
    }
  }

  // 过往会话主题（最近 3 个会话的不同主题）
  if (memory.sessionSummaries.length > 0) {
    const recentTopics = memory.sessionSummaries.slice(-3).flatMap((s) => s.topics);
    const uniqueTopics = [...new Set(recentTopics)].slice(0, 5);
    if (uniqueTopics.length > 0) {
      parts.push(`历史讨论：${uniqueTopics.join('、')}`);
    }
  }

  if (parts.length === 0) {
    return '';
  }

  return `\n\n【用户背景】\n${parts.join('\n')}`;
}
