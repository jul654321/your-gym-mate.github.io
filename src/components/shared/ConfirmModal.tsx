import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button, type ButtonProps } from "../ui/button";
import { Modal } from "./Modal";

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
    <Modal
      title={title}
      onClose={onCancel}
      actionButtons={[
        <Button key="confirm" onClick={onConfirm} disabled={isConfirming}>
          {isConfirming ? `${confirmLabel}...` : confirmLabel}
        </Button>,
      ]}
    >
      <>{description}</>
    </Modal>
  );
}
