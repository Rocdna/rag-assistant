# RAG 本地知识库助手

基于 Next.js + RAG 的本地知识库问答助手，支持多轮对话、混合检索、深度思考和联网搜索。

## 功能

### 基础功能
- [x] 文件上传（PDF、TXT、DOCX、MD）
- [x] 文档解析与分块
- [x] 向量存储（Pinecone）
- [x] RAG 问答 + 流式响应
- [x] 历史对话保存（localStorage）
- [x] 移动端适配

### RAG 优化
- [x] **多轮对话** — 支持理解指代词（它、这个）
- [x] **混合检索** — BM25 + 向量检索 + RRF 融合
- [x] **HyDE** — 生成假设答案 + 快速验证修正
- [x] **引用标注** — `[文件名-序号]` 高亮来源

### LLM 增强
- [x] **深度思考** — 通义千问思考模式
- [x] **联网搜索** — 实时搜索互联网

### Agent 模式
- [x] **文档分析** — ReAct 推理 + 工具调用
- [x] **ReAct 流式输出** — 思考/行动/观察实时展示
- [x] **跨会话记忆** — LLM 智能抽取 + localStorage 持久化
- [x] **记忆压缩** — 对话过长自动摘要

## 技术栈

| 模块 | 技术 |
|------|------|
| 前端 | Next.js 16 + React + TypeScript |
| 样式 | Tailwind CSS + CSS Variables |
| 向量数据库 | Pinecone |
| Embedding / LLM | OpenAI / 通义千问 |
| 认证 | Supabase Auth |

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
│   ├── delete-all/route.ts # 清空所有文档
│   └── documents/route.ts  # Documents CRUD
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
│   ├── hybrid-search.ts
│   ├── hyde.ts
│   ├── bm25.ts
│   └── rrf.ts
├── parser/                  # 文档解析
│   ├── index.ts
│   ├── pdf.ts
│   ├── txt.ts
│   └── docx.ts
├── tools/                   # Agent 工具集
│   ├── documents.ts
│   ├── search.ts
│   ├── weather.ts
│   └── index.ts
├── agent/                   # Agent 核心
│   ├── evaluator.ts
│   └── self-correction.ts
├── memory/                  # 记忆系统
│   ├── user-memory.ts
│   └── index.ts
└── supabase.ts             # Supabase 客户端

hooks/
├── use-chat.ts             # 聊天状态管理
└── use-document-index.ts   # 文档上传/索引管理
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

## 快速开始

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
5. **提问**：输入问题，系统会检索相关文档片段后回答

## 核心流程

```
文档上传 → 解析 → 分块 → 双存储（Pinecone 向量 + 本地 chunks）
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
                    └─────────────┬─────────────┘
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

## Agent 工作流

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

## 待扩展功能

| 功能 | 说明 | 难度 |
|------|------|------|
| **重排序 (Reranking)** | Cross-Encoder 或 Cohere 精排 | ⭐⭐⭐ |
| **MMR 多样性检索** | Maximal Marginal Relevance | ⭐⭐ |
| **子查询分解** | 复杂问题拆分并行检索 | ⭐⭐⭐ |
| **表格提取** | PDF 表格还原为结构化文本 | ⭐⭐⭐ |
| **图片 OCR** | 识别图片中的文字内容 | ⭐⭐ |

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


# 角色
你是一个全栈项目开发专家，请按照以下流程帮我完成项目：

# 流程
1. 需求分析 - 先理解我要做什么
2. 方案设计 - 给出技术方案，等我确认
3. 开发编码 - 按方案写代码
4. 测试验证 - 帮我验证功能
5. 问题修复 - 解决遇到的错误
6. 功能扩展 - 逐步添加新功能
7. 部署上线 - 协助部署到生产环境
8. 持续优化 - 上线后给出优化建议

# 当前阶段
我目前处于第 X 阶段，具体需求是：...
