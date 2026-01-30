import { Button } from "../ui/button";
import type { LoggedSetDTO } from "../../types";

interface LoggedSetRowProps {
  set: LoggedSetDTO;
  onEdit: (setId: string) => void;
  onDelete: (setId: string) => void;
}

export function LoggedSetRow({ set, onEdit, onDelete }: LoggedSetRowProps) {
  const displayTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
  }).format(set.timestamp);

  const handleDelete = () => {
    const confirmed = window.confirm("Delete this logged set?");
    if (confirmed) {
      onDelete(set.id);
    }
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
        <p className="text-lg font-semibold text-slate-900">
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

      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="ghost" onClick={() => onEdit(set.id)}>
          Edit
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleDelete}
          aria-label={`Delete set ${
            set.setIndex != null ? set.setIndex + 1 : ""
          }`}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
