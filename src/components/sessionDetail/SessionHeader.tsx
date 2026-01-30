import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import type { SessionDTO, SessionStatus } from "../../types";

interface SessionHeaderProps {
  session?: SessionDTO | null;
  isBusy?: boolean;
  onRename: (name: string) => void;
  onToggleStatus: (status: SessionStatus) => void;
  onDelete: () => void;
}

export function SessionHeader({
  session,
  isBusy = false,
  onRename,
  onToggleStatus,
  onDelete,
}: SessionHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(session?.name ?? "");

  useEffect(() => {
    setDraftName(session?.name ?? "");
  }, [session?.name]);

  const formattedDate = useMemo(() => {
    if (!session) {
      return "Date unknown";
    }
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(session.date);
  }, [session]);

  const status: SessionStatus = session?.status ?? "active";
  const nextStatus = status === "active" ? "completed" : "active";

  const statusClasses =
    status === "completed"
      ? "bg-green-100 text-green-800"
      : "bg-amber-100 text-amber-800";

  const handleSave = () => {
    if (!session) {
      setIsEditing(false);
      return;
    }
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== session.name) {
      onRename(trimmed);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraftName(session?.name ?? "");
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!session) return;
    const confirmation = window.confirm(
      "Delete this session and all its logged sets?"
    );
    if (confirmation) {
      onDelete();
    }
  };

  const onToggle = () => {
    onToggleStatus(nextStatus as SessionStatus);
  };

  return (
    <div className="bg-white shadow rounded-2xl p-5 space-y-4 md:flex md:items-center md:justify-between">
      <div className="space-y-2 md:flex-1">
        {isEditing ? (
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-lg font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              disabled={isBusy}
              aria-label="Session name"
            />
            <Button size="sm" onClick={handleSave} disabled={isBusy}>
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={isBusy}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="text-3xl font-semibold">
              {session?.name ?? "Untitled session"}
            </h1>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              disabled={isBusy}
            >
              Rename
            </Button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span>{formattedDate}</span>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClasses}`}
          >
            {status === "active" ? "In progress" : "Completed"}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={status === "completed" ? "secondary" : "primary"}
          onClick={onToggle}
          disabled={isBusy}
        >
          Mark {nextStatus}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleDelete}
          disabled={isBusy}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
