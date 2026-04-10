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
    const { messages, model, thinking, webSearch } = await req.json();
    const selectedModel = model || process.env.DEFAULT_MODEL || 'qwen3-max';
    const enableThinking = thinking === true;
    const enableWebSearch = webSearch === true;

    // 构建 LLM 请求参数
    const llmParams: any = {
      model: selectedModel,
      messages,
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
