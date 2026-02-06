import { Button } from "../ui/button";
import type { LoggedSetDTO } from "../../types";
import { Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ConfirmDeleteModal } from "../shared/ConfirmDeleteModal";

interface LoggedSetRowProps {
  set: LoggedSetDTO;
  onEdit: (setId: string, set: LoggedSetDTO) => void;
  onDelete: (setId: string) => void;
  isBusy?: boolean;
}

export function LoggedSetRow({
  set,
  onEdit,
  onDelete,
  isBusy = false,
}: LoggedSetRowProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const displayTime = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
    }).format(set.timestamp);
  }, [set.timestamp]);

  const primaryLabel = set.setIndex != null ? `Set ${set.setIndex + 1}` : "Set";

  const formattedWeight = `${(set.weight ?? 0).toLocaleString()} ${
    set.weightUnit ?? "kg"
  }`;

  return (
    <>
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 text-foreground">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-muted-foreground">
              {primaryLabel}
            </span>
            <span>{displayTime}</span>
          </div>
          <p className="text-lg font-semibold text-muted-foreground">
            {formattedWeight} × {set.reps ?? 0}
          </p>
          {set.alternative && (
            <p className="text-xs text-emerald-600">
              Alt: {set.alternative.nameSnapshot ?? "Alternative"} ·{" "}
              {(set.alternative.weight ?? 0).toLocaleString()}{" "}
              {set.weightUnit ?? "kg"} × {set.alternative.reps ?? 0}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onEdit(set.id, set)}
            disabled={isBusy}
            aria-label={`Edit ${primaryLabel}`}
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowDeleteModal(true)}
            disabled={isBusy}
            aria-label={`Delete ${primaryLabel}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      {showDeleteModal && (
        <ConfirmDeleteModal
          itemName={primaryLabel}
          onConfirm={() => {
            onDelete(set.id);
            setShowDeleteModal(false);
          }}
          onCancel={() => setShowDeleteModal(false)}
          isDeleting={isBusy}
        />
      )}
    </>
  );
}
