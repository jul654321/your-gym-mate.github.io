import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button, type ButtonProps } from "../ui/button";

interface ConfirmModalProps {
  title?: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming?: boolean;
  confirmVariant?: ButtonProps["variant"];
}

export function ConfirmModal({
  title = "Confirm action",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isConfirming = false,
  confirmVariant = "primary",
}: ConfirmModalProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = `${titleId}-description`;

  useEffect(() => {
    confirmButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-current/80 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 rounded-full bg-blue-50 p-2.5">
            <svg
              className="h-6 w-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8h.01M11 11h2v4h-2zM12 3c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 id={titleId} className="text-lg font-semibold text-gray-900">
              {title}
            </h3>
            <p id={descriptionId} className="mt-2 text-sm text-gray-600">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={isConfirming}
            className="transition-colors"
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmButtonRef}
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? `${confirmLabel}...` : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
