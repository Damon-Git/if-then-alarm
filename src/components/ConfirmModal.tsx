type ConfirmModalVariant = "danger" | "default";

type ConfirmModalProps = {
  cancelLabel?: string;
  cancelVariant?: ConfirmModalVariant;
  confirmLabel: string;
  description: string;
  eyebrow?: string;
  onCancel: () => void;
  onConfirm: () => void;
  onDismiss?: () => void;
  title: string;
  variant?: ConfirmModalVariant;
};

const ConfirmModal = ({
  cancelLabel = "取消",
  cancelVariant = "default",
  confirmLabel,
  description,
  eyebrow = "Confirm",
  onCancel,
  onConfirm,
  onDismiss,
  title,
  variant = "default",
}: ConfirmModalProps) => {
  const cancelButtonClass = cancelVariant === "danger" ? "danger-button" : "secondary-button";
  const confirmButtonClass = variant === "danger" ? "danger-button" : "primary-button";

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
        {onDismiss ? (
          <button className="modal-close-button" type="button" aria-label="关闭弹窗" onClick={onDismiss}>
            ×
          </button>
        ) : null}
        <p className="eyebrow">{eyebrow}</p>
        <h2 id="confirm-modal-title">{title}</h2>
        <p className="modal-copy">{description}</p>

        <div className="modal-actions">
          <button className={cancelButtonClass} type="button" onClick={onCancel}>
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
