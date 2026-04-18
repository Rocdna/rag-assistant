Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

# 代码格式规范

## 注释规范

### 文件头部注释

每个文件顶部添加说明注释：

```typescript
/**
 * 文件用途说明
 *
 * 功能描述：
 * - 功能点1
 * - 功能点2
 */
```

### 函数/方法注释

使用 JSDoc 风格，重要参数和返回值必须说明：

```typescript
/**
 * 添加文档块到向量数据库
 *
 * @param chunks 文本块数组
 * @param documentId 文档ID
 * @param documentName 文档名称
 * @returns 添加的块数量
 */
async function addDocumentChunks(chunks: string[], documentId: string, documentName: string): Promise<number> {
  // 实现
}
```

### 关键逻辑注释

- 复杂业务逻辑必须添加注释说明
- 非显而易见的代码需要解释"为什么"
- 禁止无意义的注释（如 `// i++`）

```typescript
// ✅ 正确：说明为什么
// 转换距离为相似度分数（ChromaDB 返回的是欧氏距离，越小越相似）
score: 1 - (distances[i] || 0),

// ❌ 错误：无意义注释
// 距离减一
score: 1 - distances[i],
```

### 注释原则

| 情况 | 是否注释 |
|------|---------|
| 文件用途、主要功能 | ✅ 必须 |
| 公开函数/导出的函数 | ✅ 必须 |
| 复杂业务逻辑 | ✅ 必须 |
| 简单的 getter/setter | ❌ 不需要 |
| 显而易见的代码 | ❌ 禁止（噪音） |
| 已过期/失效的代码 | ❌ 删除，不要留注释 |

- **组件文件**: `kebab-case` (如 `chat-input.tsx`, `message-list.tsx`)
- **工具函数文件**: `kebab-case` (如 `use-chat.ts`, `pinecone.ts`)
- **类型定义文件**: `kebab-case` (如 `chat.ts`)

## TypeScript 规范

### 接口和类型

```typescript
// interfaces 使用 PascalCase
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: number; // 可选字段用 ?
}
```

### 组件 Props

```typescript
interface ChatInputProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent) => void | Promise<void>;
  isLoading?: boolean;
}
```

## React 组件规范

### 组件结构

```tsx
'use client';  // 客户端组件必须添加

import { useRef } from 'react';
import { Button } from '@/components/ui/button';

interface ComponentNameProps {
  // props 定义
}

export function ComponentName({ prop1, prop2 }: ComponentNameProps) {
  return (
    <div className="...">
      {/* JSX */}
    </div>
  );
}
```

### 导出方式

- 使用 **具名导出** (Named Export)
- 组件名使用 **PascalCase**
- 文件名使用 **kebab-case**

## Tailwind CSS 规范

### 类名合并

使用 `cn()` 工具函数合并类名：

```typescript
import { cn } from '@/lib/utils';

className={cn(
  'base-classes',
  'hover:bg-[var(--accent-hover)]',
  condition && 'conditional-class'
)}
```

### CSS Variables

与 Tailwind 混合使用：

```tsx
className="bg-[var(--bg-primary)] text-[var(--text-primary)] border-[var(--border-color)]"
```

## 目录结构

```
components/
├── chat/      # 聊天相关组件
└── ui/       # 基础 UI 组件

lib/
├── utils.ts           # 通用工具
├── pinecone.ts       # Pinecone 向量数据库
├── chunker.ts         # 文本分块
└── parser/            # 文档解析

hooks/     # 自定义 React Hooks
types/     # TypeScript 类型定义
```

## Git 提交规范

```
commit: 提交信息使用中文
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式（不影响功能）
refactor: 重构
test: 测试
chore: 构建/工具
```

## Import 排序

按以下顺序排列，禁止随意混放：

```typescript
// 1. React / Next.js 内置
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. 第三方库
import { useChat } from 'ai/react';
import { nanoid } from 'nanoid';

// 3. @/ 别名导入（项目自己的）
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// 4. 相对导入
import { ChatMessage } from './chat';
import { parser } from '../lib/parser';
```

## TypeScript 规范

### 禁止使用 any

```typescript
// ❌ 禁止
function handleData(data: any) { ... }

// ✅ 使用 unknown
function handleData(data: unknown) {
  if (typeof data === 'string') { ... }
}

// ✅ 或使用具体类型
function handleData(data: ChatMessage) { ... }
```

### 函数返回值显式声明

```typescript
// ❌ 隐式返回
function getUser() {
  return { id: '1', name: 'Tom' };
}

// ✅ 显式声明
function getUser(): { id: string; name: string } {
  return { id: '1', name: 'Tom' };
}
```

### 启用 strict 模式

确保 `tsconfig.json` 开启：

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

## API 路由规范

### 请求方法

- `GET` - 查询
- `POST` - 创建
- `PUT/PATCH` - 更新
- `DELETE` - 删除

### 错误响应格式

统一使用 `{ error: string }` 格式：

```typescript
// ✅ 正确
return Response.json({ error: '问题不能为空' }, { status: 400 });
return Response.json({ error: '服务器内部错误' }, { status: 500 });

// ❌ 错误
return Response.json({ message: '错误' });
return Response.json('错误信息');
```

### 状态码

| 场景 | 状态码 |
|------|--------|
| 成功 | 200 |
| 参数错误 | 400 |
| 未认证 | 401 |
| 无权限 | 403 |
| 资源不存在 | 404 |
| 服务器错误 | 500 |

