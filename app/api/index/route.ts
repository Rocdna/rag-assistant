/**
 * 文档索引 API
 *
 * 功能：
 * 1. 将文档分块、向量化，存入 Pinecone 向量数据库
 * 2. 分批处理 + 进度反馈（SSE）
 */

import { addDocumentChunks } from '@/lib/pinecone';
import { chunkText } from '@/lib/chunker';

export const maxDuration = 300; // 5分钟超时

interface IndexParams {
  documentId: string;
  documentName?: string;
  content: string;
  chunkSize?: number;
  chunkOverlap?: number;
}

// SSE 阶段常量
const SSE_STAGES = {
  CHUNKING: 'chunking',
  INDEXING: 'indexing',
  COMPLETE: 'complete',
  ERROR: 'error',
} as const;

/**
 * POST - 创建索引（SSE 流式进度）
 */
export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const params: IndexParams = await req.json();

    if (!params.documentId || !params.content) {
      return Response.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const acceptHeader = req.headers.get('accept');
    const wantsStream = acceptHeader?.includes('text/event-stream');

    if (wantsStream) {
      return handleStreamingIndex(params, userId || undefined);
    }

    return handleNormalIndex(params, userId || undefined);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * 普通索引模式
 */
async function handleNormalIndex(params: IndexParams, userId?: string): Promise<Response> {
  const { documentId, documentName, content, chunkSize, chunkOverlap } = params;
  const docName = documentName || '未知文档';
  const now = Date.now();

  const chunks = chunkText(content, {
    chunkSize: chunkSize || 500,
    chunkOverlap: chunkOverlap || 50,
  });

  // Pinecone upsert 按 vector ID 覆盖，自动处理增量更新
  const chunkCount = await addDocumentChunks(chunks, documentId, docName, 0, undefined, now, userId);

  return Response.json({
    success: true,
    documentId,
    chunkCount,
    totalChunks: chunks.length,
  });
}

/**
 * 流式索引模式 - 支持进度反馈
 */
async function handleStreamingIndex(params: IndexParams, userId?: string): Promise<Response> {
  const { documentId, documentName, content, chunkSize, chunkOverlap } = params;
  const docName = documentName || '未知文档';
  const now = Date.now();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (
        stage: typeof SSE_STAGES[keyof typeof SSE_STAGES],
        progress: number,
        message: string,
        extra?: Record<string, unknown>
      ) => {
        const data = JSON.stringify({ stage, progress, message, ...extra });
        console.log(`[SSE] 发送进度: stage=${stage}, progress=${progress}, message=${message}`);
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        // 阶段1: 文本分块
        sendProgress(SSE_STAGES.CHUNKING, 0, '开始分块...');

        const chunks = chunkText(content, {
          chunkSize: chunkSize || 500,
          chunkOverlap: chunkOverlap || 50,
        });

        sendProgress(SSE_STAGES.CHUNKING, 100, `分块完成，共 ${chunks.length} 个块`);
        console.log(`[索引] 分块完成: ${chunks.length} 个 chunks`);

        // 阶段2: 向量化和存储（由 addDocumentChunks 内部处理分批）
        sendProgress(SSE_STAGES.INDEXING, 0, '开始索引...');

        await addDocumentChunks(
          chunks,
          documentId,
          docName,
          0,
          (processed, total) => {
            const progressPercent = Math.round((processed / total) * 100);
            sendProgress(SSE_STAGES.INDEXING, progressPercent, `已索引 ${processed}/${total} 个块`);
          },
          now,
          userId
        );

        // 完成
        const finalData = JSON.stringify({
          stage: SSE_STAGES.COMPLETE,
          progress: 100,
          message: '索引完成',
          documentId,
          chunkCount: chunks.length,
          totalChunks: chunks.length,
        });
        controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));

        controller.close();
      } catch (error: unknown) {
        console.error('[索引] 错误:', error);
        const message = error instanceof Error ? error.message : String(error);
        const errorData = JSON.stringify({ stage: SSE_STAGES.ERROR, message });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
