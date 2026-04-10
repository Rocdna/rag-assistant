/**
 * 记忆抽取 API
 *
 * 功能：
 * - 调用 LLM 从对话历史中智能抽取重要信息
 * - 提取用户偏好、关键事实、讨论主题等
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

const EXTRACTION_PROMPT = `你是一个用户记忆抽取专家。请从对话历史中提取用户的重要信息。

【任务】
分析对话历史，提取以下类型的信息：

1. **用户身份**：
   - 姓名、昵称
   - 所在地（城市、省份）
   - 公司/组织
   - 职业/职位
   - 教育背景

2. **用户偏好**：
   - 技术偏好（喜欢用什么技术/框架）
   - 使用习惯（常用工具、平台）
   - 兴趣爱好
   - 沟通风格

3. **关键事实**：
   - 正在做的项目
   - 遇到的问题
   - 目标/计划
   - 已有的结论/决定

4. **讨论上下文**：
   - 当前在讨论什么主题
   - 涉及哪些实体（产品、概念、术语）

【输出格式】
请以 JSON 格式返回，结构如下：
{
  "memories": [
    {
      "type": "preference" | "fact" | "context",
      "key": "信息类型（如：姓名、所在地、技术偏好）",
      "value": "具体值（如：张三、上海、React）",
      "confidence": 0.0-1.0,
      "reasoning": "为什么提取这个信息的简要说明"
    }
  ],
  "summary": "一段话总结用户的主要特征和当前讨论主题"
}

【重要】
- 只提取在对话中明确提到的信息，不要推测
- confidence 表示置信度，低于 0.5 的信息不要返回
- 如果没有提取到任何信息，返回空的 memories 数组

对话历史：
{conversation_history}`;

/**
 * 从对话历史中提取记忆
 */
async function extractMemories(conversationHistory: string, model: string) {
  const response = await openai.chat.completions.create({
    model: model || process.env.DEFAULT_MODEL || 'qwen3-max',
    messages: [
      {
        role: 'system',
        content: EXTRACTION_PROMPT.replace('{conversation_history}', conversationHistory),
      },
      {
        role: 'user',
        content: '请提取对话中的用户信息',
      },
    ],
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content || '';

  // 尝试解析 JSON
  try {
    // 尝试提取 JSON 部分
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    }
  } catch (e) {
    console.error('解析记忆提取结果失败:', e);
  }

  // 解析失败，返回空结果
  return { memories: [], summary: '' };
}

export async function POST(req: Request) {
  try {
    const { messages, model } = await req.json();

    console.log('\n========== [🧠 Memory Extract API 入口] ==========');
    console.log(`[入口] messages: ${messages?.length || 0} 条`);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ memories: [], summary: '' });
    }

    // 构建对话历史文本
    const conversationText = messages
      .filter((m: { role: string }) => m.role === 'user' || m.role === 'assistant')
      .map((m: { role: string; content: string }) => {
        const role = m.role === 'user' ? '用户' : '助手';
        return `${role}：${m.content}`;
      })
      .join('\n\n');

    // 使用专用的记忆抽取模型（更快更便宜），不占用主模型配额
    const selectedModel = process.env.MEMORY_EXTRACT_MODEL || model || 'qwen-turbo';
    const result = await extractMemories(conversationText, selectedModel);

    console.log(`[✅ 提取完成] 记忆条数: ${result.memories?.length || 0}`);
    console.log(`[📝 记忆详情]`, JSON.stringify(result.memories, null, 2));
    console.log(`[📝 摘要] ${result.summary?.slice(0, 100) || '无'}...`);

    return Response.json(result);
  } catch (error: any) {
    console.error('记忆抽取错误:', error);

    if (error.name === 'AbortError') {
      return Response.json({ memories: [], summary: '' }, { status: 200 });
    }

    return Response.json(
      { error: error.message || String(error), memories: [], summary: '' },
      { status: 500 }
    );
  }
}
