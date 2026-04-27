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
import { hybridSearchWithHyDE, getChunksForHybridSearch } from '@/lib/search';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

// ============================================================
// API Handler
// ============================================================

export async function POST(req: Request) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return Response.json({ error: '缺少用户身份' }, { status: 401 });
  }
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
      hybridSearch,  // 混合检索开关
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
    console.log(`[入口] userId: ${userId || 'anonymous'}`);
    if (memoryContext) {
      console.log(`[入口] memoryContext 内容:\n${memoryContext}`);
    }

    if (!query) {
      return Response.json({ error: '问题不能为空' }, { status: 400 });
    }

    const selectedModel = model || process.env.DEFAULT_MODEL || 'qwen3.6-flash';
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
    let bm25Time = 0;
    let rrfTime = 0;
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

      // 如果启用混合检索，从 Pinecone 获取用户所有 chunk 原文（用于 BM25）
      let storeChunks;
      if (hybridSearch === true) {
        storeChunks = await getChunksForHybridSearch(userId, documentName);
        console.log(`[混合检索] 从 Pinecone 加载了 ${storeChunks.length} 个 chunks`);
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
          userId,
        },
        storeChunks
      );

      hydeTime = stats.hydeTime + stats.correctionTime;
      correctionTime = stats.correctionTime;
      bm25Time = stats.bm25Time;
      rrfTime = stats.rrfTime;
      wasCorrected = stats.wasCorrected;

      if (results.length > 0) {
        // 按 documentName 分组编号，同文档的片段用 -1 -2 标注
        const docCounter = new Map<string, number>();
        const docRefMap = new Map<string, string>();

        context = results
          .map((r) => {
            const meta = r.metadata as { documentName?: string };
            const docName = meta?.documentName || '未知文档';
            const count = (docCounter.get(docName) || 0) + 1;
            docCounter.set(docName, count);
            docRefMap.set(r.id, `${docName}-${count}`);
            return `[${docName}-${count}]\n${r.content}`;
          })
          .join('\n\n');

        sources = results.map((r) => ({
          content: r.content.slice(0, 100) + '...',
          score: r.score,
          source: r.source,
          metadata: r.metadata,
          docRef: docRefMap.get(r.id),
        }));
      }
    }

    // 构建消息
    let systemPrompt = `【角色】你是一个专业的本地知识库问答助手

【任务】根据提供的上下文信息，准确回答用户问题

【规则 - 必须遵守】
1. 【引用强制】只要上下文包含相关信息，必须使用 [文件名-序号] 标注来源，如：根据[技术架构.md-1]、特斯拉在[部署指南.md-2]中提到
2. 【诚实回答】上下文没有的信息，直接说"抱歉，知识库中没有相关信息"，绝不编造
3. 【简洁作答】回答控制在200字以内，分1-3个要点，不要长篇大论
4. 【意图优先】如果用户问题表述模糊、包含"它""这个"等指代词、或意图不明确，先结合上下文推断真实意图，再基于推断后的意图回答
5. 【冲突处理】多个文档信息冲突时，以得分最高的为准，提及差异

【上下文信息格式】
[文档名-序号] 内容摘要
（同文档多片段用 -1 -2 区分，序号仅表示同一文档内的片段顺序，不代表相关度）

【输出格式】
直接回答，不需要额外格式。但如果引用了文档，必须在句子里用 [文件名-序号] 标注

【禁止】
- 不要使用 --- 或 --- 分隔线`;

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
          console.log(`[混合检索] 启用 (BM25: ${bm25Time}ms, RRF: ${rrfTime}ms)`);
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
