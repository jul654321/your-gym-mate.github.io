import { Book, Copy, Pencil, Trash2 } from "lucide-react";
import { forwardRef, useState } from "react";
import { usePlanExercise } from "../../hooks";
import type { LoggedSetDTO } from "../../types";
import { ConfirmDeleteModal } from "../shared/ConfirmDeleteModal";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

interface LoggedSetRowProps {
  set: LoggedSetDTO;
  onEdit: (setId: string, set: LoggedSetDTO) => void;
  onDelete: (setId: string) => void;
  onCopy: (setId: string) => void;
  isBusy?: boolean;
}

export const LoggedSetRow = forwardRef<HTMLDivElement, LoggedSetRowProps>(
  function LoggedSetRow(
    { set, onEdit, onDelete, onCopy, isBusy = false },
    ref
  ) {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const { data: planExercise } = usePlanExercise(set.exerciseId);

    const primaryLabel =
      set.setIndex != null ? `Set ${set.setIndex + 1}` : "Set";

    const formattedWeight = `${(set.weight ?? 0).toLocaleString()} ${
      set.weightUnit ?? "kg"
    }`;

    return (
      <div ref={ref} className="flex flex-col gap-3">
        <Card>
          <div className="flex justify-between items-center gap-3">
            <div className="flex-1 overflow-hidden">
              <p className="max-w-full text-sm text-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                <span className="capitalize font-bold">{set.setType}</span>:{" "}
                {formattedWeight} × {set.reps ?? 0}
              </p>
              {set.alternative && (
                <p className="max-w-full text-xs text-primary whitespace-nowrap overflow-hidden text-ellipsis">
                  Alt: {set.alternative.nameSnapshot ?? "Alternative"} ·{" "}
                  {(set.alternative.weight ?? 0).toLocaleString()}{" "}
                  {set.weightUnit ?? "kg"} × {set.alternative.reps ?? 0}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                size="icon-small"
                variant="secondary"
                onClick={() => onCopy(set.id)}
                disabled={isBusy}
                aria-label={`Copy ${primaryLabel}`}
              >
                <Copy className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                size="icon-small"
                variant="secondary"
                onClick={() => onEdit(set.id, set)}
                disabled={isBusy}
                aria-label={`Edit ${primaryLabel}`}
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                size="icon-small"
                variant="destructive"
                onClick={() => setShowDeleteModal(true)}
                disabled={isBusy}
                aria-label={`Delete ${primaryLabel}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
              {!!planExercise?.guideLinks?.length && (
                <Button size="icon-small" variant="ghost" onClick={() => {}}>
                  <Book className="h-4 w-4" aria-hidden />
                </Button>
              )}
            </div>
          </div>
        </Card>

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
      </div>
    );
  }
);
