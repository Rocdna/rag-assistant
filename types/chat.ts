/**
 * 聊天相关的类型定义
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: number;
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface Settings {
  fontSize: number;
  themeColor: string;
}

export interface Document {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: number;
  chunkCount?: number;
  indexed?: boolean;
}

export interface RAGConfig {
  embeddingModel: string;
  llmModel: string;
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
}

// ============================================================
// Function Calling 类型
// ============================================================

/**
 * 工具调用请求
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * 工具执行结果
 */
export interface ToolResult {
  success: boolean;
  result: string;
  error?: string;
}

/**
 * OpenAI Chat Completion Tool 定义格式
 */
export interface ChatCompletionTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description?: string;
        enum?: string[];
      }>;
      required: string[];
    };
  };
}

// ============================================================
// ReAct 类型
// ============================================================

/**
 * ReAct 步骤类型
 */
export type ReactStepType = 'thought' | 'action' | 'observation' | 'final_answer';

/**
 * ReAct 单个步骤
 */
export interface ReactStep {
  type: ReactStepType;
  content: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
}

/**
 * ReAct 消息（包含思考过程）
 */
export interface ReactMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;          // 最终回答
  reactSteps?: ReactStep[]; // 思考步骤（可选）
  createdAt?: number;
}
