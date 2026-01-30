import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { DBStatusBanner } from "../components/sessions/DBStatusBanner";
import { FilterBar } from "../components/sessions/FilterBar";
import { InstantiateFromPlanSheet } from "../components/sessions/InstantiateFromPlanSheet";
import { NewSessionModal } from "../components/sessions/NewSessionModal";
import { SessionList } from "../components/sessions/SessionList";
import { useCreateSession } from "../hooks/useSessions";
import { useInstantiateSessionFromPlan } from "../hooks/usePlans";
import type { CreateSessionCmd, SessionListQueryParams } from "../types";
import { useDbInit } from "../hooks/useDbInit";
import { Button } from "../components/ui/button";

export function SessionsPage() {
  const { ready, upgrading } = useDbInit();
  const [filters, setFilters] = useState<SessionListQueryParams>({
    status: "all",
  });
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [isPlanSheetOpen, setIsPlanSheetOpen] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const navigate = useNavigate();
  const createSession = useCreateSession();
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

  const instantiatePlan = useInstantiateSessionFromPlan();

  const handleCreateSession = (name: string, planId?: string | null) => {
    setCreationError(null);
    const trimmed = name.trim();
    const now = Date.now();
    const inferredName =
      trimmed ||
      `Session — ${new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
      }).format(new Date(now))}`;

    if (planId) {
      const sessionId = uuidv4();
      instantiatePlan.mutate(
        {
          id: sessionId,
          planId,
          overrides: { name: inferredName, date: now },
          createdAt: now,
        },
        {
          onSuccess: (session) => {
            setIsNewSessionOpen(false);
            setCreationError(null);
            navigate(`/sessions/${session.id}`);
          },
          onError: (error) => {
            setCreationError(
              error instanceof Error
                ? error.message
                : "Failed to instantiate session from plan."
            );
          },
        }
      );
      return;
    }

    const payload: CreateSessionCmd = {
      id: uuidv4(),
      name: inferredName,
      date: now,
      status: "active",
      createdAt: now,
    };

    createSession.mutate(payload, {
      onSuccess: (session) => {
        setIsNewSessionOpen(false);
        setCreationError(null);
        navigate(`/sessions/${session.id}`);
      },
      onError: (error) => {
        setCreationError(
          error instanceof Error ? error.message : "Failed to create session."
        );
      },
    });
  };

  const closeNewSessionModal = () => {
    setIsNewSessionOpen(false);
    setCreationError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* <header className="bg-secondary text-slate-900 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Sessions</h1>
          <p className="text-slate-700">{headerSubtitle}</p>
        </div>
      </header> */}

      <DBStatusBanner ready={ready} upgrading={upgrading}>
        <p className="text-sm text-teal-100">Thanks for keeping data local.</p>
      </DBStatusBanner>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* <FilterBar onChange={handleFilterChange} initial={filters} /> */}
        <Button
          className="w-full"
          variant="primary"
          onClick={() => setIsNewSessionOpen(true)}
        >
          Log Session
        </Button>
        <SessionList params={filters} disableActions={disableActions} />
      </main>

      <NewSessionModal
        isOpen={isNewSessionOpen}
        onClose={closeNewSessionModal}
        onCreate={handleCreateSession}
        isLoading={createSession.isLoading || instantiatePlan.isLoading}
        error={creationError}
      />

      <InstantiateFromPlanSheet
        isOpen={isPlanSheetOpen}
        onClose={() => setIsPlanSheetOpen(false)}
      />
    </div>
  );
}
