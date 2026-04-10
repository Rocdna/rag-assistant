/**
 * RAG 问答 API
 *
 * 功能：
 * 1. 接收用户问题和检索参数
 * 2. 调用混合检索（向量 + BM25 + RRF + HyDE）
 * 3. 拼接 Prompt + 检索结果
 * 4. 调用大模型生成回答（流式返回）
 */

import OpenAI from 'openai';
import { hybridSearchWithHyDE } from '@/lib/search';
import { getAllChunksFromStore, getChunksByDocument } from '@/lib/chunks-store';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

// ============================================================
// API Handler
// ============================================================

export async function POST(req: Request) {
  try {
    const startTime = Date.now();
    const {
      query,
      messages: conversationMessages,
      topK,
      model,
      useRAG,
      documentName,
      queryExpansion, // HyDE
      hybridSearch,   // 混合检索开关
      thinking,       // 深度思考开关
      webSearch,      // 联网搜索开关
      summary,        // 对话历史摘要（记忆压缩）
      memoryContext,  // 用户记忆上下文
    } = await req.json();

    console.log('\n========== [📚 RAG API 入口] ==========');
    console.log(`[入口] query: "${query}"`);
    console.log(`[入口] messages: ${conversationMessages?.length || 0} 条`);
    console.log(`[入口] useRAG: ${useRAG}, documentName: ${documentName || '全部'}`);
    console.log(`[入口] thinking: ${thinking}, webSearch: ${webSearch}, queryExpansion: ${queryExpansion}, hybridSearch: ${hybridSearch}`);
    console.log(`[入口] summary: ${summary ? '有' : '无'}`);
    console.log(`[入口] memoryContext: ${memoryContext ? '有' : '无'}`);
    if (memoryContext) {
      console.log(`[入口] memoryContext 内容:\n${memoryContext}`);
    }

    if (!query) {
      return Response.json({ error: '问题不能为空' }, { status: 400 });
    }

    const selectedModel = model || process.env.DEFAULT_MODEL || 'qwen3-max';
    const topKCount = topK || 5;
    const enableThinking = thinking === true;
    const enableWebSearch = webSearch === true;

    // 构建对话历史字符串（用于理解指代词）
    const historyText = conversationMessages && conversationMessages.length > 0
      ? conversationMessages.map((m: { role: string; content: string }) => {
          const role = m.role === 'user' ? '用户' : '助手';
          return `${role}：${m.content}`;
        }).join('\n')
      : '';

    let context = '';
    let sources: unknown[] = [];
    let hydeTime = 0;
    let correctionTime = 0;
    let wasCorrected = false;

    // 如果启用 RAG，检索相关文档
    if (useRAG !== false) {
      // 构建检索 query：结合历史对话，帮助理解指代词（如"它"、"这个"）
      // 注意：OpenAI embedding API 限制 2048 字符，超长会截断或报错
      const MAX_QUERY_LENGTH = 2000;

      let searchQuery = query;
      if (historyText) {
        const combined = `【对话历史】\n${historyText}\n\n【当前问题】\n${query}`;
        // 如果太长，截断历史记录
        if (combined.length > MAX_QUERY_LENGTH) {
          const excess = combined.length - MAX_QUERY_LENGTH;
          const truncatedHistory = historyText.slice(0, historyText.length - excess);
          searchQuery = `【对话历史】\n${truncatedHistory}...\n\n【当前问题】\n${query}`;
          console.log(`[检索] 历史记录已截断，原长度 ${historyText.length}，查询长度 ${searchQuery.length}`);
        } else {
          searchQuery = combined;
        }
      }

      // 如果启用混合检索，从 chunks-store 获取所有 chunks
      let storeChunks;
      if (hybridSearch === true) {
        if (documentName) {
          storeChunks = await getChunksByDocument(documentName);
        } else {
          storeChunks = await getAllChunksFromStore();
        }
        console.log(`[混合检索] 从 chunks-store 加载了 ${storeChunks.length} 个 chunks`);
      }

      // 执行混合检索 + HyDE 修正
      const { results, stats } = await hybridSearchWithHyDE(
        searchQuery,
        {
          topK: topKCount,
          documentName,
          useHyDE: queryExpansion === true,
          useHybrid: hybridSearch === true,
          model: selectedModel,
        },
        storeChunks
      );

      hydeTime = stats.hydeTime + stats.correctionTime;
      correctionTime = stats.correctionTime;
      wasCorrected = stats.wasCorrected;

      if (results.length > 0) {
        context = results
          .map((r, idx) => {
            const meta = r.metadata as { documentName?: string };
            return `[${idx + 1}号文档 - ${meta?.documentName || '未知文档'}]\n${r.content}`;
          })
          .join('\n\n');

        sources = results.map((r, idx) => ({
          content: r.content.slice(0, 100) + '...',
          score: r.score,
          rrfScore: (r as unknown as { rrfScore?: number }).rrfScore,
          source: r.source,
          metadata: r.metadata,
        }));
      }
    }

    // 构建消息
    let systemPrompt = `【角色】你是一个专业的本地知识库问答助手

【任务】根据提供的上下文信息，准确回答用户问题

【规则 - 必须遵守】
1. 【引用强制】只要上下文包含相关信息，必须使用 [编号] 标注来源，如：根据[1号文档]、特斯拉在[2号文档]中提到
2. 【诚实回答】上下文没有的信息，直接说"抱歉，知识库中没有相关信息"，绝不编造
3. 【简洁作答】回答控制在200字以内，分1-3个要点，不要长篇大论
4. 【指代理解】结合对话历史，理解"它"、"这个"等指代词指代的具体内容
5. 【冲突处理】多个文档信息冲突时，以得分最高（[1号文档]）为准，提及差异

【上下文信息格式】
[1号文档] 内容摘要
[2号文档] 内容摘要
（编号越小代表与问题的相关度越高）

【输出格式】
直接回答，不需要额外格式。但如果引用了文档，必须在句子里用 [编号] 标注

【禁止】
- 不要使用 --- 或 --- 分隔线
- 不要使用大篇幅列表（超过5项）
- 不要使用表格语法`;

    // 如果有对话摘要或记忆上下文，追加到 system prompt
    if (summary) {
      systemPrompt += `\n\n【对话历史摘要】\n${summary}`;
    }

    // 如果有用户记忆上下文，追加到 system prompt
    if (memoryContext) {
      systemPrompt += `\n\n${memoryContext}`;
    }

    // 构建用户消息：上下文 + 历史 + 当前问题
    let userMessageContent = '';

    if (context) {
      userMessageContent += `【上下文信息】\n${context}\n\n`;
    } else {
      userMessageContent += `【上下文信息】\n（暂无相关文档，请直接回答）\n\n`;
    }

    if (historyText) {
      userMessageContent += `【对话历史】\n${historyText}\n\n`;
    }

    userMessageContent += `【当前问题】\n${query}`;

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessageContent },
    ];

    // 调用大模型
    const llmStart = Date.now();

    // 构建 LLM 请求参数
    const llmParams: Record<string, unknown> = {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream = await openai.chat.completions.create(llmParams as any) as unknown as AsyncIterable<{
      usage?: { total_tokens: number; prompt_tokens: number; completion_tokens: number };
      choices?: Array<{ delta?: { content?: string } }>;
    }>;

    const encoder = new TextEncoder();
    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;

    const sseStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          // 检查 usage（最后一个 chunk 包含完整统计）
          if (chunk.usage) {
            totalTokens = chunk.usage.total_tokens;
            promptTokens = chunk.usage.prompt_tokens;
            completionTokens = chunk.usage.completion_tokens;
          }
          controller.enqueue(encoder.encode('data: ' + JSON.stringify(chunk) + '\n\n'));
        }

        // 打印日志
        const llmTime = Date.now() - llmStart;
        const totalTime = Date.now() - startTime;

        console.log('========== RAG 性能日志 ==========');
        console.log(`[检索] 返回 ${sources.length} 个结果`);
        if (queryExpansion) {
          console.log(`[HyDE] 总耗时: ${hydeTime}ms (生成: ${hydeTime - correctionTime}ms, 修正: ${correctionTime}ms)`);
          console.log(`[HyDE] ${wasCorrected ? '假设答案已修正' : '假设答案验证通过'}`);
        }
        if (hybridSearch) {
          console.log(`[混合检索] 启用`);
        }
        if (enableThinking) {
          console.log(`[深度思考] 启用`);
        }
        if (enableWebSearch) {
          console.log(`[联网搜索] 启用`);
        }
        console.log(`[LLM] 耗时: ${llmTime}ms`);
        console.log(`[Token] prompt: ${promptTokens}, completion: ${completionTokens}, 总计: ${totalTokens}`);
        console.log(`[总耗时] ${totalTime}ms`);
        console.log('===================================');

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(sseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
      },
    });
  } catch (error: unknown) {
    console.error('RAG API 错误:', error);
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
