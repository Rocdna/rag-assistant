# RAG 本地知识库助手

基于 Next.js + RAG 的本地知识库问答助手，支持多轮对话、混合检索、深度思考和联网搜索。

## 功能

### 基础功能
- [x] 文件上传（PDF、TXT、DOCX、MD）
- [x] 文档解析
- [x] 文本分块（支持重叠）
- [x] 向量化存储（Pinecone）
- [x] RAG 问答
- [x] 流式响应
- [x] 历史对话保存（localStorage）
- [x] 移动端适配

### RAG 优化功能
- [x] **多轮对话** — 支持理解指代词（它、这个）
- [x] **混合检索** — BM25 + 向量检索 + RRF 融合
- [x] **HyDE** — 生成假设答案 + 快速验证修正
- [x] **上下文压缩** — 截断过长对话历史
- [x] **引用标注** — 回答时标注参考来源 [编号]

### LLM 增强功能
- [x] **深度思考** — 支持通义千问思考模式
- [x] **联网搜索** — 支持通义千问实时搜索

### Agent 功能
- [x] **文档分析 Agent** — 基于 ReAct 模式的智能问答 Agent
- [x] **ReAct 流式输出** — 思考/行动/观察/最终回答实时展示
- [x] **跨会话记忆** — LLM 智能抽取 + localStorage 持久化

## 技术栈

| 模块 | 技术 |
|------|------|
| 前端 | Next.js 16 + React + TypeScript |
| 样式 | Tailwind CSS + CSS Variables |
| 向量数据库 | Pinecone |
| Embedding | OpenAI / 通义千问 |
| LLM | OpenAI / 通义千问 |

## 项目结构

```
app/
├── api/
│   ├── chat/route.ts      # 普通聊天
│   ├── upload/route.ts     # 文件上传
│   ├── index/route.ts      # 文档索引
│   ├── rag/route.ts        # RAG 问答
│   ├── agent/route.ts      # Agent 问答
│   └── delete/route.ts     # 删除文档
├── page.tsx                # 主页面
└── layout.tsx              # 布局

components/chat/
├── chat-input.tsx          # 输入框（含功能开关）
├── message-list.tsx        # 消息列表
├── sidebar.tsx             # 侧边栏
├── file-upload.tsx         # 文件上传
└── optimization-modal.tsx  # 优化选项弹窗

lib/
├── chromadb.ts             # Pinecone 向量数据库
├── chunker.ts              # 文本分块
├── chunks-store.ts         # 本地 chunks 存储（BM25 用）
└── parser/                 # 文档解析

hooks/
└── use-chat.ts            # 聊天状态管理

types/chat.ts               # 类型定义
```

## 环境变量

```env
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
DEFAULT_MODEL=qwen3-max-preview
MEMORY_EXTRACT_MODEL=qwen-turbo
EMBEDDING_MODEL=text-embedding-v2
PINECONE_API_KEY=your-pinecone-key
PINECONE_INDEX=rag-assistant
QWEATHER_API_KEY=your-qweather-key
QWEATHER_API_HOST=your-api-host.qweather.com
TAVILY_API_KEY=your-tavily-key
```

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DEFAULT_MODEL` | 主模型，用于对话和 RAG | qwen3-max-preview |
| `MEMORY_EXTRACT_MODEL` | 记忆抽取专用模型，更小更快 | qwen-turbo |

## 开发

```bash
pnpm install
pnpm dev
```

## 使用流程

1. **上传文档**：点击上传区域，上传 PDF、TXT、DOCX 或 MD 文件
2. **索引文档**：上传后点击"索引"按钮，将文档向量化存入数据库
3. **功能开关**：
   - 🧠 **思考** — 开启深度思考模式
   - 🔍 **联网** — 开启联网搜索
   - ✨ **HyDE** — 开启检索优化
   - 🤖 **Agent** — 开启 Agent 深度分析模式
4. **选择文档**：可选择特定文档或全部文档检索
5. **提问**：输入问题，系统会检索相关文档片段后回答（开启 Agent 则先展示思考计划）

---

## 核心功能原理

### 1. 多轮对话

**解决什么问题**：第二句"它股价如何？"中的"它"指什么？

**方案**：将历史对话拼接进检索 query，帮助模型理解指代关系。

### 2. HyDE（假设答案检索增强）

**解决什么问题**：用户问题表述模糊或与文档用词不一致时，检索效果差。

**原理**：
1. 让 LLM 根据问题生成一个"假设答案"
2. 用假设答案去做向量检索
3. 快速验证假设答案和实际检索结果是否匹配
4. 不匹配则让 LLM 修正假设答案后重新检索

**为什么快**：使用快速关键词匹配预检，大部分情况跳过 LLM 修正步骤。

### 3. 混合检索（BM25 + 向量 + RRF）

**解决什么问题**：纯向量检索对关键词精确匹配不敏感。

**原理**：
- **向量检索**：语义理解强，表述不同但意思相近的内容也能找到
- **BM25**：关键词精确匹配，特定术语、人名、数字等检索准确
- **RRF 融合**：综合两种检索结果的排名，计算最终得分

### 4. 深度思考 + 联网搜索

**深度思考**：模型先分步推理再回答，适合复杂逻辑问题。

**联网搜索**：模型实时搜索互联网获取信息，适合最新资讯类问题。

### 5. 引用标注

**解决什么问题**：用户想知道回答的参考来源，增加可信度。

**实现方式**：
1. 检索结果按顺序编号：`[1号文档]`, `[2号文档]`...
2. 在 Prompt 中要求模型使用 `[编号]` 格式引用
3. 回答示例：根据[1号文档]的描述，特斯拉是一家电动汽车公司

### 6. Agent（文档分析 Agent）

**解决什么问题**：传统 RAG 是"一问一答"模式，Agent 能主动规划检索策略、理解复杂意图。

**Agent vs 普通 RAG**：

| | 普通 RAG | Agent |
|--|----------|-------|
| 用户问"对比A和B" | 直接检索，可能混淆 | 先分析问题，制定计划，分别检索后对比 |
| 用户问"这是什么" | 简单检索 | 先判断需要查什么，再执行检索 |
| 检索结果不够 | 只能返回不完整答案 | 能感知结果不足，主动再检索 |

**Agent 三件套**：

| 能力 | 说明 |
|------|------|
| **Tools（工具）** | Agent 能调用的能力，如搜索文档、查天气、联网搜索 |
| **ReAct（推理）** | 思考→行动→观察 循环直到得到答案 |
| **Memory（记忆）** | 跨会话记住用户偏好和重要事实 |

**Agent 工作流程**：

```
用户提问：杭州今天天气怎么样？

┌─────────────────────────────────────────────────────┐
│ 💭 思考                                              │
│    用户想知道杭州的天气，我需要调用天气工具获取数据     │
├─────────────────────────────────────────────────────┤
│ 🎯 行动                                              │
│    → get_weather {"location": "杭州"}               │
├─────────────────────────────────────────────────────┤
│ 👁️ 观察                                              │
│    杭州今天晴朗，气温28℃，东南风3级                   │
├─────────────────────────────────────────────────────┤
│ ✨ 最终回答                                           │
│    杭州今天天气晴朗，气温28℃，适合外出活动。          │
└─────────────────────────────────────────────────────┘
```

**工具定义**：

| 工具名 | 功能 | 参数 |
|--------|------|------|
| `get_weather` | 查询天气预报 | `location`: 城市名 |
| `search_documents` | 搜索本地文档 | `query`: 搜索内容, `documentName?`: 指定文档 |
| `list_documents` | 列出所有文档 | 无 |
| `get_documents_stats` | 获取统计信息 | 无 |
| `web_search` | 联网搜索 | `query`: 搜索关键词 |

**前端显示示例**：

```
💭 思考：用户想知道杭州的天气，我需要调用天气工具
🎯 行动：调用 get_weather({"location": "杭州"})
👁️ 观察：杭州今天晴朗，气温28℃，东南风3级
✨ 最终回答：杭州今天天气晴朗，气温28℃，适合外出活动。
```

**两种模式**：

| 模式 | 说明 |
|------|------|
| **普通模式** | 直接返回回答，不展示推理过程 |
| **ReAct 模式** | 实时展示 思考→行动→观察→最终回答 的完整推理链 |

---

## RAG 完整流程

```
文档上传
    │
    ▼
解析 → 分块 → 双存储（Pinecone 向量 + 本地 chunks）
                            │
                            ▼
                    用户提问 + 历史上下文
                            │
                            ▼
                      HyDE 增强（可选）
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
        向量检索                      BM25 检索
              │                           │
              └───────────┬───────────────┘
                          ▼
                    RRF 融合排序
                          │
                          ▼
              拼接上下文 → Prompt 工程
                          │
                          ▼
            ┌─────────────┴─────────────┐
            ▼                           ▼
      深度思考                      联网搜索
            │                           │
            └─────────────┬─────────────┘
                          ▼
                    调用 LLM
                          │
                          ▼
                    流式返回
```

---

## 待扩展功能

### 检索优化

| 功能 | 说明 | 难度 |
|------|------|------|
| **重排序 (Reranking)** | 用 Cross-Encoder 或 Cohere 对初步检索结果做精排 | ⭐⭐⭐ |
| **MMR 多样性检索** | Maximal Marginal Relevance，保证结果多样性 | ⭐⭐ |
| **上下文压缩** | 对检索结果做摘要压缩，减少 Token 消耗 | ⭐⭐ |
| **子查询分解** | 复杂问题拆分为多个简单查询，并行检索后合并 | ⭐⭐⭐ |

### 文档解析

| 功能 | 说明 | 难度 |
|------|------|------|
| **表格提取** | PDF 表格还原为结构化文本 | ⭐⭐⭐ |
| **图片 OCR** | 识别图片中的文字内容 | ⭐⭐ |
| **页眉页脚过滤** | 去除每页重复的格式信息 | ⭐⭐ |
| **乱码检测** | 识别并过滤无效字符 | ⭐ |

### Prompt 工程

| 功能 | 状态 | 说明 | 难度 |
|------|------|------|------|
| **引用标注** | ✅ 已实现 | 回答时用 [编号] 格式标注参考来源 | ⭐ |
| **Few-Shot Prompt** | ⏳ 待做 | 添加示例帮助模型理解输出格式 | ⭐ |
| **思考链提示** | ⏳ 待做 | 引导模型分步推理后回答 | ⭐ |

### Agent 增强

| 功能 | 说明 | 难度 | 状态 |
|------|------|------|------|
| **ReAct 自我纠错** | 工具执行失败或结果不足时自动重试或换策略 | ⭐⭐⭐ | ✅ 已实现 |
| **ReAct 流式输出** | 思考/行动/观察/最终回答实时展示在页面上 | ⭐⭐ | ✅ 已实现 |
| **记忆压缩** | 对话历史过长时自动总结压缩，减少 Token 消耗 | ⭐⭐⭐ | ✅ 已实现 |
| **跨会话记忆** | LLM 智能抽取 + localStorage 持久化，新会话可复用 | ⭐⭐⭐ | ✅ 已实现 |

#### ReAct 自我纠错（Self-Correction）✅

**解决什么问题**：
- 当前 ReAct 是线性执行，工具返回结果不好也只能继续
- 无法判断结果是否有用、是否足够
- 遇到错误就卡住，无法换策略

**自我纠错的三种场景**：

| 场景 | 说明 | 应对策略 |
|------|------|----------|
| **结果为空** | 检索返回"未找到相关内容" | 尝试换关键词、扩大范围、启用联网搜索 |
| **结果质量低** | 返回内容与问题相关性低 | 改写 query 后重新检索 |
| **工具执行失败** | API 超时、权限错误等 | 重试 2-3 次，仍失败则换其他工具 |

**核心思路**：
- 在工具执行后增加一个"评估"步骤
- 用 LLM 判断当前结果是否足够回答问题
- 根据评估结果决定下一步：继续、重试、换策略、或联网搜索

**工作流程对比**：

```
【改造前】
用户问题 → 检索 → 返回结果 → 回答（可能质量差）

【改造后】
用户问题 → 检索 → 评估结果
    ↓ 不够
  改写 query → 重新检索 → 评估结果
    ↓ 仍不够
  联网搜索 → 综合结果 → 回答
```

**关键实现要点**：
- 评估prompt设计：让 LLM 从"相关性"和"充分性"两个维度打分
- 纠错策略选择：根据评估建议决定是改写 query 还是切换工具
- 防止死循环：设置最大纠错次数（MAX_CORRECTION_ROUNDS = 3）

**新增文件**：

| 文件 | 说明 |
|------|------|
| `lib/agent/evaluator.ts` | 工具结果评估器，评估相关性 + 充分性 |
| `lib/agent/self-correction.ts` | 纠错策略选择器，选择合适的纠错动作 |
| `lib/agent/index.ts` | 模块导出 |

**改造文件**：

| 文件 | 改动 |
|------|------|
| `app/api/agent/route.ts` | 集成评估和纠错逻辑，handleNormalMode 和 runReactLoop 均支持自我纠错 |

**验证标准**：
- [x] 检索结果为空时，能自动尝试联网
- [x] 结果相关性低时，能自动改写 query 重试
- [x] 工具失败时，能自动重试或换策略
- [x] 纠错次数有上限，防止无限循环

---

#### 记忆压缩 ✅

**解决什么问题**：
- 对话历史越来越长，Token 消耗大
- 每次新建会话都要重新开始
- 重要的上下文信息丢失

**方案：对话历史压缩（Summarization）**

当对话轮次超过阈值（10 轮）或 token 超过阈值（4000），自动压缩历史：

- 用 LLM 总结早期对话的核心内容
- 将总结结果作为 system prompt 的一部分
- 保留最近几轮完整对话，删除早期历史

**原理**：
```
原始历史（20轮）→ 压缩 → 【对话摘要】+ 最近6轮
```

**新增文件**：

| 文件 | 说明 |
|------|------|
| `app/api/summarize/route.ts` | 摘要生成 API，调用 LLM 生成对话历史摘要 |

**改造文件**：

| 文件 | 改动 |
|------|------|
| `hooks/use-chat.ts` | 添加压缩检测、压缩触发逻辑 |
| `app/api/chat/route.ts` | 处理带 summary 的请求，注入到 system prompt |
| `app/api/rag/route.ts` | 处理带 summary 的请求，追加到 system prompt |

**验证标准**：
- [x] 对话超过 10 轮时自动压缩
- [x] Token 超过 4000 时自动压缩
- [x] 摘要保留关键信息
- [ ] Token 消耗降低 50%+（需实测）

---

#### 跨会话记忆（Memory）✅

**解决什么问题**：
- 每次新建会话都要重新开始
- 重要的上下文信息丢失
- 无法记住用户偏好

**方案：将重要信息持久化存储**

| 记忆类型 | 内容 | 用途 |
|----------|------|------|
| **用户偏好** | 姓名、常用地、感兴趣的话题 | 个性化回答 |
| **重要事实** | 用户告知的信息及场景 | 上下文连贯 |
| **会话历史** | 过往问题摘要 | 避免重复 |

**工作流程**：

```
【新会话开始】
加载记忆 → 注入用户偏好到 System Prompt
    ↓
用户提问
    ↓
【对话中】
对话结束 → 调用 LLM API 智能抽取重要信息 → 自动保存到记忆
    ↓
【新会话】
加载历史记忆 → 注入上下文 → 理解用户偏好和讨论主题
```

**技术方案**：
- 使用 **LLM API 智能抽取**（`/api/memory-extract`），专用模型 `qwen-turbo` 不占用主模型配额
- 支持提取：用户身份、偏好、关键事实、讨论上下文
- 记忆存储在 **localStorage**，前端直接读取
- 记忆有过期机制：事实默认 30 天过期，会话摘要 7 天过期

**新增文件**：

| 文件 | 说明 |
|------|------|
| `app/api/memory-extract/route.ts` | LLM 记忆抽取 API，智能从对话中提取信息 |
| `lib/memory/user-memory.ts` | 用户记忆 CRUD，localStorage 持久化，过期清理 |
| `lib/memory/index.ts` | 模块导出 |

**改造文件**：

| 文件 | 改动 |
|------|------|
| `hooks/use-chat.ts` | 集成记忆加载和自动抽取，调用 `/api/memory-extract` |
| `app/api/chat/route.ts` | 处理 memoryContext 参数，注入到 system prompt |
| `app/api/rag/route.ts` | 处理 memoryContext 参数 |
| `app/api/agent/route.ts` | 处理 memoryContext 参数 |

**验证标准**：
- [x] 新会话能识别老用户（从 localStorage 加载）
- [x] 记忆中的偏好被注入 System Prompt
- [x] 使用 LLM API 智能抽取对话中的重要信息
- [x] 专用记忆抽取模型（MEMORY_EXTRACT_MODEL）不占用主模型配额
- [x] 记忆有过期自动清理机制

---

## 进阶学习路线

```
阶段一：基础 RAG（已完成）
├── 文档解析
├── 文本分块
├── 向量检索
└── Prompt 工程

阶段二：检索增强（已完成）
├── 多轮对话 ✅
├── HyDE ✅
├── 混合检索 ✅
└── 上下文压缩 ✅

阶段三：高级检索
├── Reranking 重排序
├── MMR 多样性
├── 查询改写/扩展
└── 多跳推理

阶段四：Agent ✅
├── 联网调研 Agent
├── 工具调用（Function Calling）
├── 自主规划（ReAct）✅
└── 多 Agent 协作

阶段五：生产级优化
├── 评估体系
├── 缓存机制
├── 性能监控
└── 成本控制
```

---

## 扩展方向建议

### 短期（快速见效）
1. **接入重排序 API**（如 Cohere Rerank）— 显著提升检索精度
2. **实现 MMR** — 改善检索结果多样性
3. **添加引用标注** — 提升回答可信度

### 中期（效果明显）
1. **构建评估体系** — 量化 RAG 效果
2. **多跳推理支持** — 处理复杂组合问题
3. **联网调研 Agent** — 整合搜索 + RAG

### 长期（生产级）
1. **迁移到更强大的向量数据库**（如 Qdrant 支持混合检索）
2. **自托管 Embedding 模型** — 降低成本
3. **多 Agent 协作系统** — 处理复杂工作流

---

## 开发日志

### 2026-04-09 Function Calling 架构重构

#### 问题描述
- 旧方案使用关键词匹配识别用户意图（如 `WEATHER_KEYWORDS_EXPLICIT`、`WEATHER_KEYWORDS_IMPLICIT`）
- "今天适合出游吗" 被误识别为天气查询
- "推荐好玩的地方" 也被错误触发天气流程
- 无法理解语义，只能靠关键词列表维护

#### 解决方案
重构为 **OpenAI Function Calling** 架构：

1. **工具定义统一管理** - `lib/tools/definitions.ts`
   - 使用 OpenAI 官方 `tools` 参数格式
   - 工具描述（`description`）让 LLM 理解何时调用

2. **工具执行器注册表** - `TOOL_EXECUTORS` 映射工具名到执行函数

3. **LLM 自动决策** - 使用 `tool_choice: 'auto'` 让 LLM 决定调用哪个工具

4. **支持多工具并行** - `Promise.all` 并行执行多个工具调用

#### 新增文件
| 文件 | 说明 |
|------|------|
| `lib/tools/definitions.ts` | 工具定义、ToolExecutor 类型、TOOL_EXECUTORS 注册表 |
| `lib/tools/documents.ts` | 文档工具封装（search/list/stats） |
| `lib/tools/index.ts` | 统一导出 |

#### 修改文件
| 文件 | 改动 |
|------|------|
| `app/api/agent/route.ts` | 完全重写，~300 行核心逻辑 |
| `types/chat.ts` | 新增 ToolCall、ToolResult、ChatCompletionTool 类型 |

#### 核心代码
```typescript
// 调用 LLM（让 LLM 决定是否调用工具）
const response = await openai.chat.completions.create({
  model: selectedModel,
  messages: currentMessages,
  tools: TOOL_DEFINITIONS,      // 工具定义
  tool_choice: 'auto',           // 自动选择
  stream: true,
});

// 处理响应
const { content, toolCalls } = await processStreamingResponse(response);

// 有工具调用 → 执行 → 继续循环
if (toolCalls.length > 0) {
  const results = await Promise.all(
    toolCalls.map(tc => TOOL_EXECUTORS[tc.name](tc.name, tc.arguments))
  );
  // 把结果加入消息历史，继续让 LLM 生成回答
}
```

#### 调试日志（2026-04-09）

详见下方「问题总结」部分

```
┌─────────────────────────────────────────────────────────────┐
│  1. callLLMWithTools(stream: false)                        │
│     → 完整收取 tool_calls + text                           │
│     → 保证参数不丢失                                        │
├─────────────────────────────────────────────────────────────┤
│  2. 执行工具                                                │
│     → 获取完整结果                                          │
├─────────────────────────────────────────────────────────────┤
│  3. streamLLMResponse(stream: true)                        │
│     → 流式返回给页面                                        │
└─────────────────────────────────────────────────────────────┘
```

**核心改动（`app/api/agent/route.ts`）：**
- 删除 `processStreamingResponse`（streaming 逻辑）
- 新增 `callLLMWithTools`：非流式获取完整 tool_calls
- 新增 `streamLLMResponse`：流式返回最终回答
- 两阶段 LLM 调用：工具决策用非流式，最终回答用流式

#### 问题总结

**现象**：查询"杭州天气"时，`get_weather` 工具收到参数为 `{}`

**根本原因**：OpenAI streaming 分块发送 `tool_calls`，但各字段不完整：

```
chunk#1: {"id":"call_xxx","type":"function","function":{"name":"get_weather","arguments":""}}
         ↑ 有 id 和 name，无 arguments

chunk#2: {"id":"call_xxx","type":"function","function":{"name":"","arguments":"{\"location\": \""}}
         ↑ 有 id（后续 chunk 会复用），arguments 第一部分

chunk#3: {"id":"","type":"function","function":{"arguments":"杭州\""}}}
         ↑ id 为空！arguments 续传，但被我的条件 `if (!tc.id) continue;` 跳过

chunk#4: finish_reason: tool_calls → stream 结束
```

**问题分析**：
1. streaming 模式下，OpenAI 分 token 发送数据
2. `id`、`name`、`arguments` 可能在不同 chunk 中
3. 当 `finish_reason: tool_calls` 时 stream 结束
4. 如果 arguments 的最后一部分在 `finish_reason` 之后才到达，会丢失

**解决方案**：工具调用用非流式（保证完整），最终回答用流式（保证体验）

#### 验证测试
- [x] "杭州天气怎么样" → 直接返回天气 ✅
- [ ] "今天适合出游吗" → 应先查天气再回答
- [ ] "推荐几个好玩的地方" → **不应调用天气工具**

---

### 技术栈
- 前端：Next.js 16, React, TypeScript, Tailwind CSS
- 后端：Next.js API Routes
- 向量数据库：Pinecone
- LLM：OpenAI / 通义千问（支持 function calling）

---

### 2026-04-09 联网搜索工具日志功能

#### 功能说明
为联网搜索工具（`lib/tools/search.ts`）添加了调试日志，用于排查搜索结果问题。

#### 功能测试
- [x] 联网搜索返回结果正常
- [x] 日志打印完整搜索内容

#### 相关文件
| 文件 | 改动 |
|------|------|
| `lib/tools/search.ts` | 添加 console.log 调试日志（测试后已移除）|

#### 工具定义
| 工具名 | 功能 | 参数 |
|--------|------|------|
| `web_search` | 联网搜索 | `query`: 搜索关键词 |

---

### 2026-04-10 ReAct 自我纠错实现

#### 功能说明
为 Agent 添加自我纠错能力，当工具执行结果不满意时自动重试或切换策略。

#### 核心改动

**1. 评估器 `lib/agent/evaluator.ts`**
- 新增 `evaluateToolResult()` 函数，用 LLM 评估工具结果质量
- 从"相关性"和"充分性"两个维度打分（1-5）
- 返回纠错建议：`continue` / `rewrite_query` / `expand_search` / `switch_to_web` / `retry`

**2. 纠错策略 `lib/agent/self-correction.ts`**
- `selectStrategy()` 根据评估结果选择纠错动作
- `createCorrectionContext()` 创建纠错上下文
- 防止死循环：最大纠错次数 3 次

**3. Agent 路由 `app/api/agent/route.ts`**
- `handleNormalMode()` 集成评估和纠错逻辑
- `runReactLoop()` 在 ReAct 模式下也支持自我纠错
- 新增 `executeToolWithRetry()` 带重试的工具执行

#### 纠错流程

```
工具执行 → 评估结果质量
    ↓
评估通过 → 继续下一步
    ↓ 评估不通过
纠错策略选择
    ├── rewrite_query：改写查询词重新检索
    ├── expand_search：扩大搜索范围
    ├── switch_to_web：切换到联网搜索
    └── retry：重试当前工具
```

#### 验证测试
- [x] TypeScript 编译通过
- [ ] 检索结果为空时自动尝试联网
- [ ] 结果相关性低时自动改写 query
- [ ] 工具失败时自动重试

#### 相关文件
| 文件 | 改动 |
|------|------|
| `lib/agent/evaluator.ts` | 新增 - 工具结果评估器 |
| `lib/agent/self-correction.ts` | 新增 - 纠错策略选择器 |
| `lib/agent/index.ts` | 新增 - 模块导出 |
| `app/api/agent/route.ts` | 改造 - 集成自我纠错 |

---

### 2026-04-10 记忆压缩实现

#### 功能说明
当对话历史过长时（超过 10 轮或 4000 tokens），自动调用 LLM 生成摘要，减少 Token 消耗。

#### 核心改动

**1. 摘要生成 API `app/api/summarize/route.ts`**
- 接收对话历史，返回压缩后的摘要
- 保留：用户信息、讨论主题、关键事实、已解决问题
- 同时返回最近 3 轮完整对话

**2. 压缩检测逻辑 `hooks/use-chat.ts`**
- `needsCompression()` 检测是否需要压缩
- `compressChatHistory()` 异步执行压缩
- 压缩触发条件：用户消息轮次 >= 10 或 token 总量 >= 4000

**3. API 集成**
- `app/api/chat/route.ts`：处理带 summary 的请求，注入到 system prompt
- `app/api/rag/route.ts`：处理带 summary 的请求，追加到 system prompt

#### 验证测试
- [x] TypeScript 编译通过
- [ ] 对话超过 10 轮时自动触发压缩
- [ ] 摘要正确保留关键信息
- [ ] API 正确接收并处理摘要

#### 相关文件
| 文件 | 改动 |
|------|------|
| `app/api/summarize/route.ts` | 新增 - 摘要生成 API |
| `hooks/use-chat.ts` | 改造 - 添加压缩检测和触发 |
| `app/api/chat/route.ts` | 改造 - 处理 summary 参数 |
| `app/api/rag/route.ts` | 改造 - 处理 summary 参数 |

---

### 2026-04-10 跨会话记忆实现

#### 功能说明
将用户信息持久化存储到 localStorage，新会话可以自动加载并注入到 System Prompt。

#### 核心改动

**1. 记忆存储 `lib/memory/user-memory.ts`**
- `UserMemory` 接口：preferences、facts、sessionSummaries
- `loadUserMemory()` / `saveUserMemory()` - CRUD 操作
- `generateMemoryContext()` - 生成可注入的上下文字符串

**2. LLM 记忆抽取 `app/api/memory-extract/route.ts`**
- 调用专用模型 `qwen-turbo`（不占用主模型配额）
- 支持提取：用户身份、偏好、关键事实、讨论上下文
- 返回 memories 数组 + summary

**3. 前端集成 `hooks/use-chat.ts`**
- 提交时自动加载 `memoryContext`
- 异步调用 `/api/memory-extract` 抽取对话中的重要信息并保存到 localStorage

> 记忆全部存储在浏览器 localStorage，前端直接操作。

#### 验证测试
- [x] TypeScript 编译通过
- [x] 新会话加载历史记忆
- [x] 记忆上下文正确注入到 API 请求（Chat/RAG/Agent 均支持）
- [x] 专用记忆抽取模型（MEMORY_EXTRACT_MODEL）配置
- [x] 记忆有过期自动清理机制

#### 相关文件
| 文件 | 改动 |
|------|------|
| `app/api/memory-extract/route.ts` | 新增 - LLM 记忆抽取 API |
| `lib/memory/user-memory.ts` | 新增 - 用户记忆存储 + 过期清理 |
| `lib/memory/index.ts` | 新增 - 模块导出 |
| `hooks/use-chat.ts` | 改造 - 集成记忆加载和抽取 |
| `app/api/chat/route.ts` | 改造 - 处理 memoryContext |
| `app/api/rag/route.ts` | 改造 - 处理 memoryContext |
| `app/api/agent/route.ts` | 改造 - 处理 memoryContext |

---

### 2026-04-10 ReAct 流式输出实现

#### 功能说明
ReAct 模式下，将思考/行动/观察/最终回答实时流式展示在前端页面上，而非最后一次性输出。

#### 核心改动

**1. SSE 消息格式 `app/api/agent/route.ts`**
- 使用 `createSSEMessage(type, content)` 发送自定义事件格式
- type 支持：`thought` / `action` / `observation` / `final_answer`
- 前端通过 `prefixMap` 给不同类型加 emoji 前缀

**2. 全局步骤扫描 `extractAllSteps()`**
- LLM 输出可能把多个步骤放同一行，或全放一个大段落
- 用正则全局扫描 `思考：`、`行动：`、`观察：`、`最终回答：`
- 不依赖换行符，确保步骤不遗漏

**3. 前端 SSE 解析 `hooks/use-chat.ts`**
- 改用 `split('\n\n')` 按 SSE 标准消息边界分隔（不再误拆 JSON 内部换行符）
- ReAct 模式识别 `parsed.type` 和 `parsed.content` 字段

**4. ReAct Prompt 增强**
- 强制要求：即使直接回答也必须先写"思考："再写"最终回答："
- 禁止跳过思考过程直接输出答案

#### 验证测试
- [x] TypeScript 编译通过
- [x] 思考/行动/观察/最终回答实时展示在前端
- [x] 多行内容不截断（完整显示）
- [x] SSE 解析不再因换行符导致 JSON.parse 失败

#### 相关文件
| 文件 | 改动 |
|------|------|
| `app/api/agent/route.ts` | 改造 - SSE 流式输出 + 全局步骤扫描 |
| `hooks/use-chat.ts` | 改造 - SSE `split('\n\n')` 解析 |

---