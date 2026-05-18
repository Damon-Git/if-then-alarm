type ConfirmModalVariant = "danger" | "default";

type ConfirmModalProps = {
  cancelLabel?: string;
  confirmLabel: string;
  description: string;
  eyebrow?: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  variant?: ConfirmModalVariant;
};

const ConfirmModal = ({
  cancelLabel = "取消",
  confirmLabel,
  description,
  eyebrow = "Confirm",
  onCancel,
  onConfirm,
  title,
  variant = "default",
}: ConfirmModalProps) => {
  const confirmButtonClass = variant === "danger" ? "danger-button" : "primary-button";

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
        <p className="eyebrow">{eyebrow}</p>
        <h2 id="confirm-modal-title">{title}</h2>
        <p className="modal-copy">{description}</p>

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={confirmButtonClass} type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
