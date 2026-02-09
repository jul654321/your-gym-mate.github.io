import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { InstantiateFromPlanSheet } from "../components/sessions/InstantiateFromPlanSheet";
import { NewSessionModal } from "../components/sessions/NewSessionModal";
import { WeekBar } from "../components/sessions/WeekBar";
import { SessionList } from "../components/sessions/SessionList";
import { Button } from "../components/ui/button";
import { useDbInit } from "../hooks/useDbInit";
import { useInstantiateSessionFromPlan } from "../hooks/usePlans";
import { useCreateSession, useSessions } from "../hooks/useSessions";
import { inferSessionName } from "../lib/utils/sessionName";
import { endOfDay, endOfWeek, startOfDay, startOfWeek } from "../lib/date/week";
import type { CreateSessionCmd } from "../types";
import { SectionHeader } from "../components/layouts/SectionHeader";
import { SectionMain } from "../components/layouts/SectionMain";

export type SessionsPageLocationState = {
  openNewSession?: boolean;
} & Record<string, unknown>;

export function SessionsPage() {
  const location = useLocation();
  const { ready, upgrading } = useDbInit();
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [isPlanSheetOpen, setIsPlanSheetOpen] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<number | undefined>();
  const [modalInitialDate, setModalInitialDate] = useState<
    number | undefined
  >();
  const navigate = useNavigate();
  const createSession = useCreateSession();
  const disableActions = !ready || upgrading;

  const baseWeekStart = useMemo(() => startOfWeek(new Date()), []);
  const currentWeekReference = useMemo(() => {
    const reference = new Date(baseWeekStart);
    reference.setDate(reference.getDate() - weekOffset * 7);
    return reference;
  }, [baseWeekStart, weekOffset]);

  const weekFrom = startOfDay(currentWeekReference).getTime();
  const weekTo = endOfWeek(currentWeekReference).getTime();

  const { data: weekSessions = [] } = useSessions({
    dateRange: { from: weekFrom, to: weekTo },
  });

  useEffect(() => {
    const state = location.state as SessionsPageLocationState | null;
    if (!state?.openNewSession) {
      return;
    }

    setTimeout(() => {
      setIsNewSessionOpen(true);
    }, 0);

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

  const daysWithSessions = useMemo(
    () =>
      new Set(
        weekSessions.map((session) => startOfDay(session.date).getTime())
      ),
    [weekSessions]
  );

  const hasSessionForDate = useMemo(
    () => (dateMs: number) =>
      daysWithSessions.has(startOfDay(dateMs).getTime()),
    [daysWithSessions]
  );

  const sessionListParams = useMemo(() => {
    if (selectedDate) {
      return {
        from: startOfDay(selectedDate).toISOString(),
        to: endOfDay(selectedDate).toISOString(),
      };
    }

    return {
      from: startOfDay(currentWeekReference).toISOString(),
      to: endOfWeek(currentWeekReference).toISOString(),
    };
  }, [selectedDate, currentWeekReference]);

  const handleDayClick = (dateMs: number) => {
    const dayStart = startOfDay(dateMs).getTime();

    setSelectedDate((prev) => (prev === dayStart ? undefined : dayStart));
    setModalInitialDate(dayStart);
  };

  const handlePrevWeek = () => {
    setWeekOffset((prev) => prev + 1);
    setSelectedDate(undefined);
  };

  const handleNextWeek = () => {
    setWeekOffset((prev) => prev - 1);
    setSelectedDate(undefined);
  };

  const handleCreateSession = (
    name: string,
    planId?: string | null,
    planName?: string | null,
    dateMs?: number
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
          overrides: { name: inferredName, date: dateMs ?? now },
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
      date: dateMs ?? now,
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

  const openNewSession = () => {
    setIsNewSessionOpen(true);
  };

  const closeNewSessionModal = () => {
    setIsNewSessionOpen(false);
    setCreationError(null);
  };

  return (
    <div className="min-h-screen">
      <SectionHeader headerTitle="Sessions Log"></SectionHeader>

      <SectionMain>
        <WeekBar
          referenceDate={currentWeekReference}
          selectedDate={selectedDate}
          onDayClick={handleDayClick}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          hasSessionForDate={hasSessionForDate}
        />
        <SessionList
          params={sessionListParams}
          disableActions={disableActions}
        />
        <Button
          variant="primary"
          size="md"
          onClick={openNewSession}
          aria-label="Start new session"
          className="w-full"
        >
          Start New Session
        </Button>
      </SectionMain>

      <NewSessionModal
        isOpen={isNewSessionOpen}
        onClose={closeNewSessionModal}
        onCreate={handleCreateSession}
        initialDate={modalInitialDate}
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
