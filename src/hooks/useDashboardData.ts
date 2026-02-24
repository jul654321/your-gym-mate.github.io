// Hook for computing dashboard analytics from IndexedDB
// Implements PR calculation, volume aggregation, and trend analysis

import { useQuery } from "@tanstack/react-query";
import { getDB, STORE_NAMES } from "../lib/db";
import type {
  DashboardFilters,
  DashboardViewModel,
  TrendPoint,
  VolumePoint,
  PRItem,
  TotalsViewModel,
  LoggedSetDTO,
  ExerciseDTO,
  ExerciseType,
  UUID,
} from "../types";

const QUERY_KEY = "dashboard";

/**
 * Converts ISO date string to epoch ms (start of day UTC)
 */
function dateToEpochMs(dateStr: string): number {
  const date = new Date(dateStr);
  return Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0
  );
}

/**
 * Converts epoch ms to ISO date string
 */
function epochMsToDate(epochMs: number): string {
  const date = new Date(epochMs);
  return date.toISOString().split("T")[0];
}

/**
 * Groups sets by the session date and computes max weight and total volume per day
 */
async function computeTrendPoints(
  sets: LoggedSetDTO[],
  db: Awaited<ReturnType<typeof getDB>>,
  exerciseTypeMap: Map<UUID, ExerciseType>
): Promise<TrendPoint[]> {
  if (sets.length === 0) {
    return [];
  }

  const statsBySession = new Map<
    string,
    { maxWeight: number; totalVolume: number; totalReps: number }
  >();

  for (const set of sets) {
    const volume =
      set.weight *
      set.reps *
      volumeMultiplier(set.exerciseId, exerciseTypeMap);
    const existing = statsBySession.get(set.sessionId);
    if (existing) {
      existing.maxWeight = Math.max(existing.maxWeight, set.weight);
      existing.totalVolume += volume;
      existing.totalReps += set.reps * volumeMultiplier(set.exerciseId, exerciseTypeMap);
    } else {
      statsBySession.set(set.sessionId, {
        maxWeight: set.weight,
        totalVolume: volume,
        totalReps: set.reps * volumeMultiplier(set.exerciseId, exerciseTypeMap),
      });
    }
  }

  const sessionIds = Array.from(statsBySession.keys());
  const sessions = await Promise.all(
    sessionIds.map((id) => db.get(STORE_NAMES.sessions, id))
  );

  const pointsByDate = new Map<
    string,
    { maxWeight: number; totalVolume: number; totalReps: number }
  >();

  for (const session of sessions) {
    if (!session) {
      continue;
    }

    const stats = statsBySession.get(session.id);
    if (!stats) {
      continue;
    }

    const dateKey = epochMsToDate(session.date);
    const existing = pointsByDate.get(dateKey);
    if (existing) {
      existing.maxWeight = Math.max(existing.maxWeight, stats.maxWeight);
      existing.totalVolume += stats.totalVolume;
    } else {
      pointsByDate.set(dateKey, { ...stats });
    }
  }

  return Array.from(pointsByDate.entries())
    .map(([date, stats]) => ({
      date,
      weight: stats.maxWeight,
      volume: stats.totalVolume,
      reps: stats.totalReps,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Groups sets by session and computes total volume per session
 */
async function computeVolumePoints(
  sets: LoggedSetDTO[],
  db: Awaited<ReturnType<typeof getDB>>,
  exerciseTypeMap: Map<UUID, ExerciseType>
): Promise<VolumePoint[]> {
  const volumeBySession = new Map<string, number>();

  for (const set of sets) {
    const volume =
      set.weight *
      set.reps *
      volumeMultiplier(set.exerciseId, exerciseTypeMap);
    const existing = volumeBySession.get(set.sessionId);
    volumeBySession.set(set.sessionId, (existing || 0) + volume);
  }

  // Fetch session dates
  const sessionIds = Array.from(volumeBySession.keys());
  const sessions = await Promise.all(
    sessionIds.map((id) => db.get(STORE_NAMES.sessions, id))
  );

  const points: VolumePoint[] = [];
  for (const session of sessions) {
    if (session) {
      points.push({
        sessionId: session.id,
        date: epochMsToDate(session.date),
        volume: volumeBySession.get(session.id) || 0,
      });
    }
  }

  // Sort by date
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Computes personal records (max weight) per exercise
 */
async function computePRs(
  sets: LoggedSetDTO[],
  db: Awaited<ReturnType<typeof getDB>>,
  includeAlternatives: boolean
): Promise<PRItem[]> {
  const prByExercise = new Map<
    string,
    { weight: number; date: number; setId: string; isAlternative?: boolean }
  >();

  for (const set of sets) {
    // Primary exercise PR
    const primaryPR = prByExercise.get(set.exerciseId);
    if (!primaryPR || set.weight > primaryPR.weight) {
      prByExercise.set(set.exerciseId, {
        weight: set.weight,
        date: set.timestamp,
        setId: set.id,
        isAlternative: false,
      });
    }

    // Alternative exercise PR (if includeAlternatives)
    if (includeAlternatives && set.alternative) {
      const altExerciseId = set.alternative.exerciseId;
      const altWeight = set.alternative.weight || set.weight;
      const altPR = prByExercise.get(altExerciseId);
      if (!altPR || altWeight > altPR.weight) {
        prByExercise.set(altExerciseId, {
          weight: altWeight,
          date: set.timestamp,
          setId: set.id,
          isAlternative: true,
        });
      }
    }
  }

  // Fetch exercise names
  const exerciseIds = Array.from(prByExercise.keys());
  const exercises = await Promise.all(
    exerciseIds.map((id) => db.get(STORE_NAMES.exercises, id))
  );

  const exerciseMap = new Map<string, ExerciseDTO>();
  for (const ex of exercises) {
    if (ex) {
      exerciseMap.set(ex.id, ex);
    }
  }

  // Build PR items
  const items: PRItem[] = [];
  for (const [exerciseId, pr] of prByExercise.entries()) {
    const exercise = exerciseMap.get(exerciseId);
    if (exercise) {
      items.push({
        exerciseId,
        exerciseName: exercise.name,
        weight: pr.weight,
        dateAchieved: epochMsToDate(pr.date),
        setId: pr.setId,
        isAlternative: pr.isAlternative,
      });
    }
  }

  // Sort by weight descending
  return items.sort((a, b) => b.weight - a.weight);
}

/**
 * Computes total statistics
 */
async function computeTotals(
  sets: LoggedSetDTO[],
  exerciseTypeMap: Map<UUID, ExerciseType>
): Promise<TotalsViewModel> {
  let totalVolume = 0;
  const sessionIds = new Set<string>();

  for (const set of sets) {
    totalVolume +=
      set.weight *
      set.reps *
      volumeMultiplier(set.exerciseId, exerciseTypeMap);
    sessionIds.add(set.sessionId);
  }

  const totalSessions = sessionIds.size;
  const avgSessionVolume = totalSessions > 0 ? totalVolume / totalSessions : 0;

  return {
    totalVolume,
    totalSessions,
    avgSessionVolume,
  };
}

/**
 * Fetches and filters logged sets based on dashboard filters
 */
async function fetchFilteredSets(
  filters: DashboardFilters,
  db: Awaited<ReturnType<typeof getDB>>
): Promise<LoggedSetDTO[]> {
  let sets: LoggedSetDTO[];
  let sessionIdsByDate: Set<string> | null = null;

  if (filters.dateFrom || filters.dateTo) {
    const sessionTx = db.transaction(STORE_NAMES.sessions, "readonly");
    const sessionStore = sessionTx.objectStore(STORE_NAMES.sessions);
    const index = sessionStore.index("date");

    const fromMs = filters.dateFrom
      ? dateToEpochMs(filters.dateFrom)
      : undefined;
    const toMs = filters.dateTo
      ? dateToEpochMs(filters.dateTo) + 86400000 - 1 // End of day
      : undefined;

    let range: IDBKeyRange;
    if (fromMs !== undefined && toMs !== undefined) {
      range = IDBKeyRange.bound(fromMs, toMs);
    } else if (fromMs !== undefined) {
      range = IDBKeyRange.lowerBound(fromMs);
    } else if (toMs !== undefined) {
      range = IDBKeyRange.upperBound(toMs);
    } else {
      range = IDBKeyRange.lowerBound(0);
    }

    const sessionsInRange = await index.getAll(range);
    sessionIdsByDate = new Set(sessionsInRange.map((session) => session.id));
    if (sessionIdsByDate.size === 0) {
      return [];
    }
  }

  let sessionIdsByPlan: Set<string> | null = null;
  if (filters.planIds.length > 0) {
    const planSessionTx = db.transaction(STORE_NAMES.sessions, "readonly");
    const planSessionStore = planSessionTx.objectStore(STORE_NAMES.sessions);
    const planIndex = planSessionStore.index("sourcePlanId");

    const sessionsByPlan = await Promise.all(
      filters.planIds.map((planId) => planIndex.getAll(planId))
    );
    const planSessionIds = sessionsByPlan.flat().map((session) => session.id);
    sessionIdsByPlan = new Set(planSessionIds);
    if (sessionIdsByPlan.size === 0) {
      return [];
    }
  }

  let targetSessionIds: Set<string> | null = null;
  if (sessionIdsByDate && sessionIdsByPlan) {
    const intersection = new Set(
      Array.from(sessionIdsByDate).filter((id) => sessionIdsByPlan!.has(id))
    );
    if (intersection.size === 0) {
      return [];
    }
    targetSessionIds = intersection;
  } else if (sessionIdsByDate) {
    targetSessionIds = sessionIdsByDate;
  } else if (sessionIdsByPlan) {
    targetSessionIds = sessionIdsByPlan;
  }

  if (targetSessionIds) {
    const loggedSetsTx = db.transaction(STORE_NAMES.loggedSets, "readonly");
    const loggedSetsStore = loggedSetsTx.objectStore(STORE_NAMES.loggedSets);
    const sessionIndex = loggedSetsStore.index("sessionId");
    const setsBySession = await Promise.all(
      Array.from(targetSessionIds).map((sessionId) =>
        sessionIndex.getAll(sessionId)
      )
    );
    sets = setsBySession.flat();
  } else {
    const tx = db.transaction(STORE_NAMES.loggedSets, "readonly");
    const store = tx.objectStore(STORE_NAMES.loggedSets);
    sets = await store.getAll();
  }

  // Filter by exercise IDs
  if (filters.exerciseIds.length > 0) {
    const exerciseIdSet = new Set(filters.exerciseIds);
    sets = sets.filter((set) => {
      if (exerciseIdSet.has(set.exerciseId)) {
        return true;
      }
      // Include if alternative matches and includeAlternatives is true
      if (filters.includeAlternatives && set.alternative) {
        return exerciseIdSet.has(set.alternative.exerciseId);
      }
      return false;
    });
  }

  // Filter by weight range
  if (filters.minWeight !== undefined) {
    sets = sets.filter((set) => set.weight >= filters.minWeight!);
  }
  if (filters.maxWeight !== undefined) {
    sets = sets.filter((set) => set.weight <= filters.maxWeight!);
  }

  // Filter by reps range
  if (filters.minReps !== undefined) {
    sets = sets.filter((set) => set.reps >= filters.minReps!);
  }
  if (filters.maxReps !== undefined) {
    sets = sets.filter((set) => set.reps <= filters.maxReps!);
  }

  return sets;
}

function buildExerciseTypeMap(
  db: Awaited<ReturnType<typeof getDB>>,
  sets: LoggedSetDTO[]
): Promise<Map<UUID, ExerciseType>> {
  const map = new Map<UUID, ExerciseType>();
  const exerciseIds = Array.from(new Set(sets.map((set) => set.exerciseId)));
  if (!exerciseIds.length) {
    return Promise.resolve(map);
  }

  return Promise.all(
    exerciseIds.map((id) => db.get(STORE_NAMES.exercises, id))
  ).then((exercises) => {
    for (const exercise of exercises) {
      if (exercise) {
        map.set(exercise.id, exercise.exerciseType ?? "Bilateral");
      }
    }
    return map;
  });
}

function volumeMultiplier(
  exerciseId: UUID,
  map: Map<UUID, ExerciseType>
): number {
  return map.get(exerciseId) === "Unilateral" ? 2 : 1;
}

/**
 * Main hook for dashboard data
 * Returns aggregated analytics based on filters
 */
export function useDashboardData(filters: DashboardFilters) {
  return useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: async (): Promise<DashboardViewModel> => {
      const db = await getDB();

      // Fetch filtered sets
      const sets = await fetchFilteredSets(filters, db);

      const exerciseTypeMap = await buildExerciseTypeMap(db, sets);

      const [trendPoints, volumePoints, prItems, totals] = await Promise.all([
        computeTrendPoints(sets, db, exerciseTypeMap),
        computeVolumePoints(sets, db, exerciseTypeMap),
        computePRs(sets, db, filters.includeAlternatives),
        computeTotals(sets, exerciseTypeMap),
      ]);

      return {
        trendPoints,
        volumePoints,
        prItems,
        totals,
      };
    },
    // Keep data fresh but don't refetch too aggressively
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });
}
