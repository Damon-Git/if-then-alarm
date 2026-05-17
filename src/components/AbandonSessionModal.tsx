type AbandonSessionModalProps = {
  onCancel: () => void;
  onConfirm: () => void;
};

const AbandonSessionModal = ({ onCancel, onConfirm }: AbandonSessionModalProps) => {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="abandon-modal-title">
        <p className="eyebrow">Unsaved Session</p>
        <h2 id="abandon-modal-title">确定要放弃本轮吗？</h2>
        <p className="modal-copy">当前仪式进度和未保存复盘不会写入历史记录，放弃后将回到填写页。</p>

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            继续当前轮次
          </button>
          <button className="danger-button" type="button" onClick={onConfirm}>
            放弃本轮
          </button>
        </div>
      </div>
    </div>
  );
};

export default AbandonSessionModal;
