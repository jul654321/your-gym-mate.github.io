import {
  FormEvent,
  MouseEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, RefreshCw, Pencil, ChevronRight } from "lucide-react";
import { Input } from "../ui/input";
import type { SessionDTO } from "../../types";
import {
  useDeleteSession,
  useSetSessionStatus,
  useUpdateSession,
} from "../../hooks";
import { Button } from "../ui/button";

interface SessionRowProps {
  session: SessionDTO;
  disabled?: boolean;
}

export function SessionRow({ session, disabled = false }: SessionRowProps) {
  const navigate = useNavigate();
  const updateSession = useUpdateSession();
  const deleteSession = useDeleteSession();

  const [isEditing, setIsEditing] = useState(false);

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
      deleteSession.mutate({ id: session.id });
    },
    [disabled, session.id, deleteSession]
  );

  return (
    <article
      className="flex cursor-pointer flex-col rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm transition hover:border-primary/60 hover:shadow-lg"
      onClick={handleNavigate}
      role="listitem"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <span>{session.name || "Untitled Session"}</span>
          </div>
          <p className="text-sm text-slate-500">{formattedDate}</p>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span
              className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide ${
                session.status === "active"
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {session.status}
            </span>
            <span className="rounded-full border border-slate-200 px-2 py-0.5">
              {session.sourcePlanId ? "Plan session" : "Ad hoc session"}
            </span>
            <span className="rounded-full border border-slate-200 px-2 py-0.5">
              Sets · Volume pending
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <ChevronRight className="h-6 w-6 text-slate-400" aria-hidden />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 text-xs">
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
    </article>
  );
}
