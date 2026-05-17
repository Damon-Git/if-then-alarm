import type { ToastMessage } from "../types";

type ToastHostProps = {
  toasts: ToastMessage[];
  onDismiss: (toastId: string) => void;
};

const ToastHost = ({ toasts, onDismiss }: ToastHostProps) => {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-host" aria-live="polite" aria-label="通知">
      {toasts.map((toast) => (
        <div className={`toast toast--${toast.type}`} key={toast.id}>
          <span>{toast.message}</span>
          <button type="button" onClick={() => onDismiss(toast.id)} aria-label="关闭通知">
            关闭
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastHost;
