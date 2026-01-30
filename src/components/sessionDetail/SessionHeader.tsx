import { Pencil, X as XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { SessionDTO } from "../../types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface SessionHeaderProps {
  session?: SessionDTO | null;
  isBusy?: boolean;
  onRename: (name: string) => void;
}

export function SessionHeader({
  session,
  isBusy = false,
  onRename,
}: SessionHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(session?.name ?? "");

  const handleSave = useCallback(() => {
    if (!session) {
      setIsEditing(false);
      return;
    }
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== session.name) {
      onRename(trimmed);
    }
    setIsEditing(false);
  }, [draftName, onRename, session?.name]);

  const handleCancel = useCallback(() => {
    setDraftName(session?.name ?? "");
    setIsEditing(false);
  }, [session?.name]);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleCancel, isEditing]);

  return (
    <>
      <header className="bg-primary text-white shadow-lg flex items-center justify-between px-4 py-6">
        <div className="container mx-auto">
          <h1 className="text-xl font-bold">
            {" "}
            {session?.name ?? "Untitled session"}
          </h1>
        </div>
        <div className="space-y-2 md:flex-1">
          <div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setDraftName(session?.name ?? "");
                setIsEditing(true);
              }}
              disabled={isBusy}
              aria-label="Rename session"
            >
              <Pencil className="h-4 w-4 text-white" aria-hidden />
            </Button>
          </div>
        </div>
      </header>

      {isEditing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-current/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="session-rename-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleCancel();
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2
                id="session-rename-title"
                className="text-lg font-semibold text-slate-900"
              >
                Rename session
              </h2>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleCancel}
                aria-label="Close"
              >
                <XIcon className="h-5 w-5 text-slate-500" aria-hidden />
              </Button>
            </div>
            <div className="space-y-3 px-6 py-6">
              <label
                htmlFor="session-rename-input"
                className="text-sm font-medium text-slate-700"
              >
                Session name
              </label>
              <Input
                id="session-rename-input"
                className="text-lg font-semibold"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                disabled={isBusy}
                aria-label="Session name"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={isBusy}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isBusy}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
