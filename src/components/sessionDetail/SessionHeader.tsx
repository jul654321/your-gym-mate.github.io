import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import type { SessionDTO, SessionStatus } from "../../types";
import { Check, Pencil, Trash2, X as XIcon } from "lucide-react";

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
          <div className="flex flex-wrap justify-between items-baseline gap-3">
            <h1 className="text-xl font-semibold">
              {session?.name ?? "Untitled session"}
            </h1>
            <div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                disabled={isBusy}
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleDelete}
                disabled={isBusy}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
