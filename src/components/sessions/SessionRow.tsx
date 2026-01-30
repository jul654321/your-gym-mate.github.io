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

interface SessionRowProps {
  session: SessionDTO;
  disabled?: boolean;
}

function SessionRowImpl({ session, disabled = false }: SessionRowProps) {
  const navigate = useNavigate();
  const updateSession = useUpdateSession();
  const setStatus = useSetSessionStatus();
  const deleteSession = useDeleteSession();

  const [isEditing, setIsEditing] = useState(false);
  const [nameValue, setNameValue] = useState(session.name ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    setNameValue(session.name ?? "");
  }, [session.name]);

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(session.date));
  }, [session.date]);

  const handleNavigate = useCallback(() => {
    navigate(`/sessions/${session.id}`);
  }, [navigate, session.id]);

  const handleRenameSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = nameValue.trim();
      if (!trimmed) {
        setError("Session name cannot be empty");
        return;
      }
      setError("");
      updateSession.mutate({ id: session.id, name: trimmed });
      setIsEditing(false);
    },
    [nameValue, session.id, updateSession]
  );

  const handleToggleStatus = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      if (disabled) {
        return;
      }
      const nextStatus = session.status === "active" ? "completed" : "active";
      setStatus.mutate({ sessionId: session.id, status: nextStatus });
    },
    [disabled, session.id, session.status, setStatus]
  );

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

  const toggleLabel =
    session.status === "active" ? "Mark completed" : "Mark active";

  return (
    <article
      className="flex cursor-pointer flex-col rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm transition hover:border-primary/60 hover:shadow-lg"
      onClick={handleNavigate}
      role="listitem"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 flex-col gap-1">
          {isEditing ? (
            <form
              className="flex flex-col gap-2"
              onClick={(event) => event.stopPropagation()}
              onSubmit={handleRenameSubmit}
            >
              <div className="flex gap-2">
                <Input
                  value={nameValue}
                  onChange={(event) => setNameValue(event.target.value)}
                  autoFocus
                  placeholder="Session name"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-3 py-1 text-sm font-semibold text-white"
                >
                  Save
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 hover:border-slate-400"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsEditing(false);
                    setNameValue(session.name ?? "");
                    setError("");
                  }}
                >
                  Cancel
                </button>
              </div>
              {error && (
                <p className="text-xs text-red-500" role="alert">
                  {error}
                </p>
              )}
            </form>
          ) : (
            <>
              <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span>{session.name || "Untitled Session"}</span>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-500 hover:border-slate-400"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsEditing(true);
                  }}
                  aria-label="Rename session"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <p className="text-sm text-slate-500">{formattedDate}</p>
            </>
          )}

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

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <button
          type="button"
          className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-slate-600 transition hover:border-slate-400"
          onClick={(event) => {
            event.stopPropagation();
            setIsEditing(true);
          }}
          disabled={disabled || updateSession.isLoading}
        >
          <Pencil className="h-4 w-4" aria-hidden />
          Rename
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-slate-600 transition hover:border-slate-400"
          onClick={handleToggleStatus}
          disabled={disabled || setStatus.isLoading}
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          {toggleLabel}
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-red-600 transition hover:border-red-300"
          onClick={handleDelete}
          disabled={disabled || deleteSession.isLoading}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Delete
        </button>
      </div>
    </article>
  );
}

export const SessionRow = memo(SessionRowImpl);
