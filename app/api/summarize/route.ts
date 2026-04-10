/**
 * 摘要生成 API
 *
 * 功能：
 * - 对话历史压缩摘要
 * - 减少 Token 消耗
 */

import OpenAI from 'openai';
import type { ChatMessage } from '@/types/chat';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

const SUMMARY_PROMPT = `你是一个对话历史压缩专家。请将以下对话历史压缩为摘要。

要求：
1. 保留关键信息点（用户身份、偏好、重要事实）
2. 保留讨论的主题和核心问题类型
3. 保留关键的结论或答案
4. 删除重复的表达和无关的寒暄

输出格式：
【摘要】
- 用户信息：[姓名、所在地等，如无则写"未知"]
- 讨论主题：[一句话描述]
- 关键事实：[列出重要的信息点]
- 已解决的问题：[如果有问题被解决的话]

【最近对话】
[保留最近3轮完整对话，用于保持上下文连贯]

对话历史：
{conversation_history}`;

/**
 * 生成对话摘要
 */
async function generateSummary(
  messages: ChatMessage[],
  model: string
): Promise<{ summary: string; recentMessages: ChatMessage[] }> {
  // 提取对话内容（不含 assistant 的思考过程）
  const conversationText = messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'user' ? '用户' : '助手'}：${m.content}`)
    .join('\n\n');

  const response = await openai.chat.completions.create({
    model: model || process.env.DEFAULT_MODEL || 'qwen3-max',
    messages: [
      {
        role: 'system',
        content: SUMMARY_PROMPT.replace('{conversation_history}', conversationText),
      },
      {
        role: 'user',
        content: '请压缩以上对话历史',
      },
    ],
    temperature: 0.3,
  });

  const summary = response.choices[0]?.message?.content || '摘要生成失败';

  // 保留最近 3 轮对话
  const userAssistantPairs: ChatMessage[] = [];
  const recentMsgs = messages.slice(-6); // 最近 6 条消息（约 3 轮）

  for (const msg of recentMsgs) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      userAssistantPairs.push(msg);
    }
  }

  return {
    summary,
    recentMessages: userAssistantPairs.slice(-6), // 保留最近 6 条
  };
}

export async function POST(req: Request) {
  try {
    const { messages, model } = await req.json();

    console.log('\n========== [📝 Summarize API 入口] ==========');
    console.log(`[入口] messages: ${messages?.length || 0} 条`);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: '消息列表不能为空' }, { status: 400 });
    }

    const selectedModel = model || process.env.DEFAULT_MODEL || 'qwen3-max';
    const result = await generateSummary(messages, selectedModel);

    console.log(`[✅ 摘要生成完成] summary 长度: ${result.summary.length}`);
    console.log(`[✅ 摘要生成完成] recentMessages: ${result.recentMessages.length} 条`);
    console.log(`[📄 摘要内容预览]\n${result.summary.slice(0, 200)}...`);

    return Response.json(result);
  } catch (error: any) {
    console.error('摘要生成错误:', error);

    if (error.name === 'AbortError') {
      return Response.json({ error: '请求已取消' }, { status: 200 });
    }

    return Response.json(
      { error: error.message || String(error) },
      { status: 500 }
    );
  }
}
