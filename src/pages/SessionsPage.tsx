import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { InstantiateFromPlanSheet } from "../components/sessions/InstantiateFromPlanSheet";
import { NewSessionModal } from "../components/sessions/NewSessionModal";
import { SessionList } from "../components/sessions/SessionList";
import { Button } from "../components/ui/button";
import { useDbInit } from "../hooks/useDbInit";
import { useInstantiateSessionFromPlan } from "../hooks/usePlans";
import { useCreateSession } from "../hooks/useSessions";
import type { CreateSessionCmd } from "../types";

export function SessionsPage() {
  const { ready, upgrading } = useDbInit();
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [isPlanSheetOpen, setIsPlanSheetOpen] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const navigate = useNavigate();
  const createSession = useCreateSession();
  const disableActions = !ready || upgrading;

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
      <header className="bg-primary text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Workout Sessions</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Button
          className="w-full"
          variant="primary"
          onClick={() => setIsNewSessionOpen(true)}
        >
          Log Session
        </Button>
        <SessionList disableActions={disableActions} />
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
