import { useEffect, type ReactNode } from "react";
import { Button } from "../ui/button";
import { Modal } from "./Modal";

interface ConfirmModalProps {
  title?: string;
  description: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming?: boolean;
}

export function ConfirmModal({
  title = "Confirm action",
  description,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
  isConfirming = false,
}: ConfirmModalProps) {
  useEffect(() => {
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
