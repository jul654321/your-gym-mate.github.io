import { Book, Check, Copy, Pencil, Trash2 } from "lucide-react";
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
  onToggleStatus: (setId: string) => void;
  isBusy?: boolean;
}

export const LoggedSetRow = forwardRef<HTMLDivElement, LoggedSetRowProps>(
  function LoggedSetRow(
    { set, onEdit, onDelete, onCopy, onToggleStatus, isBusy = false },
    ref
  ) {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const { data: planExercise } = usePlanExercise(set.exerciseId);

    const primaryLabel =
      set.setIndex != null ? `Set ${set.setIndex + 1}` : "Set";

    const statusLabel = set.status ?? "pending";
    const isCompleted = statusLabel === "completed";

    const guideLinks = planExercise?.guideLinks ?? [];
    const hasGuideLinks = guideLinks.length > 0;
    const guideLabel = hasGuideLinks
      ? `${guideLinks.length} guide${guideLinks.length === 1 ? "" : "s"}`
      : null;

    const formattedWeight = `${(set.weight ?? 0).toLocaleString()} ${
      set.weightUnit ?? "kg"
    }`;

    const handleGuideClick = () => {
      if (!hasGuideLinks) return;
      const url = guideLinks[0].url;
      if (!url) return;
      if (typeof window !== "undefined") {
        window.open(url, "_blank", "noopener");
      }
    };

    return (
      <div ref={ref} className="flex flex-col gap-3">
        <Card>
          <div className="flex justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground capitalize truncate">
                    {set.setType}: {formattedWeight} × {set.reps ?? 0}
                  </p>
                </div>
                {guideLabel && (
                  <p className="text-xs text-foreground/70">{guideLabel}</p>
                )}
                {set.alternative && (
                  <p className="text-xs font-medium text-primary">
                    Alt: {set.alternative.nameSnapshot ?? "Alternative"} ·{" "}
                    {(set.alternative.weight ?? 0).toLocaleString()}{" "}
                    {set.weightUnit ?? "kg"} × {set.alternative.reps ?? 0}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="icon-small"
                variant={isCompleted ? "success" : "secondary"}
                onClick={() => onToggleStatus(set.id)}
                disabled={isBusy}
              >
                <Check
                  className="h-4 w-4"
                  aria-hidden
                  data-state={statusLabel}
                />
              </Button>
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
              {hasGuideLinks && (
                <Button
                  size="icon-small"
                  variant="ghost"
                  onClick={handleGuideClick}
                  aria-label={`Open guide links for ${primaryLabel}`}
                  disabled={isBusy}
                >
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
