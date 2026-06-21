import { PropsWithChildren } from "react";
import { Icon } from "./Icon";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  size?: "sm" | "md" | "lg";
}

export function Modal({ open, title, description, onClose, size = "md", children }: PropsWithChildren<ModalProps>) {
  if (!open) return null;
  const width = size === "sm" ? "max-w-[420px]" : size === "lg" ? "max-w-[720px]" : "max-w-[540px]";
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 p-4 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${width} max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl bg-white shadow-soft`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-surface-line px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <h3 className="text-[22px] font-bold text-ink-900">{title}</h3>
            {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-ink-400 hover:bg-surface-muted hover:text-ink-900"
            aria-label="Закрыть"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="px-4 py-4 sm:px-6 sm:py-6">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Подтвердить",
  destructive = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose} size="sm">
      <p className="text-[15px] leading-relaxed text-ink-900/90">{description}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="btn-secondary">
          Отмена
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-base font-semibold text-white shadow-sm transition ${
            destructive ? "bg-accent-red hover:brightness-110" : "bg-brand-500 hover:bg-brand-600"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
