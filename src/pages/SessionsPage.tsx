import { useMemo, useState } from "react";
import { CreateSessionFAB } from "../components/sessions/CreateSessionFAB";
import { DBStatusBanner } from "../components/sessions/DBStatusBanner";
import { FilterBar } from "../components/sessions/FilterBar";
import { SessionList } from "../components/sessions/SessionList";
import type { SessionListQueryParams } from "../types";
import { useDbInit } from "../hooks/useDbInit";

export function SessionsPage() {
  const { ready, upgrading } = useDbInit();
  const [filters, setFilters] = useState<SessionListQueryParams>({
    status: "all",
  });
  const disableActions = !ready || upgrading;

  const headerSubtitle = useMemo(() => {
    if (upgrading) {
      return "Database migration running—actions are temporarily locked.";
    }
    if (!ready) {
      return "Initializing local storage before you can create or delete sessions.";
    }
    return "Review your workout history or boot a new session.";
  }, [ready, upgrading]);

  const handleFilterChange = (params: SessionListQueryParams) => {
    setFilters(params);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-secondary text-slate-900 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Sessions</h1>
          <p className="text-slate-700">{headerSubtitle}</p>
        </div>
      </header>

      <DBStatusBanner ready={ready} upgrading={upgrading}>
        <p className="text-sm text-teal-100">Thanks for keeping data local.</p>
      </DBStatusBanner>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <FilterBar onChange={handleFilterChange} initial={filters} />
        <SessionList params={filters} disableActions={disableActions} />
      </main>

      <CreateSessionFAB
        onCreate={() => {
          // TODO: Launch new session flow
        }}
        onInstantiate={() => {
          // TODO: Open plan instantiation sheet
        }}
        disabled={disableActions}
      />
    </div>
  );
}
