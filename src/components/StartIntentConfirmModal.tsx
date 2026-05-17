import { TIMER_MODE_CONFIG } from "../constants";
import { formatDurationLabel } from "../lib/timer";
import type { IntentSet, TimerMode } from "../types";

type StartIntentConfirmModalProps = {
  intentSet: IntentSet;
  timerMode: TimerMode;
  onCancel: () => void;
  onConfirm: () => void;
};

const StartIntentConfirmModal = ({
  intentSet,
  timerMode,
  onCancel,
  onConfirm,
}: StartIntentConfirmModalProps) => {
  const timerConfig = TIMER_MODE_CONFIG[timerMode];

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-panel modal-panel--wide" role="dialog" aria-modal="true" aria-labelledby="start-modal-title">
        <p className="eyebrow">Start Intent</p>
        <h2 id="start-modal-title">确认开始这一套？</h2>

        <div className="confirm-intent-summary">
          <span>{timerConfig.label}</span>
          <span>专注 {formatDurationLabel(timerConfig.focusSeconds)}</span>
          <span>休息 {formatDurationLabel(timerConfig.breakSeconds)}</span>
          <span>{intentSet.incenseCount} 炷香</span>
        </div>

        <div className="confirm-intent-body">
          <div>
            <span className="detail-label">情境性执行意图</span>
            <p>{intentSet.situationIntent}</p>
          </div>

          <div>
            <span className="detail-label">预防性执行意图</span>
            {intentSet.preventionIntents.length > 0 ? (
              <ul>
                {intentSet.preventionIntents.map((preventionIntent, index) => (
                  <li key={`${intentSet.id}-${index}`}>{preventionIntent}</li>
                ))}
              </ul>
            ) : (
              <p className="muted-text">暂无预防性符箓</p>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            取消
          </button>
          <button className="primary-button" type="button" onClick={onConfirm}>
            开始这一套
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartIntentConfirmModal;
