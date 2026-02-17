import { useCallback, useEffect, useMemo, useState } from "react";
import { useExercises } from "./useExercises";
import { useDeleteSession, useSession, useUpdateSession } from "./useSessions";
import {
  useCreateLoggedSet,
  useDeleteLoggedSet,
  useLoggedSets,
  useUpdateLoggedSet,
} from "./useLoggedSets";
import { usePlan } from "./usePlans";
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
  actions: {
    renameSession: (name: string) => void;
    toggleStatus: (status: SessionStatus) => void;
    deleteSession: () => void;
    addSet: (exerciseId: string) => void;
    copySet: (setId: string) => void;
    deleteSet: (setId: string) => void;
    updateSet: (setId: string, set: LoggedSetDTO) => void;
    toggleSetStatus: (setId: string) => void;
  };
}

function getDisplayName(
  exerciseId: string,
  exercisesById: Map<string, string>,
  fallback?: string
) {
  return exercisesById.get(exerciseId) ?? fallback ?? "Exercise";
}

export interface BuildGroupedExercisesOptions {
  sets: LoggedSetDTO[];
  exercisesById: Map<string, string>;
  exerciseOrder?: string[];
  altToMainMap?: Map<string, string>;
}

export function buildGroupedExercises({
  sets,
  exercisesById,
  exerciseOrder,
  altToMainMap,
}: BuildGroupedExercisesOptions): GroupedExerciseVM[] {
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

  const normalizeGroup = (group: GroupedExerciseVM): GroupedExerciseVM => ({
    ...group,
    sets: [...group.sets].sort((a, b) => {
      const indexA = a.setIndex ?? a.timestamp ?? 0;
      const indexB = b.setIndex ?? b.timestamp ?? 0;
      return indexA - indexB;
    }),
  });

  const normalizedGroups: GroupedExerciseVM[] = [];
  for (const [key, group] of groups) {
    const normalized = normalizeGroup(group);
    groups.set(key, normalized);
    normalizedGroups.push(normalized);
  }

  const sessionOrder = exerciseOrder ?? [];
  const orderIndexMap = new Map<string, number>();
  sessionOrder.forEach((exerciseId, index) => {
    orderIndexMap.set(exerciseId, index);
  });

  const deriveGroupOrderIndex = (exerciseId: string): number => {
    const directIndex = orderIndexMap.get(exerciseId);
    if (directIndex !== undefined) {
      return directIndex;
    }

    const mainFromAlt = altToMainMap?.get(exerciseId);
    if (mainFromAlt) {
      const mappedIndex = orderIndexMap.get(mainFromAlt);
      if (mappedIndex !== undefined) {
        return mappedIndex;
      }
    }

    const group = groups.get(exerciseId);
    if (group) {
      const orderFromSet = group.sets.find(
        (set) => set.orderIndex !== undefined
      )?.orderIndex;
      if (orderFromSet !== undefined) {
        return orderFromSet;
      }

      for (const set of group.sets) {
        const candidateIds = set.exerciseIds ?? [set.exerciseId];
        for (const candidateId of candidateIds) {
          const candidateIndex = orderIndexMap.get(candidateId);
          if (candidateIndex !== undefined) {
            return candidateIndex;
          }
        }
      }
    }

    return Number.POSITIVE_INFINITY;
  };

  const placeholders: GroupedExerciseVM[] = [];
  for (const exerciseId of sessionOrder) {
    if (!groups.has(exerciseId)) {
      placeholders.push({
        exerciseId,
        exerciseName: getDisplayName(exerciseId, exercisesById),
        sets: [],
      });
    }
  }

  const orderedGroups = [...normalizedGroups, ...placeholders];
  orderedGroups.sort((a, b) => {
    const indexA = deriveGroupOrderIndex(a.exerciseId);
    const indexB = deriveGroupOrderIndex(b.exerciseId);
    if (indexA !== indexB) {
      return indexA - indexB;
    }

    const priorityA = orderIndexMap.has(a.exerciseId) ? 0 : 1;
    const priorityB = orderIndexMap.has(b.exerciseId) ? 0 : 1;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    if (indexA === Number.POSITIVE_INFINITY) {
      const firstA = a.sets[0];
      const firstB = b.sets[0];
      const timeA = firstA?.timestamp ?? 0;
      const timeB = firstB?.timestamp ?? 0;
      if (timeA !== timeB) {
        return timeA - timeB;
      }
    }

    return (a.exerciseName ?? "").localeCompare(b.exerciseName ?? "");
  });

  return orderedGroups;
}

const DEFAULT_WEIGHT_UNIT: WeightUnit = "kg";

export function useSessionViewModel(sessionId?: string): SessionViewModel {
  const sessionQuery = useSession(sessionId ?? "");
  const exercisesQuery = useExercises();
  const [accumulatedSets, setAccumulatedSets] = useState<LoggedSetDTO[]>([]);

  useEffect(() => {
    const reset = () => {
      setAccumulatedSets([]);
    };
    reset();
  }, [sessionId]);

  const loggedSetsQuery = useLoggedSets({
    sessionId: sessionId ?? undefined,
    sort: "timestamp",
  });

  const currentBatch = loggedSetsQuery.data ?? [];

  useEffect(() => {
    setAccumulatedSets(currentBatch);
  }, [currentBatch]);

  const exercisesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const exercise of exercisesQuery.data ?? []) {
      map.set(exercise.id, exercise.name);
    }
    return map;
  }, [exercisesQuery.data]);

  const planQuery = usePlan(sessionQuery.data?.sourcePlanId ?? "");
  const altToMainMap = useMemo(() => {
    const map = new Map<string, string>();
    const planExercises = planQuery.data?.planExercises ?? [];
    for (const planExercise of planExercises) {
      const alternativeId = planExercise.optionalAlternativeExerciseId;
      if (alternativeId) {
        map.set(alternativeId, planExercise.exerciseId);
      }
    }
    return map;
  }, [planQuery.data?.planExercises]);

  const groupedExercises = useMemo(
    () =>
      buildGroupedExercises({
        sets: accumulatedSets,
        exercisesById,
        exerciseOrder: sessionQuery.data?.exerciseOrder,
        altToMainMap,
      }),
    [
      accumulatedSets,
      exercisesById,
      sessionQuery.data?.exerciseOrder,
      altToMainMap,
    ]
  );

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
        setType: "main",
        status: "pending",
        timestamp: now,
        createdAt: now,
        exerciseIds: [exerciseId],
      };

      createLoggedSet.mutate(payload);
    },
    [sessionId, createLoggedSet]
  );

  const copySet = useCallback(
    (setId: string) => {
      if (!sessionId) return;

      const set = accumulatedSets.find((s) => s.id === setId);

      if (!set) return;

      const exerciseIds = [set.exerciseId];
      if (set.alternative?.exerciseId) {
        exerciseIds.push(set.alternative.exerciseId);
      }

      const payload: CreateLoggedSetCmd = {
        id: crypto.randomUUID() as UUID,
        sessionId,
        exerciseId: set.exerciseId,
        exerciseNameSnapshot: set.exerciseNameSnapshot,
        weight: set.weight ?? 0,
        weightUnit: set.weightUnit ?? DEFAULT_WEIGHT_UNIT,
        reps: set.reps ?? 1,
        setType: set.setType ?? "main",
        status: "pending",
        timestamp: Date.now(),
        createdAt: Date.now(),
        exerciseIds,
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

  const toggleSetStatus = useCallback(
    (setId: string) => {
      if (!sessionId) return;

      const targetSet = accumulatedSets.find((s) => s.id === setId);
      if (!targetSet) {
        return;
      }

      const currentStatus = targetSet.status ?? "pending";
      const nextStatus =
        currentStatus === "completed" ? "pending" : "completed";

      updateLoggedSet.mutate({ id: setId, status: nextStatus });
    },
    [sessionId, accumulatedSets, updateLoggedSet]
  );

  return {
    session: sessionQuery.data,
    groupedExercises,
    totals,
    isLoading,
    isSessionMissing,
    isMutating,
    isLoadingSets: loggedSetsQuery.isLoading,
    actions: {
      renameSession,
      toggleStatus,
      deleteSession: removeSession,
      addSet,
      copySet,
      deleteSet,
      updateSet,
      toggleSetStatus,
    },
  };
}
