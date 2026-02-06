import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { InstantiateFromPlanSheet } from "../components/sessions/InstantiateFromPlanSheet";
import { NewSessionModal } from "../components/sessions/NewSessionModal";
import { SessionList } from "../components/sessions/SessionList";
import { Button } from "../components/ui/button";
import { useDbInit } from "../hooks/useDbInit";
import { useInstantiateSessionFromPlan } from "../hooks/usePlans";
import { useCreateSession } from "../hooks/useSessions";
import { inferSessionName } from "../lib/utils/sessionName";
import type { CreateSessionCmd } from "../types";
import { Plus } from "lucide-react";
import { SectionHeader } from "../components/layouts/SectionHeader";

export type SessionsPageLocationState = {
  openNewSession?: boolean;
} & Record<string, unknown>;

export function SessionsPage() {
  const location = useLocation();
  const { ready, upgrading } = useDbInit();
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [isPlanSheetOpen, setIsPlanSheetOpen] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const navigate = useNavigate();
  const createSession = useCreateSession();
  const disableActions = !ready || upgrading;

  useEffect(() => {
    const state = location.state as SessionsPageLocationState | null;
    if (!state?.openNewSession) {
      return;
    }

    setIsNewSessionOpen(true);
    const nextState = { ...state };
    delete nextState.openNewSession;
    const cleanedState: SessionsPageLocationState | null =
      Object.keys(nextState).length === 0 ? null : nextState;

    navigate(location.pathname, {
      replace: true,
      state: cleanedState,
    });
  }, [location.pathname, location.state, navigate]);

  const instantiatePlan = useInstantiateSessionFromPlan();

  const handleCreateSession = (
    name: string,
    planId?: string | null,
    planName?: string | null
  ) => {
    setCreationError(null);
    const now = Date.now();
    const inferredName = inferSessionName(name, planName, now);

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
    <div className="min-h-screen">
      <SectionHeader headerTitle="Sessions Log"></SectionHeader>

      <main className="container mx-auto px-4 pt-2 pb-4 space-y-6">
        <SessionList disableActions={disableActions} />
        <Button
          variant="primary"
          size="md"
          onClick={() => setIsNewSessionOpen(true)}
          aria-label="Start new session"
          className="w-full"
        >
          Start New Session
        </Button>
      </main>

      <NewSessionModal
        isOpen={isNewSessionOpen}
        onClose={closeNewSessionModal}
        onCreate={handleCreateSession}
        isLoading={createSession.isPending || instantiatePlan.isPending}
        error={creationError}
      />

      <InstantiateFromPlanSheet
        isOpen={isPlanSheetOpen}
        onClose={() => setIsPlanSheetOpen(false)}
      />
    </div>
  );
}
