import { useQuery } from "@tanstack/react-query";
import type {
  IDBPObjectStore,
  IndexKey,
  IndexNames,
  StoreNames,
  StoreValue,
} from "idb";
import type { GymMateDB } from "../lib/db";
import { getDB, STORE_NAMES } from "../lib/db";
import type { ExerciseReferenceCheckResult, LoggedSetDTO } from "../types";

const PLAN_SAMPLE_LIMIT = 12;
const SESSION_SAMPLE_LIMIT = 6;

async function queryByIndexOrFallback<
  StoreName extends StoreNames<GymMateDB>,
  IndexName extends IndexNames<GymMateDB, StoreName>
>(
  store: IDBPObjectStore<
    GymMateDB,
    ArrayLike<StoreNames<GymMateDB>>,
    StoreName
  >,
  indexName: IndexName,
  key: IndexKey<GymMateDB, StoreName, IndexName>,
  fallback: (
    records: StoreValue<GymMateDB, StoreName>[]
  ) => StoreValue<GymMateDB, StoreName>[]
): Promise<StoreValue<GymMateDB, StoreName>[]> {
  try {
    const index = store.index(indexName);
    return await index.getAll(key);
  } catch (error) {
    console.warn(
      `[useExerciseReferenceCheck] Missing index "${indexName}", falling back to scan`,
      error
    );
    const allRecords = await store.getAll();
    return fallback(allRecords);
  }
}

async function fetchPlanReferences(
  store: IDBPObjectStore<GymMateDB, ArrayLike<StoreNames<GymMateDB>>, "plans">,
  exerciseId: string
) {
  return queryByIndexOrFallback(store, "exerciseIds", exerciseId, (records) =>
    records.filter(
      (plan) =>
        Array.isArray(plan.exerciseIds) && plan.exerciseIds.includes(exerciseId)
    )
  );
}

async function fetchLoggedSetReferences(
  store: IDBPObjectStore<
    GymMateDB,
    ArrayLike<StoreNames<GymMateDB>>,
    "loggedSets"
  >,
  exerciseId: string
) {
  return queryByIndexOrFallback(store, "exerciseIds", exerciseId, (records) =>
    records.filter(
      (set) =>
        Array.isArray(set.exerciseIds) && set.exerciseIds.includes(exerciseId)
    )
  );
}

async function buildSessionReferences(
  sessionStore: IDBPObjectStore<
    GymMateDB,
    ArrayLike<StoreNames<GymMateDB>>,
    "sessions"
  >,
  loggedSets: LoggedSetDTO[]
): Promise<ExerciseReferenceCheckResult["sessions"]> {
  const sampleMap = new Map<string, string>();
  const encounterOrder: string[] = [];

  for (const loggedSet of loggedSets) {
    const sessionId = loggedSet.sessionId;
    if (!sampleMap.has(sessionId)) {
      sampleMap.set(sessionId, loggedSet.id);
      encounterOrder.push(sessionId);

      if (encounterOrder.length >= SESSION_SAMPLE_LIMIT) {
        break;
      }
    }
  }

  const limitedSessionIds = encounterOrder.slice(0, SESSION_SAMPLE_LIMIT);
  const sessionNameMap = new Map<string, string | undefined>();

  await Promise.all(
    limitedSessionIds.map(async (sessionId) => {
      const session = await sessionStore.get(sessionId);
      sessionNameMap.set(sessionId, session?.name);
    })
  );

  return limitedSessionIds.map((sessionId) => ({
    sessionId,
    sessionName: sessionNameMap.get(sessionId),
    sampleLoggedSetId: sampleMap.get(sessionId),
  }));
}

async function collectReferences(
  exerciseId: string
): Promise<ExerciseReferenceCheckResult> {
  const db = await getDB();
  const tx = db.transaction(
    [STORE_NAMES.plans, STORE_NAMES.loggedSets, STORE_NAMES.sessions],
    "readonly"
  );

  const planStore = tx.objectStore(STORE_NAMES.plans);
  const loggedStore = tx.objectStore(STORE_NAMES.loggedSets);
  const sessionStore = tx.objectStore(STORE_NAMES.sessions);

  const [planRefs, loggedSets] = await Promise.all([
    fetchPlanReferences(planStore, exerciseId),
    fetchLoggedSetReferences(loggedStore, exerciseId),
  ]);

  const sessions = await buildSessionReferences(sessionStore, loggedSets);

  await tx.done;

  return {
    exerciseId,
    plans: planRefs.slice(0, PLAN_SAMPLE_LIMIT).map((plan) => ({
      planId: plan.id,
      planName: plan.name,
    })),
    sessions,
    loggedSetsCount: loggedSets.length,
  };
}

export async function loadExerciseReferenceCheck(
  exerciseId: string
): Promise<ExerciseReferenceCheckResult> {
  if (!exerciseId) {
    throw new Error("Exercise ID is required for reference check");
  }

  return collectReferences(exerciseId);
}

export function useExerciseReferenceCheck(exerciseId?: string) {
  return useQuery<ExerciseReferenceCheckResult | null>({
    queryKey: ["exerciseRefs", exerciseId],
    queryFn: () => (exerciseId ? collectReferences(exerciseId) : null),
    enabled: Boolean(exerciseId),
    staleTime: 1000 * 60 * 5,
  });
}
