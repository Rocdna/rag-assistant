'use client';

/**
 * 侧边栏 Tab 导航组件
 */

import { Tabs } from '@/components/ui/tabs';

interface SidebarTabNavProps {
  activeTab: 'conversations' | 'documents';
  onChange: (tab: 'conversations' | 'documents') => void;
}

export function SidebarTabNav({ activeTab, onChange }: SidebarTabNavProps) {
  return (
    <Tabs
      tabs={[
        { id: 'conversations', label: '对话', icon: '💬' },
        { id: 'documents', label: '文档', icon: '📚' },
      ]}
      activeTab={activeTab}
      onChange={(id) => onChange(id as 'conversations' | 'documents')}
      variant="sidebar"
    />
  );
}
