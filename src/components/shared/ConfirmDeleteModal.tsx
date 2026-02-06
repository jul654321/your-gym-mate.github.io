import { useEffect, useRef } from "react";
import { Button } from "../ui/button";
import { Modal } from "./Modal";

interface ConfirmDeleteModalProps {
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export function ConfirmDeleteModal({
  itemName,
  onConfirm,
  onCancel,
  isDeleting = false,
}: ConfirmDeleteModalProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and initial focus
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
      title="Delete Plan"
      onClose={onCancel}
      actionButtons={[
        <Button
          key="confirm"
          onClick={onConfirm}
          disabled={isDeleting}
          variant="destructive"
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>,
      ]}
    >
      <>
        <p>
          Are you sure you want to delete{" "}
          <span className="font-semibold">"{itemName}"</span>?
        </p>
        <p>This action cannot be undone.</p>
      </>
    </Modal>
  );
}
