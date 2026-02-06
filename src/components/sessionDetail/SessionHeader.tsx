import { Pencil, X as XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { SessionDTO } from "../../types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { SectionHeader } from "../layouts/SectionHeader";
import { Modal } from "../shared/Modal";
import { Label } from "../ui/label";

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
      <SectionHeader headerTitle={session?.name ?? "Untitled session"}>
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
      </SectionHeader>

      {isEditing && (
        <Modal
          title="Rename session"
          onClose={handleCancel}
          actionButtons={[
            <Button size="sm" onClick={handleSave} disabled={isBusy}>
              Save
            </Button>,
          ]}
        >
          <>
            <Label htmlFor="session-rename-input">Session name</Label>
            <Input
              id="session-rename-input"
              className="text-lg font-semibold"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              disabled={isBusy}
              aria-label="Session name"
              autoFocus
            />
          </>
        </Modal>
      )}
    </>
  );
}
