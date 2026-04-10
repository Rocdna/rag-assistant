'use client';

import { Button } from '@/components/ui/button';

interface OptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  queryExpansion: boolean;
  onQueryExpansionChange: (enabled: boolean) => void;
  thinking?: boolean;
  onThinkingChange?: (enabled: boolean) => void;
  webSearch?: boolean;
  onWebSearchChange?: (enabled: boolean) => void;
}

/**
 * 检索优化选项弹窗
 *
 * 功能：
 * - Query 扩展（HyDE）开关
 * - 深度思考（Thinking）开关
 * - 联网搜索（Web Search）开关
 */
export function OptimizationModal({
  isOpen,
  onClose,
  queryExpansion,
  onQueryExpansionChange,
  thinking = false,
  onThinkingChange,
  webSearch = false,
  onWebSearchChange,
}: OptimizationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content optimization-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">检索优化</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Query 扩展 */}
          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Query 扩展 (HyDE)</label>
              <p className="setting-desc">
                启用后，系统会先生成假设答案再检索，提升检索精度，但会增加 Token 消耗。
              </p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={queryExpansion}
                onChange={(e) => onQueryExpansionChange(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {/* 深度思考 */}
          {onThinkingChange && (
            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">深度思考 (Thinking)</label>
                <p className="setting-desc">
                  启用后，模型会先进行推理思考再回答，提升回答质量，但会增加响应时间。
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={thinking}
                  onChange={(e) => onThinkingChange(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          )}

          {/* 联网搜索 */}
          {onWebSearchChange && (
            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">联网搜索 (Web Search)</label>
                <p className="setting-desc">
                  启用后，模型可以搜索互联网获取实时信息，适合问当前事件或最新资讯。
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={webSearch}
                  onChange={(e) => onWebSearchChange(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          )}

          <div className="optimization-info">
            <h4>功能说明</h4>
            <ul>
              <li><strong>HyDE</strong>：检索优化，适合复杂问题</li>
              {onThinkingChange && <li><strong>深度思考</strong>：推理增强，适合数学/逻辑问题</li>}
              {onWebSearchChange && <li><strong>联网搜索</strong>：实时信息，适合新闻/数据查询</li>}
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </div>
  );
}
