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
 * Groups sets by date (ISO string) and computes max weight and total volume per day
 */
function computeTrendPoints(sets: LoggedSetDTO[]): TrendPoint[] {
  const pointsByDate = new Map<
    string,
    { maxWeight: number; totalVolume: number }
  >();

  for (const set of sets) {
    const dateKey = epochMsToDate(set.timestamp);
    const volume = set.weight * set.reps;

    const existing = pointsByDate.get(dateKey);
    if (existing) {
      existing.maxWeight = Math.max(existing.maxWeight, set.weight);
      existing.totalVolume += volume;
    } else {
      pointsByDate.set(dateKey, {
        maxWeight: set.weight,
        totalVolume: volume,
      });
    }
  }

  // Convert to array and sort by date
  return Array.from(pointsByDate.entries())
    .map(([date, stats]) => ({
      date,
      weight: stats.maxWeight,
      volume: stats.totalVolume,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Groups sets by session and computes total volume per session
 */
async function computeVolumePoints(
  sets: LoggedSetDTO[],
  db: Awaited<ReturnType<typeof getDB>>
): Promise<VolumePoint[]> {
  const volumeBySession = new Map<string, number>();

  for (const set of sets) {
    const volume = set.weight * set.reps;
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
async function computeTotals(sets: LoggedSetDTO[]): Promise<TotalsViewModel> {
  let totalVolume = 0;
  const sessionIds = new Set<string>();

  for (const set of sets) {
    totalVolume += set.weight * set.reps;
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
  const tx = db.transaction(STORE_NAMES.loggedSets, "readonly");
  const store = tx.objectStore(STORE_NAMES.loggedSets);

  let sets: LoggedSetDTO[];

  // Query by date range using timestamp index
  if (filters.dateFrom || filters.dateTo) {
    const index = store.index("timestamp");
    const fromMs = filters.dateFrom ? dateToEpochMs(filters.dateFrom) : 0;
    const toMs = filters.dateTo
      ? dateToEpochMs(filters.dateTo) + 86400000 - 1 // End of day
      : Date.now();

    const range = IDBKeyRange.bound(fromMs, toMs);
    sets = await index.getAll(range);
  } else {
    // No date filter - get all sets
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

      // Compute all analytics in parallel
      const [trendPoints, volumePoints, prItems, totals] = await Promise.all([
        Promise.resolve(computeTrendPoints(sets)),
        computeVolumePoints(sets, db),
        computePRs(sets, db, filters.includeAlternatives),
        computeTotals(sets),
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
