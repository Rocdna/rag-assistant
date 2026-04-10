'use client';

/**
 * Feature Toggle 组件
 *
 * 功能：
 * - 功能开关按钮
 * - 支持激活/未激活状态
 * - 可选禁用状态
 */

interface FeatureToggleProps {
  icon: string;
  label: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function FeatureToggle({
  icon,
  label,
  enabled,
  onChange,
  disabled = false,
}: FeatureToggleProps) {
  return (
    <button
      type="button"
      className={`feature-toggle ${enabled ? 'active' : ''}`}
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
    >
      <span className="feature-toggle-icon">{icon}</span>
      <span className="feature-toggle-label">{label}</span>
    </button>
  );
}
