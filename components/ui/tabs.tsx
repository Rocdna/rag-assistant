'use client';

/**
 * Tabs 组件
 *
 * 功能：
 * - 标签页切换
 * - 支持多种样式变体
 */

import { useState } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'default' | 'sidebar';
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, variant = 'default', className = '' }: TabsProps) {
  const baseClass = variant === 'sidebar' ? 'sidebar-tab-nav' : 'mode-tabs';
  const tabClass = variant === 'sidebar' ? 'sidebar-tab' : 'mode-tab';

  return (
    <div className={`${baseClass} ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`${tabClass} ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => !tab.disabled && onChange(tab.id)}
          disabled={tab.disabled}
        >
          {tab.icon && <span className="mode-tab-icon">{tab.icon}</span>}
          <span className="mode-tab-label">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
