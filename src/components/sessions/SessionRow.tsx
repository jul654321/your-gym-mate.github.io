import { ChevronRight, Pencil, Trash2 } from "lucide-react";
import { MouseEvent, useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDeleteSession, useUpdateSession } from "../../hooks";
import type { SessionDTO } from "../../types";
import { Button } from "../ui/button";
import { ConfirmDeleteModal } from "../shared/ConfirmDeleteModal";

interface SessionRowProps {
  session: SessionDTO;
  disabled?: boolean;
}

export function SessionRow({ session, disabled = false }: SessionRowProps) {
  const navigate = useNavigate();
  const updateSession = useUpdateSession();
  const deleteSession = useDeleteSession();

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(session.date));
  }, [session.date]);

  const handleNavigate = useCallback(() => {
    navigate(`/sessions/${session.id}`);
  }, [navigate, session.id]);

  const handleDelete = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      if (disabled) {
        return;
      }
      setShowDeleteModal(true);
    },
    [disabled]
  );

  const handleConfirmDelete = useCallback(async () => {
    try {
      await deleteSession.mutateAsync({ id: session.id });
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Failed to delete session:", error);
      // TODO: surface error to the user
    }
  }, [deleteSession, session.id]);

  return (
    <>
      <article
        className="flex cursor-pointer flex-col rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm transition hover:border-primary/60 hover:shadow-lg"
        onClick={handleNavigate}
        role="listitem"
      >
        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-2 justify-between">
            <span className="text-lg font-semibold text-slate-900">
              {session.name || "Untitled Session"}
            </span>
            <div className="flex flex-col items-end gap-2">
              <ChevronRight className="h-6 w-6 text-slate-400" aria-hidden />
            </div>
          </div>
          <div className="flex items-center gap-2 justify-between">
            <p className="text-sm text-slate-500">{formattedDate}</p>
            <div className="flex items-center">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                disabled={disabled || updateSession.isPending}
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleDelete}
                disabled={disabled || deleteSession.isPending}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      </article>

      {showDeleteModal && (
        <ConfirmDeleteModal
          itemName={session.name || "Untitled Session"}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteModal(false)}
          isDeleting={deleteSession.isPending}
        />
      )}
    </>
  );
}
