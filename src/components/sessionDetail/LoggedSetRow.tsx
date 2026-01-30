import { Button } from "../ui/button";
import type { LoggedSetDTO } from "../../types";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDeleteModal } from "../shared/ConfirmDeleteModal";
import { useDeleteLoggedSet } from "../../hooks";

interface LoggedSetRowProps {
  set: LoggedSetDTO;
  onEdit: (setId: string, set: LoggedSetDTO) => void;
  onDelete: (setId: string) => void;
}

export function LoggedSetRow({ set, onEdit, onDelete }: LoggedSetRowProps) {
  const [editing, setEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [draftSet, setDraftSet] = useState(set);

  const deleteMutation = useDeleteLoggedSet();

  const displayTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
  }).format(set.timestamp);

  const handleDelete = () => {
    onDelete(set.id);
  };

  const handleSave = () => {
    onEdit(set.id, draftSet);
    setEditing(false);
  };

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-900">
            {set.setIndex != null ? `Set ${set.setIndex + 1}` : "Set"}
          </span>
          <span>{displayTime}</span>
        </div>
        <p className="text-m font-semibold text-slate-900">
          {(set.weight ?? 0).toLocaleString()} {set.weightUnit ?? "kg"} ×{" "}
          {set.reps ?? 0}
        </p>
        {set.alternative && (
          <p className="text-xs text-emerald-600">
            Alt: {set.alternative.nameSnapshot ?? "Alternative"} ·{" "}
            {(set.alternative.weight ?? 0).toLocaleString()}{" "}
            {set.weightUnit ?? "kg"} × {set.alternative.reps ?? 0}
          </p>
        )}
      </div>

      <div className="flex shrink-0">
        <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setShowDeleteModal(true)}
          aria-label={`Delete set ${
            set.setIndex != null ? set.setIndex + 1 : ""
          }`}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <ConfirmDeleteModal
          itemName="this set"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
