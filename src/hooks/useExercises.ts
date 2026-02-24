// Hooks for Exercise CRUD operations
// Uses React Query for caching and optimistic updates

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import type { IDBPObjectStore, StoreNames } from "idb";
import { getDB, STORE_NAMES } from "../lib/db";
import { loadExerciseReferenceCheck } from "./useExerciseReferenceCheck";
import type { GymMateDB } from "../lib/db";
import type {
  CreateExerciseCmd,
  DeleteExerciseCmd,
  ExerciseDTO,
  ExerciseRefCounts,
  ExerciseViewModel,
  ExercisesQueryParams,
  TrashRecordDTO,
  UpdateExerciseCmd,
} from "../types";

const QUERY_KEY = "exercises";
const UNDO_WINDOW_MS = 10_000;

async function enrichWithReferenceCounts(
  exercises: ExerciseDTO[]
): Promise<ExerciseViewModel[]> {
  if (!exercises.length) {
    return exercises.map((exercise) => ({ ...exercise }));
  }

  const db = await getDB();
  const tx = db.transaction(
    [STORE_NAMES.plans, STORE_NAMES.loggedSets],
    "readonly"
  );
  const planIndex = tx.objectStore(STORE_NAMES.plans).index("exerciseIds");
  const loggedIndex = tx
    .objectStore(STORE_NAMES.loggedSets)
    .index("exerciseIds");

  const enriched = await Promise.all(
    exercises.map(async (exercise) => {
      const plans = await planIndex.count(exercise.id);
      const loggedSets = await loggedIndex.getAll(exercise.id);
      const sessionIds = new Set(loggedSets.map((set) => set.sessionId));

      return {
        ...exercise,
        refCounts: {
          plans,
          sessions: sessionIds.size,
          loggedSets: loggedSets.length,
        },
      };
    })
  );

  await tx.done;
  return enriched;
}

function applyFilters(
  store: IDBPObjectStore<
    GymMateDB,
    ArrayLike<StoreNames<GymMateDB>>,
    "exercises"
  >,
  params: ExercisesQueryParams
) {
  return (async () => {
    if (params.category) {
      return store.index("category").getAll(params.category);
    }

    if (params.equipment && params.equipment.length > 0) {
      const index = store.index("equipment");
      const sets = await Promise.all(
        params.equipment.map((value) => index.getAll(value))
      );

      return Array.from(
        new Map(
          sets.flat().map((exercise: ExerciseDTO) => [exercise.id, exercise])
        ).values()
      );
    }

    return store.getAll();
  })();
}

function applySearchAndSort(
  exercises: ExerciseDTO[],
  params: ExercisesQueryParams
): ExerciseDTO[] {
  let workingList = [...exercises];

  if (params.q) {
    const query = params.q.toLowerCase();
    workingList = workingList.filter((exercise) =>
      exercise.name.toLowerCase().includes(query)
    );
  }

  if (params.sort === "name") {
    workingList.sort((a, b) => a.name.localeCompare(b.name));
  } else if (params.sort === "createdAt") {
    workingList.sort((a, b) => b.createdAt - a.createdAt);
  }

  if (params.pagination) {
    const { page = 0, pageSize = 50 } = params.pagination;
    const start = page * pageSize;
    workingList = workingList.slice(start, start + pageSize);
  }

  return workingList;
}

/**
 * Fetches all exercises with optional filtering
 */
export function useExercises(params: ExercisesQueryParams = {}) {
  return useQuery<ExerciseViewModel[]>({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const db = await getDB();
      const tx = db.transaction(STORE_NAMES.exercises, "readonly");
      const store = tx.objectStore(STORE_NAMES.exercises);

      const filtered = await applyFilters(store, params);
      await tx.done;

      const sorted = applySearchAndSort(filtered, params);
      return enrichWithReferenceCounts(sorted);
    },
  });
}

/**
 * Fetches a single exercise by ID
 */
export function useExercise(id: string) {
  return useQuery<ExerciseDTO | undefined>({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      const db = await getDB();
      return db.get(STORE_NAMES.exercises, id);
    },
    enabled: !!id,
  });
}

function updateExerciseCache(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (items: ExerciseViewModel[]) => ExerciseViewModel[]
) {
  queryClient.setQueriesData<ExerciseViewModel[]>(
    { queryKey: [QUERY_KEY], exact: false },
    (existing) => updater(existing ?? [])
  );
}

function buildRefCountsSkeleton(): ExerciseRefCounts {
  return { plans: 0, sessions: 0, loggedSets: 0 };
}

/**
 * Creates a new exercise
 */
export function useCreateExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cmd: CreateExerciseCmd) => {
      const trimmedName = cmd.name.trim();
      if (!trimmedName) {
        throw new Error("Exercise name is required");
      }

      const now = Date.now();
      const exercise: ExerciseDTO = {
        id: uuidv4(),
        name: trimmedName,
        category: cmd.category,
        equipment: cmd.equipment ?? [],
        notes: cmd.notes,
        guideLinks: cmd.guideLinks,
        createdAt: now,
        updatedAt: now,
      exerciseType: cmd.exerciseType ?? "Bilateral",
      };

      const db = await getDB();
      await db.put(STORE_NAMES.exercises, exercise);
      return exercise;
    },
    onMutate: async (cmd) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY], exact: false });
      const optimistic: ExerciseViewModel = {
        id: `optimistic-${uuidv4()}`,
        name: cmd.name,
        category: cmd.category,
        equipment: cmd.equipment ?? [],
        notes: cmd.notes,
        guideLinks: cmd.guideLinks,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        refCounts: buildRefCountsSkeleton(),
        exerciseType: cmd.exerciseType ?? "Bilateral",
      };

      updateExerciseCache(queryClient, (items) => [optimistic, ...items]);
      return { optimisticId: optimistic.id };
    },
    onError: (_error, _variables, context) => {
      if (context?.optimisticId) {
        updateExerciseCache(queryClient, (items) =>
          items.filter((exercise) => exercise.id !== context.optimisticId)
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY], exact: false });
    },
  });
}

/**
 * Updates an existing exercise
 */
export function useUpdateExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cmd: UpdateExerciseCmd) => {
      const db = await getDB();
      const existing = await db.get(STORE_NAMES.exercises, cmd.id);
      if (!existing) {
        throw new Error(`Exercise ${cmd.id} not found`);
      }

      const updated: ExerciseDTO = {
        ...existing,
        ...cmd,
        category: cmd.category ?? existing.category,
        equipment: cmd.equipment ?? existing.equipment,
        updatedAt: Date.now(),
      };

      await db.put(STORE_NAMES.exercises, updated);
      return updated;
    },
    onMutate: async (cmd) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY], exact: false });
      updateExerciseCache(queryClient, (items) =>
        items.map((exercise) =>
          exercise.id === cmd.id
            ? {
                ...exercise,
                ...cmd,
                updatedAt: Date.now(),
              }
            : exercise
        )
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY], exact: false });
    },
  });
}

/**
 * Deletes an exercise (with undo support)
 */
export function useDeleteExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cmd: DeleteExerciseCmd) => {
      const references = await loadExerciseReferenceCheck(cmd.id);
      const isReferenced =
        references.loggedSetsCount > 0 ||
        references.plans.length > 0 ||
        references.sessions.length > 0;

      if (isReferenced) {
        throw {
          code: "conflict",
          message: "Exercise still referenced",
          details: references,
        };
      }

      const db = await getDB();
      const tx = db.transaction(
        [
          STORE_NAMES.exercises,
          STORE_NAMES.plans,
          STORE_NAMES.loggedSets,
          STORE_NAMES.undoTrash,
        ],
        "readwrite"
      );

      const exerciseStore = tx.objectStore(STORE_NAMES.exercises);
      const planStore = tx.objectStore(STORE_NAMES.plans);
      const loggedStore = tx.objectStore(STORE_NAMES.loggedSets);
      const undoStore = tx.objectStore(STORE_NAMES.undoTrash);

      const exercise = await exerciseStore.get(cmd.id);
      if (!exercise) {
        throw { code: "db", message: "Exercise not found" };
      }

      const planCount = await planStore.index("exerciseIds").count(cmd.id);
      const loggedSets = await loggedStore.index("exerciseIds").getAll(cmd.id);
      const sessionCount = new Set(loggedSets.map((set) => set.sessionId)).size;

      if (planCount > 0 || loggedSets.length > 0) {
        throw {
          code: "conflict",
          message: "Exercise still referenced",
          details: {
            exerciseId: cmd.id,
            plans: planCount,
            sessions: sessionCount,
            loggedSets: loggedSets.length,
          },
        };
      }

      await exerciseStore.delete(cmd.id);

      const undoId = uuidv4();
      const now = Date.now();
      const trash: TrashRecordDTO = {
        id: undoId,
        storeName: STORE_NAMES.exercises,
        payload: exercise,
        deletedAt: now,
        expiresAt: now + UNDO_WINDOW_MS,
      };

      await undoStore.put(trash);
      await tx.done;

      return { id: cmd.id, undoId, movedToUndoAt: now, references };
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY], exact: false });
      updateExerciseCache(queryClient, (items) =>
        items.filter((exercise) => exercise.id !== id)
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY], exact: false });
    },
  });
}
