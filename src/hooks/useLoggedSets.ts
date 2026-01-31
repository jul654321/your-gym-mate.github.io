// Hooks for LoggedSet CRUD operations
// Central hook for workout tracking data

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDB, STORE_NAMES } from "../lib/db";
import type {
  LoggedSetDTO,
  CreateLoggedSetCmd,
  UpdateLoggedSetCmd,
  DeleteLoggedSetCmd,
  QuickAddSetCmd,
  LoggedSetsQueryParams,
} from "../types";

const QUERY_KEY = "loggedSets";

/**
 * Fetches logged sets with optional filtering
 */
export function useLoggedSets(params: LoggedSetsQueryParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const db = await getDB();
      const tx = db.transaction(STORE_NAMES.loggedSets, "readonly");
      const store = tx.objectStore(STORE_NAMES.loggedSets);

      let sets: LoggedSetDTO[];

      // Filter by sessionId
      if (params.sessionId) {
        const index = store.index("sessionId");
        sets = await index.getAll(params.sessionId);
      }
      // Filter by exerciseId (with optional alternatives)
      else if (params.exerciseId) {
        if (params.includeAlternatives) {
          // Use multiEntry index to include alternatives
          const index = store.index("exerciseIds");
          sets = await index.getAll(params.exerciseId);
        } else {
          // Use regular exerciseId index
          const index = store.index("exerciseId");
          sets = await index.getAll(params.exerciseId);
        }
      }
      // Date range query
      else if (params.dateRange?.from || params.dateRange?.to) {
        const index = store.index("timestamp");
        const range =
          params.dateRange.from && params.dateRange.to
            ? IDBKeyRange.bound(params.dateRange.from, params.dateRange.to)
            : params.dateRange.from
            ? IDBKeyRange.lowerBound(params.dateRange.from)
            : IDBKeyRange.upperBound(params.dateRange.to!);
        sets = await index.getAll(range);
      } else {
        sets = await store.getAll();
      }

      // Sort
      if (params.sort === "timestamp") {
        sets.sort((a, b) => b.timestamp - a.timestamp);
      } else if (params.sort === "weight") {
        sets.sort((a, b) => b.weight - a.weight);
      } else if (params.sort === "createdAt") {
        sets.sort((a, b) => b.createdAt - a.createdAt);
      }

      // Pagination
      if (params.pagination) {
        const { page = 0, pageSize = 100 } = params.pagination;
        const start = page * pageSize;
        sets = sets.slice(start, start + pageSize);
      }

      return sets;
    },
  });
}

/**
 * Fetches a single logged set by ID
 */
export function useLoggedSet(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      const db = await getDB();
      return db.get(STORE_NAMES.loggedSets, id);
    },
    enabled: !!id,
  });
}

/**
 * Gets the last logged set for a specific exercise
 * Useful for pre-filling weight/reps in quick-add flow
 */
export function useGetLastSetForExercise(exerciseId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, "last", exerciseId],
    queryFn: async () => {
      const db = await getDB();
      const tx = db.transaction(STORE_NAMES.loggedSets, "readonly");
      const index = tx
        .objectStore(STORE_NAMES.loggedSets)
        .index("exerciseId_timestamp");

      // Get all sets for this exercise, sorted by timestamp descending
      const cursor = await index.openCursor(
        IDBKeyRange.bound([exerciseId, 0], [exerciseId, Date.now()]),
        "prev"
      );

      return cursor?.value ?? null;
    },
    enabled: !!exerciseId,
  });
}

/**
 * Creates a new logged set
 */
export function useCreateLoggedSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (set: CreateLoggedSetCmd) => {
      const db = await getDB();
      const setToCreate: LoggedSetDTO = {
        ...set,
        exerciseIds: [
          set.exerciseId,
          ...(set.alternative ? [set.alternative.exerciseId] : []),
        ],
      };
      await db.add(STORE_NAMES.loggedSets, setToCreate);
      return setToCreate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

/**
 * Quick add set (optimistic update)
 */
export function useQuickAddSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cmd: QuickAddSetCmd) => {
      const db = await getDB();
      const set: LoggedSetDTO = {
        ...cmd,
        exerciseIds: [
          cmd.exerciseId,
          ...(cmd.alternative ? [cmd.alternative.exerciseId] : []),
        ],
      };
      await db.add(STORE_NAMES.loggedSets, set);
      return set;
    },
    onMutate: async (newSet) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY] });

      const previousSets = queryClient.getQueryData([QUERY_KEY]);

      queryClient.setQueryData(
        [QUERY_KEY, { sessionId: newSet.sessionId }],
        (old: LoggedSetDTO[] | undefined) => {
          return old
            ? [...old, newSet as LoggedSetDTO]
            : [newSet as LoggedSetDTO];
        }
      );

      return { previousSets };
    },
    onError: (_err, _newSet, context) => {
      // Rollback on error
      if (context?.previousSets) {
        queryClient.setQueryData([QUERY_KEY], context.previousSets);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

/**
 * Updates an existing logged set
 */
export function useUpdateLoggedSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cmd: UpdateLoggedSetCmd) => {
      const db = await getDB();
      const existing = await db.get(STORE_NAMES.loggedSets, cmd.id);
      if (!existing) {
        throw new Error(`Logged set ${cmd.id} not found`);
      }

      const updated: LoggedSetDTO = {
        ...existing,
        ...cmd,
        updatedAt: Date.now(),
        // Recalculate exerciseIds if alternative changed
        exerciseIds:
          cmd.alternative !== undefined
            ? [
                cmd.exerciseId ?? existing.exerciseId,
                ...(cmd.alternative ? [cmd.alternative.exerciseId] : []),
              ]
            : existing.exerciseIds,
      };

      await db.put(STORE_NAMES.loggedSets, updated);
      return updated;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, data.id] });
    },
  });
}

/**
 * Updates multiple logged sets in a single transaction.
 */
export function useBulkUpdateLoggedSets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cmds: UpdateLoggedSetCmd[]) => {
      if (cmds.length === 0) {
        return [];
      }

      const db = await getDB();
      const tx = db.transaction(STORE_NAMES.loggedSets, "readwrite");
      const store = tx.objectStore(STORE_NAMES.loggedSets);
      const updatedSets: LoggedSetDTO[] = [];

      for (const cmd of cmds) {
        const existing = await store.get(cmd.id);
        if (!existing) {
          throw new Error(`Logged set ${cmd.id} not found`);
        }

        const updated: LoggedSetDTO = {
          ...existing,
          ...cmd,
          updatedAt: Date.now(),
          exerciseIds:
            cmd.alternative !== undefined
              ? [
                  cmd.exerciseId ?? existing.exerciseId,
                  ...(cmd.alternative ? [cmd.alternative.exerciseId] : []),
                ]
              : existing.exerciseIds,
        };

        await store.put(updated);
        updatedSets.push(updated);
      }

      await tx.done;
      return updatedSets;
    },
    onSuccess: (_updated, commands: UpdateLoggedSetCmd[]) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      for (const cmd of commands) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, cmd.id] });
      }
    },
  });
}

/**
 * Deletes a logged set
 */
export function useDeleteLoggedSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cmd: DeleteLoggedSetCmd) => {
      const db = await getDB();

      // TODO: Consider adding to undo_trash before deletion
      await db.delete(STORE_NAMES.loggedSets, cmd.id);

      return cmd.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
