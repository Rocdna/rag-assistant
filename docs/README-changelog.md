# RAG 本地知识库助手

基于 Next.js + RAG 的本地知识库问答助手，支持多轮对话、混合检索、深度思考和联网搜索。

## 功能

### 交互优化
- [x] **移动端 ChatGPT 风格输入框** — 自动扩展高度、1000字限制、字数计数器
- [x] **工具栏 Tooltip 提示** — 移动端图标 hover 显示功能说明
- [x] **统一删除确认弹窗** — 对话、文档、设置均使用现代化确认弹窗
- [x] **对话列表布局优化** — 单行布局，删除按钮始终可见且居中对齐

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
│   ├── chat/route.ts       # 普通聊天
│   ├── upload/route.ts     # 文件上传
│   ├── index/route.ts      # 文档索引
│   ├── rag/route.ts        # RAG 问答
│   ├── agent/route.ts      # Agent 问答
│   ├── delete/route.ts     # 删除文档
│   └── delete-all/route.ts # 清空所有文档
├── login/page.tsx          # 登录/注册页
├── auth/callback/          # OAuth 回调
├── page.tsx                # 主页面
└── layout.tsx              # 布局

components/chat/
├── chat-input.tsx          # 输入框（含功能开关）
├── message-list.tsx        # 消息列表
├── sidebar/                 # 侧边栏
│   ├── index.tsx
│   ├── chat-history-list.tsx
│   └── document-list.tsx
├── header/                  # Header 区
│   ├── mode-tabs.tsx
│   ├── model-select.tsx
│   └── user-menu.tsx
├── confirm-modal.tsx       # 通用确认弹窗
└── mobile-settings-sheet.tsx

lib/
├── pinecone.ts             # Pinecone 向量数据库
├── chunker.ts              # 文本分块
├── search/                 # 检索模块
│   ├── index.ts
│   └── hybrid-search.ts
├── parser/                  # 文档解析
│   ├── index.ts
│   ├── pdf.ts
│   ├── txt.ts
│   └── docx.ts
├── tools/                   # Agent 工具集
│   ├── documents.ts
│   └── index.ts
└── supabase.ts             # Supabase 客户端

hooks/
├── use-chat.ts             # 聊天状态管理
└── use-document-index.ts   # 文档上传/索引管理

proxy.ts                    # 认证中间件（路由保护 + userId 注入）
types/chat.ts               # 类型定义
```

## 环境变量

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# LLM
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
DEFAULT_MODEL=qwen3-max-preview
MEMORY_EXTRACT_MODEL=qwen-turbo
EMBEDDING_MODEL=text-embedding-v2

# Pinecone
PINECONE_API_KEY=your-pinecone-key
PINECONE_INDEX=rag-assistant
```

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DEFAULT_MODEL` | 主模型，用于对话和 RAG | qwen3-max |
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

### 文件上传

| 功能 | 说明 | 状态 | 难度 |
|------|------|------|------|
| **分片上传** | 支持大文件（>25MB）分片传输，解决 EdgeOne Workers body 上限 | ✅ 已支持 25MB | ⭐⭐⭐ |
| **断点续传** | 网络中断后可从已上传分片继续 | ⏳ 待扩展 | ⭐⭐⭐ |

**技术方案**：采用 [Uppy](https://uppy.io/) 开源分片上传方案，配合 R2/S3 作为临时存储

**核心流程**：
```
Client → Uppy Companion（R2 Presigned URL）→ R2/S3（分片存储）
                                              ↓
Client 通知合并 → Server 拉取文件 → 解析 → 索引 → 清理临时分片
```

### Prompt 工程

| 功能 | 状态 | 说明 | 难度 |
|------|------|------|------|
| **引用标注** | ✅ 已实现 | 回答时用 [编号] 格式标注参考来源 | ⭐ |
| **Few-Shot Prompt** | ⏳ 待做 | 添加示例帮助模型理解输出格式 | ⭐ |
| **思考链提示** | ⏳ 待做 | 引导模型分步推理后回答 | ⭐ |

### Agent 增强

| 功能 | 说明 | 难度 | 状态 |
|------|------|------|------|
| **ReAct 自我纠错** | 工具执行失败或结果不足时自动重试或换策略 | ⭐⭐⭐ | ⚠️ 代码已实现，未接入 |
| **ReAct 流式输出** | 思考/行动/观察/最终回答实时展示在页面上 | ⭐⭐ | ✅ 已实现 |
| **记忆压缩** | 对话历史过长时自动总结压缩，减少 Token 消耗 | ⭐⭐⭐ | ✅ 已实现 |
| **跨会话记忆** | LLM 智能抽取 + localStorage 持久化，新会话可复用 | ⭐⭐⭐ | ✅ 已实现 |

#### ReAct 自我纠错（Self-Correction）⚠️ 未接入

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
1. ~~**添加引用标注**~~ — ✅ 已实现，回答时用 [编号] 格式标注参考来源
2. **重排序 API**（如 Cohere Rerank）— 显著提升检索精度
3. **实现 MMR** — 改善检索结果多样性
4. **Prompt 抽离** — 将 `route.ts` 里的 SYSTEM_PROMPT/REACT_SYSTEM_PROMPT 拆到 `lib/prompts/` 独立管理

### 中期（效果明显）
1. ~~**联网调研 Agent**~~ — ✅ 已实现，`web_search` 工具 + Agent 整合
2. ~~**Agent 自我纠错**~~ — ⚠️ 已实现代码（`lib/agent/evaluator.ts` + `self-correction.ts`），但**未接入** `route.ts`，功能未生效
3. **构建评估体系** — 量化 RAG 效果
4. **多跳推理支持** — 处理复杂组合问题
5. **`route.ts` 重构** — 展示层/执行层解耦，删除冗余代码

### 长期（生产级）
1. **迁移到更强大的向量数据库**（如 Qdrant 支持混合检索）
2. **自托管 Embedding 模型** — 降低成本
3. **多 Agent 协作系统** — 处理复杂工作流
4. **测试覆盖** — 核心链路（agent/检索/记忆）补单元测试
5. **类型收紧** — 消除 `as any`，全链路 strict mode

---

## 已知 BUG 与防范措施

### BUG-2026-04-21-002：LLM 不信任工具返回，反复搜索直到符合信念

**现象**：用户问"今年是哪一年"，LLM 调用 `web_search` 查到"2026年"，但 LLM 内心认为"不对，我认为应该是2024"，于是再次搜索，这次搜到了"2024年"，最终返回2024。工具结果被 LLM 的先验知识覆盖。

**根因**：LLM 的训练数据中有"当前年份是2024"的认知，工具虽然返回了实时数据"2026"，但 LLM 觉得"工具查的可能不对，还是我训练数据靠谱"，于是自我验证式地二次搜索，直到找到和自身信念一致的答案。

**修复方案**：通过系统提示词明确工具结果的权威性：

```
【工具结果信任规则】（重要，必须遵守）
- 工具返回的结果是实时的、权威的。如果工具返回的答案与你的训练数据冲突，
  **始终以工具返回的结果为准**，不要质疑、不要复搜
- 禁止对同一问题进行两次以上的搜索。如果第一次搜索结果与你的知识冲突，
  你应该说"根据搜索结果是X"，而不是再次搜索验证
- 模型必须引用搜索结果的原文或摘要，不能无视工具返回自行发挥
```

**防范措施**：
1. 所有涉及实时信息的工具，都要在 prompt 中明确"工具结果优先于内部知识"
2. 搜索类工具必须设置"禁止重复搜索"规则，避免 LLM 自我验证循环
3. Prompt 中要求 LLM 必须引用工具返回的原文，不能跳过工具结果自行发挥

---

### BUG-2026-04-21-001：React 模式下工具不调用

**现象**：React 模式开启后，大模型输出"行动：web_search {"query": ...}" 但工具不执行，页面直接显示最终回答。

**根因**：多重问题叠加：

1. **REACT_SYSTEM_PROMPT 冲突**：`callLLMWithTools` 已有 `tools: TOOL_DEFINITIONS`，模型通过 `tool_calls` 返回工具调用。但 prompt 让模型同时输出 ReAct 文本格式，导致模型两者都做，代码只检查 `tool_calls`。

2. **代码冗余**：`runReactLoop` 中 `parseToolCallsFromText` 试图从文本解析工具调用，但正则写法有 JS 字符串转义 bug（`\\s` 被解释为字面量 `\s` 而非空白符），且 JSON 边界判断复杂容易出错。

3. **重复代码引入语法 bug**：`if (callsToExecute.length > 0)` 重复两行，多开了一个 `{` 导致少了一个 `}` 闭合。

4. **cleanContent 处理不完整**：重新调用 LLM 生成最终回答后，`finalContent` 仍包含完整 ReAct 格式文本（"思考：..."），`cleanContent` 只去掉了 emoji 和冒号前缀，没处理混入的"思考："前缀。

**修复方案**：

1. **修改 REACT_SYSTEM_PROMPT**：明确告知模型文本步骤（"行动："）只是展示，`tool_calls` 才是真正工具调用：
   ```
   行动：<工具名称> <参数>  ← 仅用于展示，实际通过 tool_calls 调用
   ```

2. **启用 tools + tool_choice**：`callLLMWithTools` 已有 `tools: TOOL_DEFINITIONS`，让模型通过 function calling 返回工具，而非文本解析。

3. **删除重复代码**：移除 `if (callsToExecute.length > 0)` 的重复行，修复语法错误。

4. **增强 cleanContent**：优先提取"最终回答："之后的内容，再去掉混入的"思考："等格式前缀。

**防范措施**：
1. React 模式不走文本解析，直接复用普通模式的 function calling 链路
2. 调试时加完日志要及时清理，避免日志残留掩盖真正问题
3. 每次修改后检查 TypeScript 编译错误，不要积累到最后一起修

---

### BUG-2026-04-17-001：多用户切换时 localStorage 数据被覆盖

**现象**：退出登录再重新登录，历史对话消失，localStorage 中的值变成 `{"chats":[],"currentChatId":null}`。

**根因**：React state 更新和 localStorage 写入共享同一个触发依赖。`useChat` 中：
- `userId effect`（load）触发 `setChats(storedChats)` → state 更新
- `save effect` 依赖 `chats` state，同时被触发 → 把空的 `chats` 写入 localStorage

时序：
```
1. 用户 B 登录 → userId 有值
2. userId effect 执行 → 读到 B 的数据 → setChats(B的数据) 【但还没渲染】
3. save effect 被 chats 变化触发 → 此时 chats 仍是空数组 → localStorage.setItem({ chats: [], currentChatId: null }) 【覆盖！】
```

**修复方案**：用 `isRestoringRef` 标记恢复中状态，save effect 检查该标记跳过写入。
```typescript
const isRestoringRef = useRef(false);
useEffect(() => {
  if (!userId) return;
  isRestoringRef.current = true;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const { chats: storedChats, currentChatId: storedId } = JSON.parse(stored);
    setChats(storedChats || []);
    setCurrentChatId(storedId || null);
  }
  setTimeout(() => { isRestoringRef.current = false; }, 0);
}, [STORAGE_KEY, userId]);

useEffect(() => {
  if (!userId) return;
  if (isRestoringRef.current) return;  // 跳过恢复中的那次写入
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ chats, currentChatId }));
}, [chats, currentChatId, STORAGE_KEY, userId]);
```

**防范措施**：
1. **读写解耦**：load 和 save 不应共用同一个 state 触发。load 用独立初始化路径，save 只响应用户操作。
2. **日志打在入口**：第一时间在 save effect 入口打日志，确认 `chats.length` 的值，不要在中间过程打。
3. **单测思维**：每个 effect 单独验证，load 后检查 save 是否被误触发。

---

### BUG-2026-04-17-002：侧边栏新建对话不显示

**现象**：发送第一条消息后，侧边栏不显示新对话，需要刷新页面。

**根因**：`pendingChatId` 状态被设为新建对话 ID，`visibleChats` 把当前对话过滤掉了。
```typescript
const visibleChats = useMemo(
  () => chats.filter((c) => c.id !== pendingChatId),
  [chats, pendingChatId]
);
```

**修复方案**：`pendingChatId` 全程移除，逻辑大幅简化。
- `createChat` 直接设置 `currentChatId`
- `visibleChats` 直接返回所有 chats
- `switchChat` 只做切换，不做 pending 清理

**防范措施**：状态命名要准确反映用途。"pending"本意是"标记待确认的空对话"，但实际用成了"当前聊天 ID 的副本"，名称误导导致逻辑混乱。

---

### BUG-2026-04-17-003：logout 后 remount 导致用户 key 被删

**根因**：`STORAGE_KEY` 在 `userId` 未完成 Auth 加载时是 `rag_chat_history_`（空字符串后缀）。mount effect 初始化时写入空 key，logout 时 remount 导致 `localStorage.removeItem('rag_chat_history_')` 删除了用户数据。

**修复方案**：
- mount effect 加 `!userId` 守卫，等 Auth 完成再初始化
- logout 时只重置 ref，不做 localStorage 操作
- 使用 `isRestoringRef` 防止恢复时覆盖

**防范措施**：`userId` 可能为 `undefined` 时，所有 localStorage 操作都要先检查是否存在用户，避免使用空字符串做 key。

---

### BUG-2026-04-16-001：RAG 模式调用错误 API

**现象**：开启 RAG 后没有检索文档内容，大模型回答没有引用标注。

**根因**：`useChat` 的 `handleSubmit` 中 `else if (useRAG)` 分支设置了 `requestBody` 但没有设置 `apiEndpoint`，导致沿用了 `/api/chat` 而不是 `/api/rag`。

**修复方案**：RAG 分支添加 `apiEndpoint = '/api/rag'`。

**防范措施**：条件分支中同时设置请求数据和方法名，避免只改一半。

---

## 开发日志

### 2026-04-21 React 模式修复 + 天气指数工具补全

#### 功能说明
修复 React 模式 Agent 工具不调用的问题，补全天气指数工具的 `type` 参数。

#### React 模式修复

**核心问题**：模型通过 `tool_calls` 返回了工具调用，但 prompt 让模型同时输出 ReAct 文本格式，导致代码只执行了 `tool_calls` 部分，text 解析完全没用到。过程中还因正则转义 bug、重复代码、cleanContent 不完整等问题绕了弯路。

**解决方案**：修改 REACT_SYSTEM_PROMPT，让模型知道"文本步骤只是展示，真正的工具调用要走 `tool_calls`"。删除冗余的文本解析逻辑，复用普通模式的 function calling 链路。

**涉及文件**：
- `app/api/agent/route.ts` — REACT_SYSTEM_PROMPT 重写，删除 parseToolCallsFromText 复杂逻辑，修复 cleanContent

#### 天气指数工具补全

**问题**：`get_weather_indices` 工具调用报错，LLM 传了 `type` 参数但 API 未调用。

**根因**：
- `definitions.ts`：工具描述中 `type` 是 optional，`required` 只含 `location`
- `weather.ts`：实际调用时未传递 `type` 参数给 API

**修复**：
- `definitions.ts`：将 `type` 加入 `required`，描述更新说明多类型用英文 `,` 分割
- `weather.ts`：调用 API 时实际传递 `type` 参数

**涉及文件**：
- `lib/tools/definitions.ts` — `type` 改为 required
- `lib/tools/weather.ts` — 传递 `type` 参数

---

### 2026-04-15 多用户隔离 + 上传索引重构

#### 功能说明
实现多用户 RAG 隔离、文件上传/索引分离、Toast 通知、Pinecone 删除幂等处理。

#### 核心改动

**1. 多用户隔离 `proxy.ts` + `lib/pinecone.ts`**
- `proxy.ts`：登录保护中间件，从 Supabase 获取 `user.id` 写入 `x-user-id` header
- Pinecone metadata 中存储 `userId` 字段，所有操作带 `userId` 过滤
- 删除 `lib/chunks-store.ts`，BM25 corpus 改为直接从 Pinecone metadata 查询

**2. 文件上传/索引分离**
- 上传后文档标记 `indexed: false`，需手动点击"索引"触发向量化
- 上传大小限制 25MB（`next.config.js` `proxyClientMaxBodySize`）
- pdfjs-dist legacy 替代 pdf-parse，解决 DOMMatrix Node.js 报错

**3. Toast 通知 `components/ui/toast.tsx`**
- Element Plus 风格：圆形图标 + 浅色背景 + 边框
- `showToast(message, 'success'|'error'|'info')` 全局调用
- 位置：顶部居中，带 slideIn 动画

**4. 删除幂等处理 `lib/pinecone.ts`**
- `deleteDocumentChunks`：先 fetch 查 ID，再 `deleteMany({ ids })`，避免纯 filter 400 报错
- 兜底 catch：404/400/"not found" 均当成功处理
- 不再依赖前端 `indexed` 状态，刷新后也能正确清理向量

#### 相关文件

| 文件 | 改动 |
|------|------|
| `proxy.ts` | 新增 - 认证中间件 |
| `lib/supabase.ts` | 新增 - Supabase 客户端 |
| `lib/pinecone.ts` | 改造 - userId 过滤 + 删除幂等 |
| `lib/chunks-store.ts` | 删除 - BM25 迁移至 Pinecone |
| `lib/search/hybrid-search.ts` | 改造 - 使用 Pinecone BM25 corpus |
| `hooks/use-document-index.ts` | 改造 - 索引分离 + Toast |
| `components/ui/toast.tsx` | 新增 - Toast 通知组件 |
| `app/api/upload/route.ts` | 改造 - 支持 25MB |
| `app/api/delete/route.ts` | 改造 - userId 过滤 |
| `app/api/delete-all/route.ts` | 新增 - 清空所有向量 |
| `next.config.js` | 改造 - `proxyClientMaxBodySize: 25mb` |
| `public/pdf.worker.mjs` | 新增 - pdfjs-dist legacy worker |

---

### 2026-04-13 多用户认证 + UI 全面优化

#### 功能说明
Supabase 多用户认证体系，登录注册页全面改版，Header 布局重组，移动端 toolbar 重构。

#### 核心改动

**1. Supabase 多用户认证 `components/auth/auth-context.tsx`**
- 支持 GitHub / Google OAuth + 邮箱密码注册登录
- `@supabase/ssr` Cookie 方案实现服务端/客户端 session 共享
- `signUp` 发送验证邮件（需在 Supabase Dashboard 配置 SMTP）
- `signInWithOAuth` 跳转 `/auth/callback` 处理 token

**2. 登录注册页 `app/login/page.tsx`**
- 登录/注册 Tab 高亮：选中态绿色渐变背景 + 白色文字 + 缩放动画
- 输入框实时校验：邮箱格式 + 密码长度，错误时红色边框 + 下方错误提示
- 提交按钮 hover 上浮 + 阴影增强，mousedown 下沉
- 第三方登录按钮 Google/GitHub hover 上浮 + 绿色边框
- 底部切换文字可点击，hover 显示绿色背景

**3. Auth Callback 页 `app/auth/callback/page.tsx`**
- 三态 UI：loading 旋转动画 / success 绿色对勾弹入 + 1.5s 跳转 / error 红色× + 返回按钮
- 处理完成自动跳转首页

**4. UserMenu `components/chat/header/user-menu.tsx`**
- PC 端：药丸形按钮（头像 + 用户名 + 下拉箭头），点击展开下拉菜单
- 移动端：圆形头像按钮，点击展开下拉菜单
- 下拉菜单：用户信息卡片（头像 + 名称 + 已认证徽章 + 邮箱）+ 设置入口 + 退出登录
- 退出登录：弹出 ConfirmModal 确认框，确认后跳转 `/login`
- PC 端下拉菜单内加设置入口

**5. Header 布局重组 `app/page.tsx`**
- 从右到左顺序：UserMenu → 设置 → 模型选择 → ModeTabs
- 移动端 Header：去掉 agent 模式 badge，加 ⚡ 设置按钮
- 移动端 header 不再受 `agent-mode` class 影响
- UserMenu 传入 `onSettingsClick` 控制设置弹窗

**6. ModeTabs 修复 `components/chat/header/mode-tabs.tsx` + `app/globals.css`**
- 修复 bug：切换回 chat 模式时 agent 状态未重置
- 选中态高亮：绿色渐变背景 + 白色文字 + boxShadow

**7. ChatInput 移动端 toolbar `components/chat/chat-input.tsx`**
- 6 个 SVG 图标按钮（上传/思考/联网/Agent/ReAct/设置）
- 气泡 tooltip：点击聚焦常驻，点击别处或再次点击消失
- 气泡绿色渐变背景 + 白色文字 + 三角箭头
- 选中图标变绿色，active 态绿色渐变背景

**8. 模型选择下拉框 `components/chat/header/model-select.tsx`**（新增）
- 自定义下拉组件，替代原生 `<select>`
- 选中项左侧绿色竖条 + 浅绿背景，右箭头旋转动画
- hover 展开选项描述，点击切换

**9. 退出登录确认 `components/chat/header/user-menu.tsx`**
- 点击退出 → ConfirmModal 弹窗（variant=danger）
- 确认后 `signOut()` → 跳转 `/login`

**10. 移动端设置 BottomSheet `components/chat/mobile-settings-sheet.tsx`**
- 底部上滑面板：深度思考/联网搜索/ReAct/Agent 模式 四个开关
- 移除 mode 判断，统一展示所有功能

#### 相关文件

| 文件 | 改动 |
|------|------|
| `components/auth/auth-context.tsx` | 新增 - Auth Context |
| `lib/supabase.ts` | 新增 - Supabase 客户端 |
| `app/auth/callback/page.tsx` | 新增 - OAuth 回调页 |
| `proxy.ts` | 新增 - 路由保护中间件 |
| `app/login/page.tsx` | 改造 - 登录注册页 |
| `app/page.tsx` | 改造 - Header 布局重组 |
| `components/chat/header/user-menu.tsx` | 改造 - 用户菜单 + 退出确认 |
| `components/chat/header/mode-tabs.tsx` | 改造 - ModeTabs 逻辑 |
| `components/chat/chat-input.tsx` | 改造 - 移动端 toolbar |
| `components/chat/header/model-select.tsx` | 新增 - 自定义模型下拉框 |
| `components/chat/mobile-settings-sheet.tsx` | 改造 - 移动端设置面板 |
| `components/chat/confirm-modal.tsx` | 改造 - 通用确认弹窗 |
| `app/globals.css` | 改造 - ModeTabs 高亮 + 移动端图标样式 |

---

### 2026-04-11 移动端 UI 交互优化

#### 功能说明
全面优化移动端输入体验，统一删除确认交互。

#### 核心改动

**1. 移动端输入框 `components/chat/chat-input.tsx`**
- ChatGPT 风格 textarea，自动扩展高度（44px-120px）
- 1000 字字符限制，超限输入被拦截
- 右上角字数计数器（`当前/1000`），接近上限变红
- 工具栏：上传、思考、联网、Agent、设置 5个图标按钮
- 图标 hover 显示 Tooltip 气泡提示（向上弹出）
- 胶囊形状发送按钮，渐变绿色背景

**2. 删除确认弹窗 `components/chat/confirm-modal.tsx`**
- 通用确认弹窗组件，支持 `danger`/`warning`/`info` 三种变体
- 模糊背景遮罩 + fadeIn/slideUp 动画
- 点击遮罩可关闭
- 替代原有的 `window.confirm()`

**3. 对话历史列表 `components/chat/sidebar/chat-history-list.tsx`**
- 重构为单行布局：标题+时间在左，删除按钮在右
- 删除按钮 SVG 图标，hover 显示红色背景
- 删除前弹出确认弹窗

**4. 文档列表 `components/chat/sidebar/document-list.tsx`**
- 迁移到通用 `ConfirmModal` 组件

**5. 设置模态框 `components/chat/settings-modal.tsx`**
- 清空对话、清空文档 改用 `ConfirmModal`
- 移除原生 `window.confirm()`

#### 验证测试
- [x] TypeScript 编译通过
- [x] 移动端输入框自动扩展高度
- [x] 1000 字限制生效
- [x] 工具栏 Tooltip 正常显示
- [x] 删除对话弹出确认弹窗
- [x] 删除文档弹出确认弹窗
- [x] 设置中清空操作弹出确认弹窗

#### 相关文件
| 文件 | 改动 |
|------|------|
| `components/chat/chat-input.tsx` | 改造 - ChatGPT 风格输入框 + Tooltip |
| `components/chat/confirm-modal.tsx` | 新增 - 通用确认弹窗 |
| `components/chat/sidebar/chat-history-list.tsx` | 改造 - 单行布局 + 删除确认 |
| `components/chat/sidebar/document-list.tsx` | 改造 - 使用 ConfirmModal |
| `components/chat/settings-modal.tsx` | 改造 - 使用 ConfirmModal |
| `components/chat/sidebar/delete-confirm-modal.tsx` | 删除 - 迁移到通用组件 |
| `app/globals.css` | 改造 - 移动端样式 + 弹窗样式 |

---

### 2026-04-10 ReAct 自我纠错实现 ⚠️ 代码完成但未接入

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

#### 问题总结

**现象**：查询"杭州天气"时，`get_weather` 工具收到参数为 `{}`

**根本原因**：OpenAI streaming 分块发送 `tool_calls`，但各字段不完整：

```
chunk#1: {"id":"call_xxx","type":"function","function":{"name":"get_weather","arguments":""}}
chunk#2: {"id":"call_xxx","type":"function","function":{"name":"","arguments":"{\"location\": \""}}
chunk#3: {"id":"","type":"function","function":{"arguments":"杭州\""}}}
chunk#4: finish_reason: tool_calls → stream 结束
```

**解决方案**：工具调用用非流式（保证完整），最终回答用流式（保证体验）

#### 验证测试
- [x] "杭州天气怎么样" → 直接返回天气 ✅
- [ ] "今天适合出游吗" → 应先查天气再回答
- [ ] "推荐几个好玩的地方" → **不应调用天气工具**

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

### 技术栈
- 前端：Next.js 16, React, TypeScript, Tailwind CSS
- 后端：Next.js API Routes
- 向量数据库：Pinecone
- LLM：OpenAI / 通义千问（支持 function calling）

---