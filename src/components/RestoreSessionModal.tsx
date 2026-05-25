import { TIMER_MODE_CONFIG } from "../constants";
import type { PersistedSession } from "../types";
import { formatSeconds } from "../lib/timer";

type RestoreSessionModalProps = {
  session: PersistedSession;
  onDiscard: () => void;
  onRestore: () => void;
};

const phaseLabels: Record<PersistedSession["phase"], string> = {
  ritual: "仪式台",
  review: "复盘",
};

const statusLabels = {
  burning: "烧香中",
  completed: "已完成",
  idle: "未开始",
  resting: "休息中",
};

const formatDateTime = (value: string) => {
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const RestoreSessionModal = ({ session, onDiscard, onRestore }: RestoreSessionModalProps) => {
  const totalIncenseCount = session.intentSets.reduce((total, intentSet) => total + intentSet.incenseCount, 0);
  const completedIntentSetCount = session.intentSets.filter((intentSet) => intentSet.status === "completed").length;
  const isSessionComplete = completedIntentSetCount === session.intentSets.length && session.intentSets.length > 0;
  const activeIntentSetIndex = session.intentSets.findIndex(
    (intentSet) => intentSet.status === "burning" || intentSet.status === "resting",
  );
  const activeIntentSet = activeIntentSetIndex >= 0 ? session.intentSets[activeIntentSetIndex] : null;
  const modalText =
    session.activeModal?.type === "incense-finished"
      ? "等待选择休息或续香"
      : session.activeModal?.type === "rest-finished"
        ? "等待开始下一炷香"
        : "";

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="restore-modal-title">
        <p className="eyebrow">Saved Session</p>
        <h2 id="restore-modal-title">发现未保存的本轮仪式</h2>
        <p className="modal-copy">
          上次停在{phaseLabels[session.phase]}，共有 {session.intentSets.length} 套执行意图，保存于{" "}
          {formatDateTime(session.updatedAt)}。
        </p>

        <div className="restore-summary" aria-label="未完成轮次摘要">
          <span>阶段：{phaseLabels[session.phase]}</span>
          <span>模式：{TIMER_MODE_CONFIG[session.timerMode].label}</span>
          <span>进度：{completedIntentSetCount} / {session.intentSets.length} 套完成</span>
          <span>总香数：{totalIncenseCount} 炷</span>
          {activeIntentSet ? (
            <span>
              当前：第 {activeIntentSetIndex + 1} 套 · {statusLabels[activeIntentSet.status]} · 第{" "}
              {activeIntentSet.currentIncenseIndex} / {activeIntentSet.incenseCount} 炷 · 剩余{" "}
              {formatSeconds(session.timerRemaining)}
            </span>
          ) : (
            <span>
              {session.phase === "review"
                ? "当前：等待保存复盘"
                : isSessionComplete
                  ? "当前：本轮已完成，等待进入复盘"
                  : "当前：尚未开始倒计时"}
            </span>
          )}
          {modalText ? <span>提醒：{modalText}</span> : null}
        </div>

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onDiscard}>
            丢弃本轮
          </button>
          <button className="primary-button" type="button" onClick={onRestore}>
            恢复本轮
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestoreSessionModal;
