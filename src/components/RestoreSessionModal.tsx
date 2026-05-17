import type { PersistedSession } from "../types";

type RestoreSessionModalProps = {
  session: PersistedSession;
  onDiscard: () => void;
  onRestore: () => void;
};

const phaseLabels: Record<PersistedSession["phase"], string> = {
  ritual: "仪式台",
  review: "复盘",
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
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="restore-modal-title">
        <p className="eyebrow">Saved Session</p>
        <h2 id="restore-modal-title">发现未完成的本轮仪式</h2>
        <p className="modal-copy">
          上次停在{phaseLabels[session.phase]}，共有 {session.intentSets.length} 套执行意图，保存于{" "}
          {formatDateTime(session.updatedAt)}。
        </p>

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
