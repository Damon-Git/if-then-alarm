import type { ActiveModal, IntentSet } from "../types";

type BreakModalProps = {
  modal: ActiveModal;
  intentSet: IntentSet;
  onStartBreak: (intentSetId: string) => void;
  onContinueNow: (intentSetId: string) => void;
};

const BreakModal = ({ modal, intentSet, onStartBreak, onContinueNow }: BreakModalProps) => {
  const isRestFinished = modal.type === "rest-finished";

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="break-modal-title">
        <p className="eyebrow">{intentSet.situationIntent}</p>
        <h2 id="break-modal-title">
          {isRestFinished ? "休息结束，是否继续下一炷香？" : "这一炷香已经烧完。"}
        </h2>

        <div className="modal-actions">
          {isRestFinished ? (
            <button className="primary-button" type="button" onClick={() => onContinueNow(intentSet.id)}>
              开始下一炷香
            </button>
          ) : (
            <>
              <button className="secondary-button" type="button" onClick={() => onStartBreak(intentSet.id)}>
                休息 5 分钟
              </button>
              <button className="primary-button" type="button" onClick={() => onContinueNow(intentSet.id)}>
                立刻续香
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BreakModal;
