import { useEffect, useMemo, useState } from "react";
import type { SessionListQueryParams, SessionsQueryParams } from "../../types";
import { useSessions } from "../../hooks/useSessions";
import { SessionRow } from "./SessionRow";

const DEFAULT_PAGE_SIZE = 20;

interface SessionListProps {
  params: SessionListQueryParams;
  disableActions?: boolean;
}

export function SessionList({
  params,
  disableActions = false,
}: SessionListProps) {
  const [visibleCount, setVisibleCount] = useState(
    params.pageSize ?? DEFAULT_PAGE_SIZE
  );

  useEffect(() => {
    const resetCount = params.pageSize ?? DEFAULT_PAGE_SIZE;
    setVisibleCount(resetCount);
  }, [params.status, params.from, params.to, params.q, params.pageSize]);

  const queryParams = useMemo(() => {
    const status =
      params.status && params.status !== "all" ? params.status : undefined;

    const dateRange =
      params.from || params.to
        ? {
            from: params.from
              ? Number.isNaN(Date.parse(params.from))
                ? undefined
                : Date.parse(params.from)
              : undefined,
            to: params.to
              ? Number.isNaN(Date.parse(params.to))
                ? undefined
                : Date.parse(params.to)
              : undefined,
          }
        : undefined;

    const base: SessionsQueryParams = {
      status,
      dateRange,
      sort: "date",
    };

    return base;
  }, [params.status, params.from, params.to]);

  const { data: sessions = [], isLoading, error } = useSessions(queryParams);

  const normalizedQuery = useMemo(
    () =>
      (params.q?.trim().length ?? 0) >= 2 ? params.q!.trim().toLowerCase() : "",
    [params.q]
  );

  const filteredSessions = useMemo(() => {
    if (!normalizedQuery) {
      return sessions;
    }
    return sessions.filter((session) =>
      (session.name ?? "Untitled Session")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [sessions, normalizedQuery]);

  const visibleSessions = filteredSessions.slice(0, visibleCount);
  const hasMore = visibleCount < filteredSessions.length;

  return (
    <section
      aria-live="polite"
      className="rounded-3xl border border-slate-100 bg-white/80 p-4 shadow-lg"
    >
      <h2 className="text-lg font-semibold text-slate-900">
        Sessions ({filteredSessions.length})
      </h2>

      {isLoading && (
        <div className="py-20 text-center text-sm text-slate-500">
          Loading sessions…
        </div>
      )}

      {error && (
        <div className="my-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load sessions: {error.message}
        </div>
      )}

      {!isLoading && !error && filteredSessions.length === 0 && (
        <div className="py-16 text-center text-sm text-slate-500">
          No sessions match the current filters.
        </div>
      )}

      {!isLoading && !error && filteredSessions.length > 0 && (
        <div className="mt-4 space-y-3">
          {visibleSessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              disabled={disableActions}
            />
          ))}
          {hasMore && (
            <div className="flex justify-center">
              <button
                type="button"
                className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                onClick={() =>
                  setVisibleCount((prev) =>
                    Math.min(
                      prev + (params.pageSize ?? DEFAULT_PAGE_SIZE),
                      filteredSessions.length
                    )
                  )
                }
              >
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
