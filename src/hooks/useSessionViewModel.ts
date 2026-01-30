import { useCallback, useEffect, useMemo, useState } from "react";
import { useExercises } from "./useExercises";
import { useDeleteSession, useSession, useUpdateSession } from "./useSessions";
import {
  useCreateLoggedSet,
  useDeleteLoggedSet,
  useLoggedSets,
  useUpdateLoggedSet,
} from "./useLoggedSets";
import type {
  LoggedSetDTO,
  SessionDTO,
  SessionStatus,
  UUID,
  CreateLoggedSetCmd,
  WeightUnit,
} from "../types";

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
  isLoadingSets: boolean;
  isFetchingMoreSets: boolean;
  actions: {
    renameSession: (name: string) => void;
    toggleStatus: (status: SessionStatus) => void;
    deleteSession: () => void;
    loadMoreSets: () => void;
    addSet: (exerciseId: string) => void;
    deleteSet: (setId: string) => void;
    updateSet: (setId: string, set: LoggedSetDTO) => void;
  };
  hasMoreSets: boolean;
}

function getDisplayName(
  exerciseId: string,
  exercisesById: Map<string, string>,
  fallback?: string
) {
  return exercisesById.get(exerciseId) ?? fallback ?? "Exercise";
}

const PAGE_SIZE = 12;
const DEFAULT_WEIGHT_UNIT: WeightUnit = "kg";

export function useSessionViewModel(sessionId?: string): SessionViewModel {
  const sessionQuery = useSession(sessionId ?? "");
  const exercisesQuery = useExercises();
  const [page, setPage] = useState(0);
  const [accumulatedSets, setAccumulatedSets] = useState<LoggedSetDTO[]>([]);

  useEffect(() => {
    const reset = () => {
      setPage(0);
      setAccumulatedSets([]);
    };
    reset();
  }, [sessionId]);

  const loggedSetsQuery = useLoggedSets({
    sessionId: sessionId ?? undefined,
    sort: "timestamp",
    pagination: {
      page,
      pageSize: PAGE_SIZE,
    },
  });

  const currentBatch = loggedSetsQuery.data ?? [];

  useEffect(() => {
    if (page === 0) {
      setAccumulatedSets(currentBatch);
      return;
    }

    setAccumulatedSets((prev) => {
      const existingIds = new Set(prev.map((set) => set.id));
      const newSets = currentBatch.filter((set) => !existingIds.has(set.id));
      if (newSets.length === 0) {
        return prev;
      }
      return [...prev, ...newSets];
    });
  }, [currentBatch, page]);

  const exercisesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const exercise of exercisesQuery.data ?? []) {
      map.set(exercise.id, exercise.name);
    }
    return map;
  }, [exercisesQuery.data]);

  const groupedExercises = useMemo(() => {
    const sets = accumulatedSets;
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
  }, [accumulatedSets, exercisesById]);

  const totals = useMemo(() => {
    const sets = accumulatedSets;
    const totalVolume = sets.reduce((sum, set) => {
      const weight = set.weight ?? 0;
      const reps = set.reps ?? 0;
      return sum + weight * reps;
    }, 0);
    return {
      totalVolume,
      totalSets: sets.length,
    };
  }, [accumulatedSets]);

  const updateSession = useUpdateSession();
  const deleteSession = useDeleteSession();
  const createLoggedSet = useCreateLoggedSet();
  const deleteLoggedSet = useDeleteLoggedSet();
  const updateLoggedSet = useUpdateLoggedSet();

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

  const isMutating =
    updateSession.isPending ||
    deleteSession.isPending ||
    createLoggedSet.isPending ||
    updateLoggedSet.isPending ||
    deleteLoggedSet.isPending;

  const hasMoreSets = currentBatch.length === PAGE_SIZE;
  const loadMoreSets = useCallback(() => {
    if (!hasMoreSets || loggedSetsQuery.isFetching) {
      return;
    }
    setPage((prev) => prev + 1);
  }, [hasMoreSets, loggedSetsQuery.isFetching]);

  const addSet = useCallback(
    (exerciseId: string) => {
      if (!sessionId) return;

      const now = Date.now();
      const payload: CreateLoggedSetCmd = {
        id: crypto.randomUUID() as UUID,
        sessionId,
        exerciseId,
        weight: 0,
        weightUnit: DEFAULT_WEIGHT_UNIT,
        reps: 1,
        timestamp: now,
        createdAt: now,
        exerciseIds: [exerciseId],
      };

      createLoggedSet.mutate(payload);
    },
    [sessionId, createLoggedSet]
  );

  const deleteSet = useCallback(
    (setId: string) => {
      if (!sessionId) return;
      deleteLoggedSet.mutate({ id: setId });
    },
    [sessionId, deleteLoggedSet]
  );

  const updateSet = useCallback(
    (setId: string, set: LoggedSetDTO) => {
      if (!sessionId) return;
      updateLoggedSet.mutate({ ...set, id: setId });
    },
    [sessionId, updateLoggedSet]
  );

  return {
    session: sessionQuery.data,
    groupedExercises,
    totals,
    isLoading,
    isSessionMissing,
    isMutating,
    isLoadingSets: loggedSetsQuery.isLoading,
    isFetchingMoreSets:
      loggedSetsQuery.isFetching && !loggedSetsQuery.isLoading && page > 0,
    actions: {
      renameSession,
      toggleStatus,
      deleteSession: removeSession,
      loadMoreSets,
      addSet,
      deleteSet,
      updateSet,
    },
    hasMoreSets,
  };
}
