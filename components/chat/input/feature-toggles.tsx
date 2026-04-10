'use client';

/**
 * 输入区功能开关组件
 *
 * 功能：
 * - 根据模式显示不同的功能开关组合
 * - PC 端和移动端不同的展示方式
 */

import { FeatureToggle } from '@/components/ui/toggle';
import type { ChatMode } from '../header/mode-tabs';

interface FeatureTogglesProps {
  mode: ChatMode;
  thinking: boolean;
  onThinkingChange: (enabled: boolean) => void;
  webSearch: boolean;
  onWebSearchChange: (enabled: boolean) => void;
  queryExpansion: boolean;
  onQueryExpansionChange: (enabled: boolean) => void;
  agent: boolean;
  onAgentChange: (enabled: boolean) => void;
  react: boolean;
  onReactChange: (enabled: boolean) => void;
  isMobile?: boolean;
}

export function FeatureToggles({
  mode,
  thinking,
  onThinkingChange,
  webSearch,
  onWebSearchChange,
  queryExpansion,
  onQueryExpansionChange,
  agent,
  onAgentChange,
  react,
  onReactChange,
  isMobile = false,
}: FeatureTogglesProps) {
  const containerClass = isMobile ? 'mobile-action-row' : 'input-options-bar';

  if (mode === 'chat') {
    return (
      <div className={containerClass}>
        <FeatureToggle
          icon="🧠"
          label="思考"
          enabled={thinking}
          onChange={onThinkingChange}
        />
        <FeatureToggle
          icon="🔍"
          label="联网"
          enabled={webSearch}
          onChange={onWebSearchChange}
        />
        <FeatureToggle
          icon="✨"
          label="HyDE"
          enabled={queryExpansion}
          onChange={onQueryExpansionChange}
        />
        <FeatureToggle
          icon="🤖"
          label="Agent"
          enabled={agent}
          onChange={onAgentChange}
        />
        {/* ReAct 仅在 Agent 开启时显示 */}
        {agent && (
          <FeatureToggle
            icon="🔄"
            label="ReAct"
            enabled={react}
            onChange={onReactChange}
          />
        )}
      </div>
    );
  }

  // Agent 模式
  return (
    <div className={containerClass}>
      <FeatureToggle
        icon="🤖"
        label="Agent"
        enabled={agent}
        onChange={onAgentChange}
      />
      <FeatureToggle
        icon="🔄"
        label="ReAct"
        enabled={react}
        onChange={onReactChange}
        disabled={!agent}
      />
    </div>
  );
}
