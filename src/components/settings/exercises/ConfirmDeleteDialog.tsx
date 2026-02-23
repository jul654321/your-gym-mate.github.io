import { Button } from "../../ui/button";
import { Modal } from "../../shared/Modal";

interface ConfirmDeleteDialogProps {
  exerciseName: string;
  open: boolean;
  isDeleting?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteDialog({
  exerciseName,
  open,
  isDeleting = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDeleteDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <Modal
      title={`Delete ${exerciseName}?`}
      onClose={onCancel}
      actionButtons={[
        <Button
          key="delete"
          variant="destructive"
          onClick={onConfirm}
          isLoading={isDeleting}
        >
          Delete
        </Button>,
      ]}
    >
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          This will permanently remove the exercise from your catalog. Sessions,
          plans, or saved sets containing it will not be updated automatically.
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </Modal>
  );
}
