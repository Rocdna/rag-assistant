'use client';

/**
 * Header Mode Tabs 组件
 *
 * 功能：
 * - 模式切换标签页（对话/Agent）
 * - Agent 模式有特殊的视觉样式
 */

import { Tabs } from '@/components/ui/tabs';

export type ChatMode = 'chat' | 'agent';

interface ModeTabsProps {
  activeMode: ChatMode;
  onChange: (mode: ChatMode) => void;
}

export function ModeTabs({ activeMode, onChange }: ModeTabsProps) {
  const handleChange = (id: string) => {
    if (id === 'chat' || id === 'agent') {
      onChange(id);
    }
  };

  return (
    <Tabs
      tabs={[
        { id: 'chat', label: '对话', icon: '💬' },
        { id: 'agent', label: 'Agent', icon: '🤖' },
      ]}
      activeTab={activeMode}
      onChange={handleChange}
    />
  );
}
