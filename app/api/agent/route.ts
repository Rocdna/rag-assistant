/**
 * Agent API - 基于 OpenAI Function Calling 的智能 Agent
 *
 * 支持两种模式：
 * - 普通模式（react=false）：直接返回结果
 * - ReAct 模式（react=true）：展示思考过程（💭思考 → 🎯行动 → 👁️观察 → ✨回答）
 */

import OpenAI from 'openai';
import { TOOL_DEFINITIONS, TOOL_EXECUTORS } from '@/lib/tools/definitions';
import type { ToolResult } from '@/types/chat';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

// ============================================================
// 常量配置
// ============================================================

const MAX_TOOL_CALLS = 10;

const SYSTEM_PROMPT = `你是智能助手，擅长理解用户问题并调用合适的工具来回答。

【你的能力】
- 访问本地文档知识库（搜索、列表、统计）
- 查询天气（天气预报、空气质量、预警、指数、分钟降水）
- 地图服务（地理编码、逆地理编码、路线规划、POI搜索）
- 联网搜索（搜索最新新闻、实时信息）
- 获取用户当前位置（当用户授权后）

【工作方式】
1. 理解用户问题
2. 选择合适的工具调用
3. 基于工具返回的结果回答用户问题

【用户位置说明】
当用户提问涉及"附近"、"周边"、"从这里"、"离我"等时，可以使用用户授权的位置信息。
用户位置格式为"经度,纬度"（如"116.397463,39.909187"代表北京天安门附近）。
如果用户没有授权定位但提问需要位置，可以建议用户开启定位或手动输入位置。

【重要规则】
- 如果用户询问天气相关问题，必须调用天气工具（get_weather 或其他天气工具）
- 如果用户询问文档相关问题，调用文档工具
- 如果用户询问位置、坐标、地址相关问题（如"某地在哪里"、"某地坐标是什么"），调用地图工具
- 如果用户询问"附近有什么"、"周边"等问题，先用用户位置调用 poi_around 或 poi_text
- 如果用户没有提供位置信息（如城市名），而问题需要位置（如天气查询），先询问用户位置
- 如果知识库为空且用户询问文档内容，告知用户先上传文档
- 如果用户询问当前日期、时间、实时信息（如"今年是哪一年"、"今天几号"、"现在几点"），必须调用 web_search 工具搜索，禁止直接用内部知识回答
- 回答要简洁，自然，像对话一样

【工具结果信任规则】（重要，必须遵守）
- 工具返回的结果是实时的、权威的。如果工具返回的答案与你的训练数据冲突，**始终以工具返回的结果为准**，不要质疑、不要复搜
- 禁止对同一问题进行两次以上的搜索。如果第一次搜索结果与你的知识冲突，你应该说"根据搜索结果是X"，而不是再次搜索验证
- 模型必须引用搜索结果的原文或摘要，不能无视工具返回自行发挥

【输出格式】
直接回答用户问题，不需要额外的计划格式。

【坐标输出要求】（重要）
当返回坐标信息时，必须在回答中包含"坐标："格式，例如：
- "北京天安门位于坐标：116.397463,39.909187"
- "杭州西湖的坐标是120.148231,30.147412"
这样前端才能正确解析并显示地图。

【POI搜索输出要求】
当返回POI搜索结果时，需要包含"坐标："格式便于前端展示地图标记。例如：
- "附近有3家酒店：1. 如家酒店，坐标：116.397463,39.909187，距离500米..."
`;

const REACT_SYSTEM_PROMPT = `${SYSTEM_PROMPT}

【ReAct 输出格式】（必须严格遵守）
每轮输出必须包含"思考："、"行动："、"观察："之一，直到输出"最终回答："才算结束。

1. 如果需要调用工具，**必须使用 tool_calls 发起真正的工具调用**（文本中的"行动"只是思考过程的展示）：
思考：<推理过程>
行动：<工具名称> <参数>  ← 仅用于展示，实际通过 tool_calls 调用
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
- 工具调用必须通过 tool_calls 发起，文本中的"行动"仅供展示

【示例：需要工具调用】
用户：上海今天天气怎么样？
思考：用户想知道上海的天气，我需要调用天气工具
行动：get_weather {"location": "上海"}  ← 通过 tool_calls 发起，实际执行
观察：上海今天晴朗，28度
思考：已获取天气信息，可以回答了
最终回答：上海今天天气晴朗，气温28度...

【示例：地图查询】
用户：杭州西湖的坐标是什么？
思考：用户想知道杭州西湖的经纬度坐标，需要调用地理编码工具
行动：geocode_address {"address": "杭州西湖", "city": "杭州"}
观察：坐标：120.148231, 30.147412
思考：已获取坐标信息，可以回答了
最终回答：杭州西湖的坐标是经度 120.148231，纬度 30.147412...`;

// ============================================================
// 工具执行
// ============================================================

async function executeTool(toolCall: { name: string; arguments: string }, userId: string): Promise<ToolResult> {
  console.log(`[🔧 执行工具] ${toolCall.name}, 原始arguments: ${toolCall.arguments}`);
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
 * 从文本中解析工具调用
 * 用栈匹配配对的大括号，确保 JSON 完整性
 */
function parseToolCallsFromText(content: string): Array<{ name: string; arguments: string }> {
  const toolCalls: Array<{ name: string; arguments: string }> = [];

  for (const toolName of TOOL_DEFINITIONS.map(t => t.function.name)) {
    // 用正则捕获: "工具名 {" 后面一直到行尾的所有内容（包括换行前的 JSON）
    const escaped = toolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // 匹配 "行动：tool_name {" 或 "行动：tool_name {" 后的内容，直到该行结束
    const regex = new RegExp(`行动[：:]\\s*${escaped}\\s*\\{([^}]*)\\}`, 'g');

    let match;
    while ((match = regex.exec(content)) !== null) {
      const argsStr = match[1]; // 捕获组 1 是 { 和 } 之间的内容
      if (!argsStr || !argsStr.trim()) continue;
      try {
        // 用捕获的内容构造完整 JSON
        const jsonStr = '{' + argsStr + '}';
        JSON.parse(jsonStr); // 验证能解析
        const normalizedArgs = JSON.stringify(JSON.parse(jsonStr));
        toolCalls.push({ name: toolName, arguments: normalizedArgs });
      } catch {
        // 捕获的内容不是合法 JSON，尝试更宽松的提取
        try {
          const jsonStr = '{' + argsStr + '}';
          const parsed = JSON.parse(jsonStr);
          const normalizedArgs = JSON.stringify(parsed);
          toolCalls.push({ name: toolName, arguments: normalizedArgs });
        } catch {
          // 忽略解析失败的
        }
      }
    }

    // 尝试匹配括号格式：tool_name({"query": "..."})
    const parenRegex = new RegExp(`行动[：:]\\s*${escaped}\\s*\\(\\s*(\\{[^}]*\\})\\s*\\)`, 'g');
    while ((match = parenRegex.exec(content)) !== null) {
      try {
        const normalizedArgs = match[1];
        JSON.parse(normalizedArgs); // 验证
        toolCalls.push({ name: toolName, arguments: normalizedArgs });
      } catch {
        // 忽略
      }
    }
  }
  return toolCalls;
}

/**
 * 清理文本内容：去掉格式前缀和多余空白，提取纯回答
 */
function cleanContent(text: string): string {
  let result = text;

  // 如果包含"最终回答："，只取其后面的内容
  const finalAnswerIdx = result.indexOf('最终回答：');
  const finalAnswerIdx2 = result.indexOf('最终答案：');
  const finalIdx = finalAnswerIdx >= 0 && (finalAnswerIdx2 < 0 || finalAnswerIdx < finalAnswerIdx2)
    ? finalAnswerIdx : finalAnswerIdx2;
  if (finalIdx >= 0) {
    result = result.slice(finalIdx + 5).replace(/^[：:\s]+/, '');
  }

  // 去掉开头的"思考：..."、"观察：..."、"行动：..." 行
  result = result
    .replace(/^[思考观察行动][：:\s][^\n]*\n?/gm, '')
    .replace(/^[✨💭🎯👁️🔍📌]+/g, '')
    .replace(/^[：:\s]+/g, '')
    .trim();

  return result;
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

// ============================================================
// API Handler
// ============================================================

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const { query, messages, model, react = false, summary, memoryContext, userLocation } = await req.json();

    if (!userId) {
      return Response.json({ error: '缺少用户身份' }, { status: 401 });
    }

    console.log('\n========== [🤖 Agent API 入口] ==========');
    console.log(`[入口] query: "${query}"`);
    console.log(`[入口] messages: ${messages?.length || 0} 条`);
    console.log(`[入口] react 模式: ${react}`);
    console.log(`[入口] summary: ${summary ? '有 (' + summary.slice(0, 50) + '...)' : '无'}`);
    console.log(`[入口] memoryContext: ${memoryContext ? '有 (' + memoryContext.slice(0, 50) + '...)' : '无'}`);
    console.log(`[入口] userLocation: ${userLocation || '无'}`);

    if (!query) {
      return Response.json({ error: '问题不能为空' }, { status: 400 });
    }

    const selectedModel = model || process.env.DEFAULT_MODEL || 'qwen3.6-flash';

    // 构建用户记忆上下文
    const memorySection = memoryContext
      ? `\n\n【用户记忆上下文】\n${memoryContext}`
      : '';

    // 构建用户位置上下文
    const locationSection = userLocation
      ? `\n\n【用户当前位置】\n经纬度坐标：${userLocation}\n（可用于回答"附近有什么"、"从这里到某地"等问题）`
      : '';

    // 根据是否启用 ReAct 模式选择系统提示
    const systemPrompt = (react ? REACT_SYSTEM_PROMPT : SYSTEM_PROMPT) + memorySection + locationSection;

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
 * 普通模式：带工具调用的流式返回
 */
async function handleNormalMode(
  conversationMessages: OpenAI.Chat.ChatCompletionMessageParam[],
  model: string,
  signal: AbortSignal | undefined,
  userId: string
): Promise<Response> {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController;
  let isDone = false;

  const pushToken = (content: string) => {
    if (!isDone && controller) {
      controller.enqueue(encoder.encode('data: ' + JSON.stringify({
        choices: [{ delta: { content } }]
      }) + '\n\n'));
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

  // 启动处理循环
  runNormalModeLoop(conversationMessages, model, signal, userId, pushToken, done).catch((error) => {
    if (error instanceof Error && error.name !== 'AbortError') {
      console.error('Normal Mode 错误:', error);
    }
    done();
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

async function runNormalModeLoop(
  conversationMessages: OpenAI.Chat.ChatCompletionMessageParam[],
  model: string,
  signal: AbortSignal | undefined,
  userId: string,
  pushToken: (content: string) => void,
  done: () => void
) {
  let toolCallCount = 0;

  while (toolCallCount < MAX_TOOL_CALLS) {
    if (signal?.aborted) {
      pushToken('【已停止生成】');
      done();
      return;
    }

    toolCallCount++;

    // 非流式调用 LLM（决策）
    const llmStart = Date.now();
    const { content, toolCalls } = await callLLMWithTools(conversationMessages, model);
    console.log(`[⏱️ LLM 调用] 第 ${toolCallCount} 次，耗时: ${Date.now() - llmStart}ms`);

    // 无工具调用：直接流式返回 LLM 回答
    if (!toolCalls || toolCalls.length === 0) {
      if (content) {
        // 流式返回 LLM 内容
        const stream = await openai.chat.completions.create({
          model,
          messages: conversationMessages,
          stream: true,
          max_tokens: 4096,
        });

        for await (const chunk of stream) {
          if (signal?.aborted) break;
          const token = chunk.choices[0]?.delta?.content;
          if (token) pushToken(token);
        }
      } else {
        pushToken('抱歉，我没有理解您的问题，请重试。');
      }
      done();
      return;
    }

    // 有工具调用：添加工具调用消息
    conversationMessages.push({
      role: 'assistant',
      content: content || '',
      tool_calls: toolCalls,
    });

    // 并行执行工具
    const executedTools = await Promise.all(
      toolCalls.map(async (tc: any) => {
        const toolName = tc.function?.name || '';
        const toolArgs = tc.function?.arguments || '{}';
        console.log(`[🔧 工具调用] ${toolName} 参数: ${toolArgs}`);

        const toolStart = Date.now();
        const result = await executeTool({ name: toolName, arguments: toolArgs }, userId);
        console.log(`[⏱️ 工具 ${toolName}] 耗时: ${Date.now() - toolStart}ms, 结果: ${result.success ? '成功' : '失败'}`);
        console.log(`[📤 工具返回内容] ${result.result}`);

        return {
          role: 'tool' as const,
          tool_call_id: tc.id,
          content: result.success ? result.result : `【工具执行错误】${result.error}`,
        };
      })
    );

    conversationMessages.push(...executedTools);
  }

  pushToken('工具调用次数过多，请重试。');
  done();
}

/**
 * ReAct 模式：真正的流式输出思考过程
 */
async function handleReactMode(
  conversationMessages: OpenAI.Chat.ChatCompletionMessageParam[],
  model: string,
  signal: AbortSignal | undefined,
  userId: string
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
  userId: string
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
    const llmStart = Date.now();
    const { content, toolCalls } = await callLLMWithTools(conversationMessages, model, signal);
    console.log(`[⏱️ LLM 调用] 第 ${toolCallCount} 次，耗时: ${Date.now() - llmStart}ms`);

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

    // 解析 LLM 输出，按行处理 ReAct 格式（只展示，不触发 return）
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
      } else if (trimmedLine.startsWith('思考') || trimmedLine.startsWith('思考：') || trimmedLine.startsWith('思考:')) {
        const thought = trimmedLine.replace(/^思考[：:]\s*/, '');
        if (thought) {
          console.log(`[💭 思考] ${thought}`);
          pushStep('thought', cleanContent(thought));
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } else if (trimmedLine.startsWith('行动') || trimmedLine.startsWith('行动：') || trimmedLine.startsWith('行动:')) {
        const action = trimmedLine.replace(/^行动[：:]\s*/, '');
        if (action) {
          console.log(`[🎯 行动] ${action}`);
          pushStep('action', cleanContent(action));
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } else if (trimmedLine.startsWith('观察') || trimmedLine.startsWith('观察：') || trimmedLine.startsWith('观察:')) {
        const obs = trimmedLine.replace(/^观察[：:]\s*/, '');
        if (obs) {
          console.log(`[👁️ 观察] ${obs}`);
          pushStep('observation', cleanContent(obs));
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    }

    // 解析工具调用（不管有没有最终回答都要先解析）
    let parsedToolCalls: Array<{ name: string; arguments: string }> = [];
    if (!toolCalls || toolCalls.length === 0) {
      parsedToolCalls = parseToolCallsFromText(content);
    }

    const callsToExecute = (toolCalls && toolCalls.length > 0)
      ? toolCalls
      : (parsedToolCalls.length > 0 ? parsedToolCalls.map((tc, i) => ({
          id: `parsed_${i}`,
          type: 'function' as const,
          function: { name: tc.name, arguments: tc.arguments }
        })) : []);

    // 如果有工具要执行，先执行完再说
    if (callsToExecute.length > 0) {
      console.log(`${'='.repeat(60)}`);
      console.log(`[🔧 工具调用] 共 ${callsToExecute.length} 个工具`);
      console.log(`${'='.repeat(60)}`);

      for (const tc of callsToExecute) {
        const tcAny = tc as any;
        const toolName = tcAny.function?.name || '';
        const toolArgs = tcAny.function?.arguments || '{}';

        console.log(`\n[🎯 调用工具] ${toolName}`);
        console.log(`[📋 参数] ${toolArgs}`);

        // 发送"调用中"的 action 步骤（覆盖 LLM 伪造的）
        pushStep('action', `调用 ${toolName}`);
        await new Promise(resolve => setTimeout(resolve, 50));

        const toolStart = Date.now();
        const result = await executeTool({ name: toolName, arguments: toolArgs }, userId);
        console.log(`[⏱️ 工具 ${toolName}] 耗时: ${Date.now() - toolStart}ms`);

        const observationContent = result.success
          ? result.result
          : `工具执行失败: ${result.error}`;

        if (result.success) {
          const preview = result.result.length > 200 ? result.result.slice(0, 200) + '...' : result.result;
          console.log(`[📤 工具返回] ${result.result.length} 字符`);
          console.log(`[📄 返回内容预览]\n${preview}`);
        } else {
          console.log(`[❌ 工具失败] ${result.error}`);
        }

        pushStep('observation', observationContent);
        await new Promise(resolve => setTimeout(resolve, 50));

        // 加入对话历史，供下一轮 LLM 使用
        conversationMessages.push({ role: 'assistant', content: content || '', tool_calls: [tc] });
        conversationMessages.push({ role: 'tool', tool_call_id: tc.id, content: observationContent });
      }

      // 工具执行完毕后，如果 LLM 已经给了最终回答（但那是基于伪造观察的），
      // 需要再调一次 LLM 生成真正的最终回答
      if (hasFinalAnswer) {
        console.log(`[🔄 工具执行完毕，重新生成最终回答]`);
        const finalLlmStart = Date.now();
        const { content: finalContent } = await callLLMWithTools(conversationMessages, model, signal);
        console.log(`[⏱️ 最终回答 LLM] 耗时: ${Date.now() - finalLlmStart}ms`);

        // 展示最终回答
        console.log(`[📤 最终回答发送] ${finalContent.length} 字符`);
        pushStep('final_answer', cleanContent(finalContent));
        done();
        console.log(`[✅ 回答完成]`);
        return;
      }

      // 没有最终回答但有工具 → 继续循环
      continue;
    }

    // 没有工具调用：直接回答（可能 LLM 说"不需要工具"）
    if (!hasFinalAnswer) {
      console.log(`[❌ 无工具调用] LLM 直接回答`);
      const extraSteps = extractAllSteps(content);
      for (const step of extraSteps) {
        console.log(`[📡 全局扫描发送] type=${step.type}, content="${step.content.slice(0, 30)}..."`);
        pushStep(step.type, step.content);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      if (content.trim()) {
        const cleaned = cleanContent(content.trim());
        console.log(`[📤 直接发送回答] ${cleaned.length} 字符`);
        pushStep('final_answer', cleaned);
      } else {
        pushStep('final_answer', '抱歉，无法处理这个问题。');
      }
      done();
      return;
    }

    // hasFinalAnswer=true 但没有工具 → 直接发送最终回答
    if (finalAnswerContent) {
      console.log(`[📤 最终回答发送] ${finalAnswerContent.length} 字符`);
      pushStep('final_answer', cleanContent(finalAnswerContent));
    }
    done();
    console.log(`[✅ 回答完成]`);
    return;
  }

  // 达到最大步骤数
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[⚠️ 回答失败] 工具调用次数已达上限 (${MAX_TOOL_CALLS})`);
  console.log(`${'='.repeat(60)}`);
  pushStep('final_answer', '抱歉，思考过程过长，请尝试简化问题或稍后再试。');
  done();
}
