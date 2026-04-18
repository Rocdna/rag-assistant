/**
 * 聊天 API 路由
 *
 * 功能：接收前端消息，调用大模型，返回流式响应
 * 支持：深度思考 (Thinking)、联网搜索 (Web Search)
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

export async function POST(req: Request) {
  try {
    const startTime = Date.now();
    const { messages, model, thinking, webSearch, summary, memoryContext } = await req.json();

    console.log('\n========== [💬 Chat API 入口] ==========');
    console.log(`[入口] messages: ${messages?.length || 0} 条`);
    console.log(`[入口] model: ${model}`);
    console.log(`[入口] thinking: ${thinking}, webSearch: ${webSearch}`);
    console.log(`[入口] summary: ${summary ? '有 (' + summary.slice(0, 50) + '...)' : '无'}`);
    console.log(`[入口] memoryContext: ${memoryContext ? '有 (' + memoryContext.slice(0, 50) + '...)' : '无'}`);

    const selectedModel = model || process.env.DEFAULT_MODEL || 'qwen3-max';
    const enableThinking = thinking === true;
    const enableWebSearch = webSearch === true;

    // 如果有对话摘要或记忆上下文，注入到 system prompt
    let processedMessages = messages;
    const hasSummary = !!summary;
    const hasMemory = !!memoryContext;

    if (hasSummary || hasMemory) {
      const parts: string[] = [];

      if (hasMemory) {
        console.log('[📦 注入记忆上下文]');
        console.log('[📦 记忆内容]:\n' + memoryContext);
        parts.push(memoryContext);
      }

      if (hasSummary) {
        console.log('[📦 注入摘要上下文]');
        parts.push(`【对话历史摘要】
${summary}

请结合以上摘要和当前对话历史来回答用户问题。`);
      }

      const systemAddition = parts.join('\n\n');

      // 找到 system prompt 的位置，插入
      processedMessages = messages.map((msg: any, index: number) => {
        if (index === 0 && msg.role === 'system') {
          return {
            ...msg,
            content: msg.content + '\n\n' + systemAddition,
          };
        }
        return msg;
      });

      // 如果没有 system prompt，在开头插入
      if (!messages[0] || messages[0].role !== 'system') {
        processedMessages = [
          { role: 'system', content: systemAddition },
          ...messages,
        ];
      }
    }

    // 构建 LLM 请求参数
    const llmParams: any = {
      model: selectedModel,
      messages: processedMessages,
      stream: true,
      stream_options: { include_usage: true },
    };

    // 如果是通义千问模型，添加思考和搜索参数
    if (selectedModel.startsWith('qwen')) {
      // 深度思考
      if (enableThinking) {
        llmParams.enable_thinking = true;
      }

      // 联网搜索
      if (enableWebSearch) {
        llmParams.enable_search = true;
      }
    }

    const stream = await openai.chat.completions.create(llmParams) as any;

    const encoder = new TextEncoder();
    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;

    const sseStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.usage) {
            totalTokens = chunk.usage.total_tokens;
            promptTokens = chunk.usage.prompt_tokens;
            completionTokens = chunk.usage.completion_tokens;
          }
          controller.enqueue(encoder.encode('data: ' + JSON.stringify(chunk) + '\n\n'));
        }

        const totalTime = Date.now() - startTime;

        console.log('========== Chat 性能日志 ==========');
        if (enableThinking) {
          console.log(`[深度思考] 启用`);
        }
        if (enableWebSearch) {
          console.log(`[联网搜索] 启用`);
        }
        console.log(`[LLM] 耗时: ${totalTime}ms`);
        console.log(`[Token] prompt: ${promptTokens}, completion: ${completionTokens}, 总计: ${totalTokens}`);
        console.log('====================================');

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(sseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
      },
    });
  } catch (error: any) {
    return Response.json({ error: error.message });
  }
}
