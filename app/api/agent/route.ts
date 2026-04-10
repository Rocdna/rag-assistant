/**
 * Agent API - 基于 OpenAI Function Calling 的智能 Agent
 *
 * 支持两种模式：
 * - 普通模式（react=false）：直接返回结果
 * - ReAct 模式（react=true）：展示思考过程（💭思考 → 🎯行动 → 👁️观察 → ✨回答）
 */

import OpenAI from 'openai';
import { TOOL_DEFINITIONS, TOOL_EXECUTORS } from '@/lib/tools/definitions';
import { getChunksStoreStats } from '@/lib/chunks-store';
import type { ToolResult } from '@/types/chat';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

// ============================================================
// 常量配置
// ============================================================

const MAX_TOOL_CALLS = 10;
const MAX_STREAM_CHARS = 50;

const SYSTEM_PROMPT = `你是智能助手，擅长理解用户问题并调用合适的工具来回答。

【你的能力】
- 访问本地文档知识库（搜索、列表、统计）
- 查询天气（天气预报、空气质量、预警、指数、分钟降水）
- 联网搜索（搜索最新新闻、实时信息）

【工作方式】
1. 理解用户问题
2. 选择合适的工具调用
3. 基于工具返回的结果回答用户问题

【重要规则】
- 如果用户询问天气相关问题，必须调用天气工具（get_weather 或其他天气工具）
- 如果用户询问文档相关问题，调用文档工具
- 如果用户没有提供位置信息（如城市名），而问题需要位置（如天气查询），先询问用户位置
- 如果知识库为空且用户询问文档内容，告知用户先上传文档
- 回答要简洁，自然，像对话一样

【输出格式】
直接回答用户问题，不需要额外的计划格式。`;

const REACT_SYSTEM_PROMPT = `${SYSTEM_PROMPT}

【ReAct 输出格式】
你必须按以下格式输出推理过程：

思考：<你的推理过程，解释为什么要调用工具>
行动：<工具名称> <参数，JSON格式>
观察：<工具执行结果>

重复以上步骤直到得到最终答案，然后输出：
最终回答：<你的完整回答>

【示例】
用户：上海天气怎么样？
思考：用户想知道上海的天气，我需要调用天气工具查询
行动：get_weather {"location": "上海"}
观察：上海今天天气晴朗，气温28度，东南风3级
思考：根据天气信息，可以给出完整回答了
最终回答：上海今天天气晴朗，气温28度，东南风3级，适合外出活动。`;

// ============================================================
// 工具执行
// ============================================================

async function executeTool(toolCall: { name: string; arguments: string }): Promise<ToolResult> {
  const executor = TOOL_EXECUTORS[toolCall.name as keyof typeof TOOL_EXECUTORS];
  if (!executor) {
    return { success: false, result: '', error: `未知工具: ${toolCall.name}` };
  }

  try {
    const args = JSON.parse(toolCall.arguments);
    return await executor(toolCall.name, args);
  } catch (e) {
    return {
      success: false,
      result: '',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// ============================================================
// 流式输出工具
// ============================================================

function createSSEMessage(type: string, content: string): string {
  return `data: ${JSON.stringify({ type, content })}\n\n`;
}

function createTextStream(text: string): ReadableStream {
  const encoder = new TextEncoder();
  let index = 0;

  return new ReadableStream({
    async pull(controller) {
      if (index < text.length) {
        const chunk = text.slice(index, index + MAX_STREAM_CHARS);
        index += MAX_STREAM_CHARS;
        controller.enqueue(
          encoder.encode('data: ' + JSON.stringify({
            choices: [{ delta: { content: chunk } }]
          }) + '\n\n')
        );
      } else {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });
}

// ============================================================
// ReAct 模式：流式输出思考过程
// ============================================================

function streamReactSteps(steps: Array<{ type: string; content: string }>): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      for (const step of steps) {
        const message = createSSEMessage(step.type, step.content);
        controller.enqueue(encoder.encode(message));
        // 每个步骤之间稍作延迟，让用户能看清
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
}

// ============================================================
// 核心逻辑
// ============================================================

/**
 * 非流式调用 LLM，获取完整的 tool_calls
 */
async function callLLMWithTools(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  model: string
): Promise<{
  content: string;
  toolCalls: OpenAI.Chat.ChatCompletionMessage['tool_calls'];
}> {
  const response = await openai.chat.completions.create({
    model,
    messages,
    tools: TOOL_DEFINITIONS,
    tool_choice: 'auto',
    stream: false,
  });

  const message = response.choices[0]?.message;

  return {
    content: message?.content || '',
    toolCalls: message?.tool_calls || [],
  };
}

/**
 * 流式调用 LLM，返回最终回答
 */
async function streamLLMResponse(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  model: string,
  signal?: AbortSignal
): Promise<Response> {
  const stream = await openai.chat.completions.create({
    model,
    messages,
    stream: true,
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (signal?.aborted) {
            controller.close();
            return;
          }

          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            controller.enqueue(
              encoder.encode('data: ' + JSON.stringify({
                choices: [{ delta: { content } }]
              }) + '\n\n')
            );
          }

          if (chunk.choices[0]?.finish_reason === 'stop') {
            break;
          }
        }
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

// ============================================================
// API Handler
// ============================================================

export async function POST(req: Request) {
  try {
    const { query, messages, model, react = false } = await req.json();

    if (!query) {
      return Response.json({ error: '问题不能为空' }, { status: 400 });
    }

    const selectedModel = model || process.env.DEFAULT_MODEL || 'qwen3-max';

    // 检查知识库状态
    const stats = await getChunksStoreStats();
    const hasDocuments = stats.totalDocuments > 0;

    // 根据是否启用 ReAct 模式选择系统提示
    const systemPrompt = react ? REACT_SYSTEM_PROMPT : (hasDocuments
      ? `${SYSTEM_PROMPT}\n\n【当前知识库状态】\n已有 ${stats.totalDocuments} 个文档，总计 ${stats.totalChunks} 个片段。`
      : `${SYSTEM_PROMPT}\n\n【当前知识库状态】\n知识库为空，没有上传任何文档。`);

    // 构建消息历史
    const conversationMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    // 添加对话历史
    if (messages && messages.length > 0) {
      for (const m of messages) {
        if (m.role === 'user' || m.role === 'assistant') {
          conversationMessages.push({ role: m.role, content: m.content });
        }
      }
    }

    // 添加当前问题
    conversationMessages.push({ role: 'user', content: query });

    // ============================================================
    // ReAct 模式：展示思考过程
    // ============================================================
    if (react) {
      return handleReactMode(conversationMessages, selectedModel, req.signal);
    }

    // ============================================================
    // 普通模式：直接返回结果
    // ============================================================
    return handleNormalMode(conversationMessages, selectedModel, req.signal);
  } catch (error: any) {
    console.error('Agent API 错误:', error);

    if (error.name === 'AbortError') {
      return new Response('【已停止生成】', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    return Response.json(
      { error: error.message || String(error) },
      { status: 500 }
    );
  }
}

/**
 * 普通模式：直接返回结果，不展示思考过程
 */
async function handleNormalMode(
  conversationMessages: OpenAI.Chat.ChatCompletionMessageParam[],
  model: string,
  signal?: AbortSignal
): Promise<Response> {
  let toolCallCount = 0;

  while (toolCallCount < MAX_TOOL_CALLS) {
    // 检查是否已取消
    if (signal?.aborted) {
      return new Response('【已停止生成】', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    toolCallCount++;

    // 非流式调用 LLM
    const { content, toolCalls } = await callLLMWithTools(conversationMessages, model);

    // 如果没有工具调用，直接返回 LLM 的回答（流式）
    if (!toolCalls || toolCalls.length === 0) {
      if (content) {
        return streamLLMResponse(conversationMessages, model, signal);
      }
      // LLM 没有生成内容，结束
      const fallback = '抱歉，我没有理解您的问题，请重试。';
      return new Response(createTextStream(fallback), {
        headers: { 'Content-Type': 'text/event-stream' },
      });
    }

    // 添加 LLM 的 assistant 消息
    conversationMessages.push({
      role: 'assistant',
      content: content || '',
      tool_calls: toolCalls,
    });

    // 并行执行工具调用
    const executedTools = await Promise.all(
      toolCalls.map(async (tc: any) => {
        const result = await executeTool({
          name: tc.function?.name || '',
          arguments: tc.function?.arguments || '{}',
        });

        return {
          role: 'tool' as const,
          tool_call_id: tc.id,
          content: result.success
            ? result.result
            : `【工具执行错误】${result.error}`,
        };
      })
    );

    // 添加工具结果到消息历史
    conversationMessages.push(...executedTools);
  }

  // 达到最大工具调用次数
  const finalResponse = '工具调用次数过多，请重试。';
  return new Response(createTextStream(finalResponse), {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

/**
 * ReAct 模式：真正的流式输出思考过程
 */
async function handleReactMode(
  conversationMessages: OpenAI.Chat.ChatCompletionMessageParam[],
  model: string,
  signal?: AbortSignal
): Promise<Response> {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController;
  let isDone = false;

  const pushStep = (type: string, content: string) => {
    if (!isDone && controller) {
      const message = createSSEMessage(type, content);
      controller.enqueue(encoder.encode(message));
    }
  };

  const done = () => {
    if (!isDone && controller) {
      isDone = true;
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    }
  };

  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
    cancel() {
      isDone = true;
    },
  });

  // 启动 ReAct 循环
  runReactLoop(conversationMessages, model, signal, pushStep, done).catch((error) => {
    if (error instanceof Error && error.name !== 'AbortError') {
      console.error('ReAct 模式错误:', error);
    }
    done();
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

async function runReactLoop(
  conversationMessages: OpenAI.Chat.ChatCompletionMessageParam[],
  model: string,
  signal: AbortSignal | undefined,
  pushStep: (type: string, content: string) => void,
  done: () => void
) {
  let toolCallCount = 0;

  while (toolCallCount < MAX_TOOL_CALLS) {
    // 检查是否已取消
    if (signal?.aborted) {
      return;
    }

    toolCallCount++;

    // 非流式调用 LLM
    const { content, toolCalls } = await callLLMWithTools(conversationMessages, model);

    // 如果有思考内容（以"思考："开头），提取并发送
    const thoughtMatch = content.match(/思考[：:]\s*([^\n]+)/);
    if (thoughtMatch) {
      pushStep('thought', thoughtMatch[1].trim());
      // 短暂延迟让用户看清
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 检查是否有最终回答
    const finalMatch = content.match(/最终回答[：:]\s*([\s\S]*)$/);
    if (finalMatch) {
      pushStep('final_answer', finalMatch[1].trim());
      done();
      return;
    }

    // 如果没有工具调用但有内容，直接作为回答返回
    if (!toolCalls || toolCalls.length === 0) {
      if (content) {
        pushStep('final_answer', content);
      } else {
        pushStep('final_answer', '抱歉，无法处理这个问题。');
      }
      done();
      return;
    }

    // 执行工具调用
    for (const tc of toolCalls) {
      const tcAny = tc as any;
      const toolName = tcAny.function?.name || '';
      const toolArgs = tcAny.function?.arguments || '{}';

      pushStep('action', `调用 ${toolName}(${toolArgs})`);
      await new Promise(resolve => setTimeout(resolve, 50));

      // 解析参数并执行
      const result = await executeTool({ name: toolName, arguments: toolArgs });
      const observationContent = result.success
        ? result.result
        : `工具执行失败: ${result.error}`;

      pushStep('observation', observationContent);
      await new Promise(resolve => setTimeout(resolve, 50));

      // 添加到对话历史
      conversationMessages.push({
        role: 'assistant',
        content: content || '',
        tool_calls: [tc],
      });

      conversationMessages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: observationContent,
      });
    }
  }

  // 达到最大步骤数
  pushStep('final_answer', '思考过程过长，请尝试简化问题。');
  done();
}
