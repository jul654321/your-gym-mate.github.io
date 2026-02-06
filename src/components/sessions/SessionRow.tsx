import { Eye, Pencil, Trash2 } from "lucide-react";
import type { MouseEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDeleteSession, useUpdateSession } from "../../hooks";
import type { SessionDTO } from "../../types";
import { ConfirmDeleteModal } from "../shared/ConfirmDeleteModal";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

interface SessionRowProps {
  session: SessionDTO;
  disabled?: boolean;
}

export function SessionRow({ session, disabled = false }: SessionRowProps) {
  const navigate = useNavigate();
  const updateSession = useUpdateSession();
  const deleteSession = useDeleteSession();

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const formattedDate = useMemo(() => {
    if (isNaN(session.date)) {
      return "Invalid date";
    }

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
      <Card
        onClick={handleNavigate}
        role="listitem"
        clickable
        cardHeader={
          <>
            <span className="whitespace-nowrap text-ellipsis overflow-hidden">
              {session.name || "Untitled Session"}
            </span>
            <Button
              variant="primary"
              size="icon-small"
              aria-label={`View session ${session.name}`}
            >
              <Eye className="h-4 w-4" aria-hidden />
            </Button>
          </>
        }
        cardFooter={
          <>
            <p className="text-sm text-muted-foreground">{formattedDate}</p>
            <div className="flex items-center gap-2">
              <Button
                size="icon-small"
                variant="secondary"
                onClick={(event) => {
                  event.stopPropagation();
                  handleNavigate();
                }}
                disabled={disabled || updateSession.isPending}
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                size="icon-small"
                variant="destructive"
                onClick={handleDelete}
                disabled={disabled || deleteSession.isPending}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </>
        }
      ></Card>

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
