import { useCallback, useMemo } from "react";
import { useExercises } from "./useExercises";
import { useDeleteSession, useSession, useUpdateSession } from "./useSessions";
import { useLoggedSets } from "./useLoggedSets";
import type { LoggedSetDTO, SessionDTO, SessionStatus } from "../types";

export interface GroupedExerciseVM {
  exerciseId: string;
  exerciseName: string;
  sets: LoggedSetDTO[];
}

export interface SessionTotals {
  totalVolume: number;
  totalSets: number;
}

export interface SessionViewModel {
  session?: SessionDTO | null;
  groupedExercises: GroupedExerciseVM[];
  totals: SessionTotals;
  isLoading: boolean;
  isSessionMissing: boolean;
  isMutating: boolean;
  actions: {
    renameSession: (name: string) => void;
    toggleStatus: (status: SessionStatus) => void;
    deleteSession: () => void;
  };
}

function getDisplayName(
  exerciseId: string,
  exercisesById: Map<string, string>,
  fallback?: string
) {
  return exercisesById.get(exerciseId) ?? fallback ?? "Exercise";
}

export function useSessionViewModel(sessionId?: string): SessionViewModel {
  const sessionQuery = useSession(sessionId ?? "");
  const loggedSetsQuery = useLoggedSets({
    sessionId: sessionId ?? undefined,
    sort: "timestamp",
  });
  const exercisesQuery = useExercises();

  const exercisesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const exercise of exercisesQuery.data ?? []) {
      map.set(exercise.id, exercise.name);
    }
    return map;
  }, [exercisesQuery.data]);

  const groupedExercises = useMemo(() => {
    const sets = loggedSetsQuery.data ?? [];
    const groups = new Map<string, GroupedExerciseVM>();

    for (const set of sets) {
      const key = set.exerciseId;
      const current = groups.get(key);
      const exerciseName = getDisplayName(
        key,
        exercisesById,
        set.exerciseNameSnapshot
      );

      if (current) {
        current.sets.push(set);
        continue;
      }

      groups.set(key, {
        exerciseId: key,
        exerciseName,
        sets: [set],
      });
    }

    const sortedGroups = Array.from(groups.values()).map((group) => ({
      ...group,
      sets: [...group.sets].sort((a, b) => {
        const indexA = a.setIndex ?? a.timestamp ?? 0;
        const indexB = b.setIndex ?? b.timestamp ?? 0;
        return indexA - indexB;
      }),
    }));

    return sortedGroups;
  }, [loggedSetsQuery.data, exercisesById]);

  const totals = useMemo(() => {
    const sets = loggedSetsQuery.data ?? [];
    const totalVolume = sets.reduce((sum, set) => {
      const weight = set.weight ?? 0;
      const reps = set.reps ?? 0;
      return sum + weight * reps;
    }, 0);
    return {
      totalVolume,
      totalSets: sets.length,
    };
  }, [loggedSetsQuery.data]);

  const updateSession = useUpdateSession();
  const deleteSession = useDeleteSession();

  const renameSession = useCallback(
    (name: string) => {
      if (!sessionId) return;
      updateSession.mutate({ id: sessionId, name });
    },
    [sessionId, updateSession]
  );

  const toggleStatus = useCallback(
    (status: SessionStatus) => {
      if (!sessionId) return;
      updateSession.mutate({ id: sessionId, status });
    },
    [sessionId, updateSession]
  );

  const removeSession = useCallback(() => {
    if (!sessionId) return;
    deleteSession.mutate({ id: sessionId });
  }, [deleteSession, sessionId]);

  const isLoading =
    sessionQuery.isLoading ||
    loggedSetsQuery.isLoading ||
    exercisesQuery.isLoading;

  const isSessionMissing =
    !!sessionId && !sessionQuery.isLoading && sessionQuery.data == null;

  return {
    session: sessionQuery.data,
    groupedExercises,
    totals,
    isLoading,
    isSessionMissing,
    isMutating: updateSession.isLoading || deleteSession.isLoading,
    actions: {
      renameSession,
      toggleStatus,
      deleteSession: removeSession,
    },
  };
}
