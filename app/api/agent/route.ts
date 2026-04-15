/**
 * Agent API - 基于 OpenAI Function Calling 的智能 Agent
 *
 * 支持两种模式：
 * - 普通模式（react=false）：直接返回结果
 * - ReAct 模式（react=true）：展示思考过程（💭思考 → 🎯行动 → 👁️观察 → ✨回答）
 */

import OpenAI from 'openai';
import { TOOL_DEFINITIONS, TOOL_EXECUTORS } from '@/lib/tools/definitions';
import { getUserStats } from '@/lib/pinecone';
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

【ReAct 输出格式】（必须严格遵守）
每轮输出必须包含"思考："、"行动："、"观察："之一，直到输出"最终回答："才算结束。

1. 如果需要调用工具：
思考：<推理过程>
行动：<工具名称> <参数>
观察：<工具返回结果>
（重复以上步骤）
最终回答：<完整回答>

2. **如果可以直接回答（如常识问题、不需要工具的问题）：仍然必须输出"思考："再输出"最终回答："**
思考：<分析问题的过程>
最终回答：<完整回答>

【强制规则】
- **禁止跳过"思考"直接输出"最终回答"**
- 禁止在没有"思考："的情况下直接输出回答内容
- 即使你知道答案，也要先写思考过程再给答案

【示例：直接回答（无工具调用）】
用户：什么是 Prompt？
思考：这是一个关于 AI 术语的基础概念问题，不需要调用任何工具，我可以直接基于知识回答
最终回答：Prompt 是...（完整定义）

【示例：需要工具调用】
用户：上海今天天气怎么样？
思考：用户想知道上海的天气，我需要调用天气工具
行动：get_weather {"location": "上海"}
观察：上海今天晴朗，28度
思考：已获取天气信息，可以回答了
最终回答：上海今天天气晴朗，气温28度...`;

// ============================================================
// 工具执行
// ============================================================

async function executeTool(toolCall: { name: string; arguments: string }, userId?: string): Promise<ToolResult> {
  const executor = TOOL_EXECUTORS[toolCall.name as keyof typeof TOOL_EXECUTORS];
  if (!executor) {
    return { success: false, result: '', error: `未知工具: ${toolCall.name}` };
  }

  try {
    const args = JSON.parse(toolCall.arguments);
    // 传递 userId 给文档工具
    if (toolCall.name === 'search_documents' || toolCall.name === 'list_documents' || toolCall.name === 'get_documents_stats') {
      return await executor(toolCall.name, args, userId);
    }
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
  const jsonStr = JSON.stringify({ type, content });
  const sseMsg = `data: ${jsonStr}\n\n`;
  console.log(`[📡 SSE 发送] type=${type}, content长度=${content.length}, SSE长度=${sseMsg.length}`);
  return sseMsg;
}

/**
 * 清理文本内容：去掉 emoji 前缀和多余空白
 */
function cleanContent(text: string): string {
  return text
    .replace(/^[✨💭🎯👁️🔍📌]+/g, '')  // 去掉行首 emoji
    .replace(/^[：:\s]+/g, '')           // 去掉冒号和空白
    .trim();
}

/**
 * 从 LLM 原始 content 中全局扫描所有步骤（不依赖换行）
 * 返回 { thought, action, observation } 数组
 */
function extractAllSteps(content: string): Array<{ type: string; content: string }> {
  const steps: Array<{ type: string; content: string }> = [];
  const stepPatterns = [
    { type: 'thought', regex: /思考[：:]\s*([^\n]+)/g },
    { type: 'action', regex: /行动[：:]\s*([^\n]+)/g },
    { type: 'observation', regex: /观察[：:]\s*([^\n]+)/g },
  ];
  for (const { type, regex } of stepPatterns) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const c = cleanContent(match[1]);
      if (c) steps.push({ type, content: c });
    }
  }
  return steps;
}

/**
 * 将文本分割成句子（按中文标点）
 */
function splitIntoSentences(text: string): string[] {
  const sentences: string[] = [];
  let current = '';

  for (const char of text) {
    current += char;
    if ('。！？；'.includes(char)) {
      sentences.push(current);
      current = '';
    }
  }
  // 剩余内容（必须推送，哪怕没有标点）
  if (current.trim()) {
    sentences.push(current);
  }

  return sentences.filter(s => s.trim());
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
  model: string,
  signal?: AbortSignal
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
    max_tokens: 4096,
  } as any, signal ? { signal } : undefined);

  const message = response.choices[0]?.message;
  const finishReason = response.choices[0]?.finish_reason;
  console.log(`[📡 LLM 原始返回] length=${message?.content?.length || 0}, finish_reason=${finishReason}`);
  if (message?.content) {
    console.log(`[📄 内容预览] ${message.content.slice(0, 100)}...`);
  }

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
    max_tokens: 4096,
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
    const userId = req.headers.get('x-user-id') || undefined;
    const { query, messages, model, react = false, summary, memoryContext } = await req.json();

    console.log('\n========== [🤖 Agent API 入口] ==========');
    console.log(`[入口] query: "${query}"`);
    console.log(`[入口] messages: ${messages?.length || 0} 条`);
    console.log(`[入口] react 模式: ${react}`);
    console.log(`[入口] summary: ${summary ? '有 (' + summary.slice(0, 50) + '...)' : '无'}`);
    console.log(`[入口] memoryContext: ${memoryContext ? '有 (' + memoryContext.slice(0, 50) + '...)' : '无'}`);
    console.log(`[入口] userId: ${userId || 'anonymous'}`);

    if (!query) {
      return Response.json({ error: '问题不能为空' }, { status: 400 });
    }

    const selectedModel = model || process.env.DEFAULT_MODEL || 'qwen3-max';

    // 检查知识库状态
    const stats = await getUserStats(userId);
    const hasDocuments = stats.totalDocuments > 0;

    // 构建用户记忆上下文
    const memorySection = memoryContext
      ? `\n\n【用户记忆上下文】\n${memoryContext}`
      : '';

    // 根据是否启用 ReAct 模式选择系统提示
    const systemPrompt = (react ? REACT_SYSTEM_PROMPT : SYSTEM_PROMPT) +
      (hasDocuments
        ? `\n\n【当前知识库状态】\n已有 ${stats.totalDocuments} 个文档，总计 ${stats.totalChunks} 个片段。`
        : `\n\n【当前知识库状态】\n知识库为空，没有上传任何文档。`) +
      memorySection;

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
      return handleReactMode(conversationMessages, selectedModel, req.signal, userId);
    }

    // ============================================================
    // 普通模式：直接返回结果
    // ============================================================
    return handleNormalMode(conversationMessages, selectedModel, req.signal, userId);
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
  signal?: AbortSignal,
  userId?: string
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
        }, userId);

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
  signal?: AbortSignal,
  userId?: string
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
  runReactLoop(conversationMessages, model, signal, pushStep, done, userId).catch((error) => {
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
  done: () => void,
  userId?: string
) {
  let toolCallCount = 0;

  while (toolCallCount < MAX_TOOL_CALLS) {
    // 检查是否已取消
    if (signal?.aborted) {
      console.log('[⏹️ 用户取消]');
      return;
    }

    toolCallCount++;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[📍 Step ${toolCallCount}] LLM 决策`);
    console.log(`${'='.repeat(60)}`);

    // 非流式调用 LLM
    const { content, toolCalls } = await callLLMWithTools(conversationMessages, model, signal);

    // 打印 LLM 决策
    if (toolCalls && toolCalls.length > 0) {
      console.log(`[🎯 决定调用 ${toolCalls.length} 个工具]`);
      for (const tc of toolCalls) {
        const tcAny = tc as any;
        const toolName = tcAny.function?.name || '';
        const toolArgs = tcAny.function?.arguments || '{}';
        console.log(`   - ${toolName}: ${toolArgs}`);
      }
    } else {
      console.log(`[💬 无工具调用，直接回答]`);
    }

    // 解析 LLM 输出，按行处理 ReAct 格式
    const lines = content.split('\n');
    let hasFinalAnswer = false;
    let finalAnswerContent = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // 判断行类型
      if (trimmedLine.includes('最终回答') || trimmedLine.includes('最终答案')) {
        hasFinalAnswer = true;
        // 提取当前行"最终回答"之后的内容
        const markerIdx = trimmedLine.includes('最终回答')
          ? trimmedLine.indexOf('最终回答')
          : trimmedLine.indexOf('最终答案');
        finalAnswerContent = trimmedLine.slice(markerIdx + 4);
        finalAnswerContent = finalAnswerContent.replace(/^[：:]\s*/, '').trim();
        // 收集后续所有非空行
        for (let j = i + 1; j < lines.length; j++) {
          const nextTrimmed = lines[j].trim();
          if (nextTrimmed) {
            finalAnswerContent += '\n' + nextTrimmed;
          }
        }
        if (finalAnswerContent) {
          console.log(`[📤 最终回答发送] ${finalAnswerContent.length} 字符`);
          pushStep('final_answer', cleanContent(finalAnswerContent));
        }
      } else if (trimmedLine.startsWith('思考') || trimmedLine.startsWith('思考：') || trimmedLine.startsWith('思考:')) {
        const thoughtContent = trimmedLine.replace(/^思考[：:]\s*/, '');
        if (thoughtContent) {
          console.log(`[💭 思考] ${thoughtContent}`);
          pushStep('thought', cleanContent(thoughtContent));
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } else if (trimmedLine.startsWith('行动') || trimmedLine.startsWith('行动：') || trimmedLine.startsWith('行动:')) {
        const actionContent = trimmedLine.replace(/^行动[：:]\s*/, '');
        if (actionContent) {
          console.log(`[🎯 行动] ${actionContent}`);
          pushStep('action', cleanContent(actionContent));
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } else if (trimmedLine.startsWith('观察') || trimmedLine.startsWith('观察：') || trimmedLine.startsWith('观察:')) {
        const obsContent = trimmedLine.replace(/^观察[：:]\s*/, '');
        if (obsContent) {
          console.log(`[👁️ 观察] ${obsContent}`);
          pushStep('observation', cleanContent(obsContent));
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    }

    // 如果有最终回答，结束
    if (hasFinalAnswer) {
      // 对最终回答内容再做一次全局扫描，提取可能嵌入的步骤
      const embeddedSteps = extractAllSteps(finalAnswerContent);
      for (const step of embeddedSteps) {
        console.log(`[📡 嵌入步骤发送] type=${step.type}, content="${step.content.slice(0, 30)}..."`);
        pushStep(step.type, step.content);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      done();
      console.log(`[✅ 回答完成]`);
      return;
    }

    // 如果没有工具调用但有内容，直接作为回答返回（一次性发送，不逐句拆）
    if (!toolCalls || toolCalls.length === 0) {
      console.log(`[❌ 无工具调用] LLM 直接回答`);
      // 先用全局扫描补充遗漏的中间步骤
      const extraSteps = extractAllSteps(content);
      for (const step of extraSteps) {
        console.log(`[📡 全局扫描发送] type=${step.type}, content="${step.content.slice(0, 30)}..."`);
        pushStep(step.type, step.content);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      if (content.trim()) {
        const cleaned = cleanContent(content.trim());
        console.log(`[📤 直接发送回答] 原始=${content.trim().length}字符, clean后=${cleaned.length}字符`);
        pushStep('final_answer', cleaned);
      } else {
        pushStep('final_answer', '抱歉，无法处理这个问题。');
      }
      done();
      return;
    }

    // 执行工具调用
    console.log(`${'='.repeat(60)}`);
    console.log(`[🔧 工具调用] 共 ${toolCalls.length} 个工具`);
    console.log(`${'='.repeat(60)}`);

    for (const tc of toolCalls) {
      const tcAny = tc as any;
      const toolName = tcAny.function?.name || '';
      const toolArgs = tcAny.function?.arguments || '{}';

      console.log(`\n[🎯 调用工具] ${toolName}`);
      console.log(`[📋 参数] ${toolArgs}`);

      pushStep('action', `调用 ${toolName}`);
      await new Promise(resolve => setTimeout(resolve, 50));

      // 解析参数并执行
      const result = await executeTool({ name: toolName, arguments: toolArgs }, userId);
      const observationContent = result.success
        ? result.result
        : `工具执行失败: ${result.error}`;

      // 打印结果摘要
      if (result.success) {
        const resultPreview = result.result.length > 200
          ? result.result.slice(0, 200) + '...'
          : result.result;
        console.log(`[📤 工具返回] ${result.result.length} 字符`);
        console.log(`[📄 返回内容预览]\n${resultPreview}`);
      } else {
        console.log(`[❌ 工具失败] ${result.error}`);
      }

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
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[⚠️ 回答失败] 工具调用次数已达上限 (${MAX_TOOL_CALLS})`);
  console.log(`${'='.repeat(60)}`);
  pushStep('final_answer', '抱歉，思考过程过长，请尝试简化问题或稍后再试。');
  done();
}
