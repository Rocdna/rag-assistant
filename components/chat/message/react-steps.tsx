'use client';

/**
 * ReAct 步骤展示组件
 *
 * 功能：
 * - 展示思考(thought)、行动(action)、观察(observation) 步骤
 * - 视觉上用不同颜色区分
 */

interface Step {
  type: 'thought' | 'action' | 'observation';
  content: string;
}

interface ReActStepsProps {
  steps: Step[];
}

const STEP_CONFIG = {
  thought: {
    icon: '💭',
    label: '思考',
  },
  action: {
    icon: '🎯',
    label: '行动',
  },
  observation: {
    icon: '👁️',
    label: '观察',
  },
};

export function ReActSteps({ steps }: ReActStepsProps) {
  return (
    <div className="react-steps-container">
      {steps.map((step, index) => {
        const config = STEP_CONFIG[step.type];
        const isActionCall = step.type === 'action' && step.content.startsWith('→');

        return (
          <div key={index} className={`react-step ${step.type}`}>
            <div className="react-step-header">
              <span className="react-step-icon">{config.icon}</span>
              <span className="react-step-label">{config.label}</span>
            </div>
            {isActionCall ? (
              <div className="react-step-action-call">{step.content}</div>
            ) : (
              <div className="react-step-content">{step.content}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
