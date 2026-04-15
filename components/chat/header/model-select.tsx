'use client';

import { useState, useRef, useEffect } from 'react';

interface ModelOption {
  value: string;
  label: string;
  desc: string;
}

const models: ModelOption[] = [
  { value: 'qwen3-max', label: 'Qwen3 Max', desc: '最强 Qwen 模型，适合复杂推理和长文本理解' },
  { value: 'qwen3-max-preview', label: 'Qwen3 Max Preview', desc: 'Qwen3 Max 预览版，提前体验新能力' },
  { value: 'qwen3.6-plus', label: 'Qwen3.6 Plus', desc: '高性价比全能模型，兼顾速度与效果' },
  { value: 'qwen-math-turbo', label: 'Qwen Math Turbo', desc: '专注数学和逻辑推理，优化加速版本' },
  { value: 'glm-5', label: 'GLM-5', desc: 'GLM-5 模型，支持多场景任务' },
];

interface ModelSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function ModelSelect({ value, onChange }: ModelSelectProps) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const current = models.find(m => m.value === value) || models[0];
  const display = current.label;

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* 触发按钮 */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="model-select"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 32px 8px 12px',
          backgroundColor: 'var(--bg-primary)',
          border: `1px solid ${open ? 'var(--accent-green)' : 'var(--border-default)'}`,
          borderRadius: '10px',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'all 0.2s ease',
          boxShadow: open ? '0 0 0 3px rgba(16, 163, 127, 0.15)' : 'none',
          backgroundImage: 'none',
        }}
      >
        <span style={{ color: 'var(--accent-green)', fontWeight: 600, fontSize: '11px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
            <circle cx="12" cy="12" r="10"/>
          </svg>
        </span>
        {display}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: `translateY(-50%) rotate(${open ? '180deg' : '0deg'})`,
            transition: 'transform 0.2s ease',
            color: 'var(--text-tertiary)',
          }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* 下拉菜单 */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            minWidth: '280px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
            borderRadius: '14px',
            padding: '8px',
            zIndex: 300,
            boxShadow: '0 12px 40px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05)',
            animation: 'dropdownFadeIn 0.15s ease',
            backdropFilter: 'blur(10px)',
          }}
        >
          {models.map((model) => (
            <button
              key={model.value}
              type="button"
              onClick={() => { onChange(model.value); setOpen(false); }}
              onMouseEnter={() => setHovered(model.value)}
              onMouseLeave={() => setHovered(null)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: 'none',
                borderRadius: '8px',
                background: model.value === value
                  ? 'linear-gradient(135deg, rgba(16, 163, 127, 0.15) 0%, rgba(13, 150, 105, 0.08) 100%)'
                  : hovered === model.value
                  ? 'var(--bg-hover)'
                  : 'transparent',
                color: model.value === value ? 'var(--accent-green)' : 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                transition: 'all 0.15s ease',
                borderLeft: model.value === value ? '3px solid var(--accent-green)' : '3px solid transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: model.value === value ? 600 : 500 }}>
                  {model.label}
                </span>
                {model.value === value && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 400 }}>
                {hovered === model.value ? model.desc : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
