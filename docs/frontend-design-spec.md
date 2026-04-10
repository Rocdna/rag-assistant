# RAG 知识库助手 - 前端设计规范

## 1. Concept & Vision

**产品定位**：垂直领域的 RAG 知识库问答助手，核心用户是需要从本地文档中快速获取信息的知识工作者。

**设计理念**：**Terminal Luxe** — 将命令行的高效感与现代界面的精致感融合。像一个为工程师设计的高档工具：黑色背景、精确的绿色高亮、模块化的信息层级。没有多余的装饰，但每一处细节都经过打磨。

**差异化记忆点**：
- 深色主题 + 绿色主色调（科技感 + 生命力）
- 所有功能模块有清晰的信息层级：主操作 → 场景切换 → 参数配置
- Agent 模式有独特的视觉身份，与普通对话模式明显区分

---

## 2. Design Language

### Aesthetic Direction
**Terminal Luxe** — 深色背景下的精密感。灵感来源：VS Code Dark+ 主题 × Linear App 的界面层级 × 终端的纯粹高效。

### Color Palette
```css
/* 核心变量 */
--bg-primary: #0D0D0D;          /* 主背景：接近纯黑，少许温暖 */
--bg-secondary: #141414;         /* 次级背景：卡片/面板 */
--bg-tertiary: #1C1C1C;         /* 三级背景：hover/选中态 */
--bg-elevated: #232323;         /* 浮层/模态框背景 */

--border-subtle: #2A2A2A;       /* 微妙边框 */
--border-default: #333333;       /* 默认边框 */
--border-strong: #444444;        /* 强调边框 */

--text-primary: #F5F5F5;        /* 主要文字 */
--text-secondary: #8A8A8A;       /* 次要文字 */
--text-tertiary: #5C5C5C;       /* 禁用/占位文字 */

--accent-green: #10B981;         /* 主强调色：翡翠绿 */
--accent-green-dim: #059669;     /* 强调色暗调 */
--accent-green-glow: rgba(16, 185, 129, 0.15); /* 辉光效果 */
--accent-green-subtle: rgba(16, 185, 129, 0.08); /* 极淡强调 */

--accent-blue: #3B82F6;         /* 信息色 */
--accent-amber: #F59E0B;        /* 警告色 */
--accent-red: #EF4444;          /* 错误/危险色 */

/* Agent 模式专属 */
--agent-bg: #0A2E1F;            /* Agent 模式背景 */
--agent-border: #10B981;        /* Agent 模式边框 */
--agent-glow: rgba(16, 185, 129, 0.2);
```

### Typography
```css
/* Display Font */
font-family: 'JetBrains Mono', 'Fira Code', monospace;

/* Body Font */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* 字号系统 */
--text-xs: 11px;     /* 标签/徽章 */
--text-sm: 13px;     /* 次要文字/按钮 */
--text-base: 15px;   /* 正文 */
--text-lg: 17px;     /* 标题 */
--text-xl: 20px;     /* 大标题 */
--text-2xl: 24px;    /* 页面标题 */
```

### Spatial System
```css
/* 间距 */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;

/* 圆角 */
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-full: 9999px;
```

### Motion Philosophy
- **入场动画**：fade-in + subtle translateY(8px)，300ms ease-out
- **Hover 反馈**：80ms 过渡，scale(1.02) 或边框高亮
- **Tab 切换**：滑动指示器，200ms ease-in-out
- **模态框**：backdrop blur + scale from 0.95，250ms
- **消息出现**：slide-in from bottom，150ms，stagger 50ms

### Visual Assets
- **图标**：Lucide React（线性风格，stroke-width: 1.5）
- **装饰**：subtle noise texture overlay on backgrounds
- **头像**：渐变圆角矩形，非照片风格

---

## 3. Layout & Structure

### 信息层级（三层架构）

```
┌──────────────────────────────────────────────────────────────┐
│  LAYER 1: Header (56px)                                       │
│  ┌──────┬──────────────────────────────┬─────────────────┐  │
│  │ Logo │ Mode Tabs [对话|Agent|探索]   │ Settings ⚙️     │  │
│  └──────┴──────────────────────────────┴─────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│  LAYER 2: Context Bar (按模式显示, 40-48px)                   │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ [RAG 🔘] [文档选择 ▼]    [思考] [联网] [HyDE]        │    │
│  └──────────────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────────┤
│  LAYER 3: Main Content (flex-1)                              │
│                                                              │
│  ┌─────────┬────────────────────────────────────────────┐    │
│  │ Sidebar │  Message Area                              │    │
│  │ (280px) │                                            │    │
│  │          │  ┌────────────────────────────────────┐  │    │
│  │ [Tab]   │  │ User Message                         │  │    │
│  │ 对话/文档│  └────────────────────────────────────┘  │    │
│  │          │  ┌────────────────────────────────────┐  │    │
│  │ [List]  │  │ Assistant Response                  │  │    │
│  │         │  └────────────────────────────────────┘  │    │
│  └─────────┴────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────────┤
│  LAYER 4: Input Area (auto-height, max 200px)                │
│  ┌────────────────────────────────────────────┬──────────┐  │
│  │ [📎] [Multi-line Input                    ] [Send]  │  │
│  └────────────────────────────────────────────┴──────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Responsive Strategy
- **Desktop (≥1024px)**：完整三栏布局，侧边栏常驻
- **Tablet (768-1023px)**：侧边栏可折叠，overlay 显示
- **Mobile (<768px)**：侧边栏 drawer 模式，Header 压缩为 48px，Context Bar 隐藏（收入设置菜单）

### Visual Pacing
- Header 和 Context Bar 使用 `--bg-secondary`，与主背景形成微妙分层
- 侧边栏使用 `--bg-secondary` + 右侧细边框
- 消息区域使用纯 `--bg-primary`，留出呼吸感
- 输入区域使用 `--bg-secondary` + 上边框

---

## 4. Features & Interactions

### 4.1 Header - Mode Tabs

**三模式标签页**：
| Tab | 图标 | 激活条件 | 视觉 |
|-----|------|---------|------|
| 对话 | MessageSquare | 默认激活 | 文字 + 激活下划线 |
| Agent | Bot | Agent 开关开启 | 绿色边框 + Bot 图标 |
| 探索 | Compass | （预留） | 灰色 |

**行为**：
- 点击切换模式
- 切换时 Context Bar 内容随模式变化
- Agent 模式下 Header 背景变为 `--agent-bg`，边框变为 `--agent-border`

### 4.2 Context Bar

**对话模式配置**：
```
┌─────────────────────────────────────────────────────────┐
│ [RAG 开关] [文档选择 ▼]    ···分隔线···   [🧠 思考] [🔍 联网] [✨ HyDE] │
└─────────────────────────────────────────────────────────┘
```

**Agent 模式配置**：
```
┌─────────────────────────────────────────────────────────┐
│ [🤖 Agent] [ReAct] [🔄 自我纠错]   ···分隔线···   [📊 调试面板] │
└─────────────────────────────────────────────────────────┘
```

**交互**：
- 每个开关 hover 时有 subtle glow 效果
- 点击时有 scale(0.98) 的按压反馈
- 开关状态变化时，label 文字颜色变化

### 4.3 Sidebar - Tabbed Navigation

**两个 Tab**：
| Tab | 内容 |
|-----|------|
| 💬 对话 | 对话历史列表 |
| 📚 文档 | 文档列表 + 索引状态 |

**对话列表项**：
```
┌────────────────────────────────────┐
│ 💬 对话标题（截断显示）              │
│ 最后一条消息预览...    3分钟前      │
└────────────────────────────────────┘
```
- Hover：背景变为 `--bg-tertiary`
- Active：左侧 2px 绿色边框 + 背景 `--bg-tertiary`
- 删除：hover 显示删除图标，点击弹出确认

**文档列表项**：
```
┌────────────────────────────────────┐
│ 📄 文档名称.pdf              [索引] │
│ 2.3MB · 128 chunks · 已索引       │
└────────────────────────────────────┘
```
- 未索引状态：灰色索引按钮
- 索引中：进度条 + 百分比
- 已索引：绿色勾选
- Hover：显示删除图标

### 4.4 Message List

**空状态（无文档）**：
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              🤖 RAG 知识库助手                           │
│                                                         │
│     ┌─────────────────────────────────────────────┐     │
│     │ 💡 "帮我总结这篇文档的核心观点"              │     │
│     └─────────────────────────────────────────────┘     │
│     ┌─────────────────────────────────────────────┐     │
│     │ 💡 "对比这两篇文章的分析方法有什么不同"       │     │
│     └─────────────────────────────────────────────┘     │
│                                                         │
│            📎 点击上传或拖拽文件至此处                    │
│              支持 PDF、TXT、DOCX、MD                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**空状态（有文档）**：
```
┌─────────────────────────────────────────────────────────┐
│              🤖 准备好了                                  │
│                                                         │
│     ┌─────────────────────────────────────────────┐     │
│     │ 💡 基于 [文档名称] 问我任何问题              │     │
│     └─────────────────────────────────────────────┘     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**消息气泡**：
- User：右对齐，绿色背景，白色文字
- Assistant：左对齐，深灰背景，浅色文字
- System/思考过程：左对齐，更深的背景 + 缩进 + 斜体

**Agent ReAct 消息**：
```
┌─────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 💭 思考                                              │ │
│ │ 用户想知道杭州的天气，我需要调用天气工具               │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ 🎯 行动                                              │ │
│ │ → get_weather({"location": "杭州"})                 │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ 👁️ 观察                                              │ │
│ │ 杭州今天晴朗，气温28℃                                │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ 杭州今天天气晴朗，气温28℃，适合外出活动。                │
└─────────────────────────────────────────────────────────┘
```

### 4.5 Input Area

**布局**：
```
┌────────────────────────────────────────┬────────────────┐
│ 📎 │                                     │                │
│    │ 输入你的问题...                      │    发送 / 停止  │
│    │                                     │    (48px高)   │
└───┴─────────────────────────────────────┴────────────────┘
```

**多行输入**：
- 自动扩张，1-6 行
- 超过 6 行时固定高度，内部滚动
- Shift+Enter 换行，Enter 发送

**发送按钮状态**：
- Default：绿色背景 + 白色箭头
- Loading：显示停止图标 + 脉冲动画
- Disabled（空输入）：半透明

---

## 5. Component Inventory

### ModeTab
```typescript
interface ModeTabProps {
  mode: 'chat' | 'agent';
  isActive: boolean;
  onClick: () => void;
}
```
- Default：文字 `--text-secondary`
- Hover：文字 `--text-primary`
- Active：文字 `--accent-green` + 底部 2px 绿色指示器

### FeatureToggle
```typescript
interface FeatureToggleProps {
  icon: string;
  label: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}
```
- Default：背景 `--bg-primary`，边框 `--border-default`
- Hover：边框 `--border-strong`
- Active：背景 `--accent-green-subtle`，边框 `--accent-green`

### ConversationListItem
```typescript
interface ConversationListItemProps {
  title: string;
  preview: string;
  timestamp: string;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}
```

### DocumentListItem
```typescript
interface DocumentListItemProps {
  name: string;
  size: string;
  chunkCount: number;
  status: 'pending' | 'indexing' | 'indexed';
  progress?: number;
  onIndex: () => void;
  onDelete: () => void;
}
```

### MessageBubble
```typescript
interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
}
```

### ReActStep
```typescript
interface ReActStepProps {
  type: 'thought' | 'action' | 'observation';
  content: string;
}
```

### EmptyState
```typescript
interface EmptyStateProps {
  mode: 'no-doc' | 'has-doc';
  onUpload: () => void;
  suggestions?: string[];
}
```

---

## 6. Technical Approach

### Framework
- **Next.js 16** + React 18 + TypeScript
- **Tailwind CSS** + CSS Variables（用于主题）
- **Lucide React** 作为图标库

### Component Architecture
```
components/
├── chat/
│   ├── header/
│   │   ├── mode-tabs.tsx
│   │   └── header.tsx
│   ├── sidebar/
│   │   ├── tab-nav.tsx
│   │   ├── conversation-list.tsx
│   │   ├── document-list.tsx
│   │   └── sidebar.tsx
│   ├── message/
│   │   ├── message-list.tsx
│   │   ├── message-bubble.tsx
│   │   ├── react-steps.tsx
│   │   └── empty-state.tsx
│   ├── input/
│   │   ├── chat-input.tsx
│   │   └── feature-toggles.tsx
│   └── modals/
│       └── settings-modal.tsx
├── ui/
│   ├── button.tsx
│   ├── input.tsx
│   ├── tabs.tsx
│   ├── toggle.tsx
│   └── tooltip.tsx
└── layout/
    └── app-layout.tsx
```

### CSS Strategy
- 保留现有 CSS Variables，新增语义化变量
- 新增组件样式使用 Tailwind 原子类
- 复杂动画使用 CSS keyframes
- 响应式断点：`md:768px` `lg:1024px`

### Mobile Adaptation
- Sidebar 改为 drawer（通过 transform: translateX）
- Header 简化为：Logo + 菜单按钮 + 设置按钮
- Context Bar 收入 Settings Modal 中的一个 Section
- 移动端功能开关使用 Bottom Sheet 选择器

---

## 7. Implementation Priority

### Phase 1: 核心布局（不影响现有功能）
1. 新增 CSS Variables（向后兼容）
2. Header 重构（Mode Tabs）
3. Context Bar 新增（可隐藏，不影响现有逻辑）

### Phase 2: Sidebar 增强
4. Sidebar Tab 化
5. 对话列表 UI 优化
6. 文档列表 UI 优化

### Phase 3: Input & Messages
7. Input Area 功能开关分组
8. 空状态改版
9. ReAct 步骤样式增强

### Phase 4: Mobile & Polish
10. 移动端适配
11. 动画细节打磨
12. 微交互优化

---

## 8. Constraints & Non-Goals

**Constraints**:
- 必须保持所有现有 API 兼容性
- 移动端体验不能降级
- 不能破坏现有的 localStorage 数据结构
- 主题色必须兼容深色模式（目前只有深色）

**Non-Goals（本轮不涉及）**:
- 主题切换（亮色模式）
- 多语言支持
- 国际化
- 自定义字体加载（保持系统字体栈）
