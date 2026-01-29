// Hooks for Exercise CRUD operations
// Uses React Query for caching and optimistic updates

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDB, STORE_NAMES } from "../lib/db";
import type {
  ExerciseDTO,
  CreateExerciseCmd,
  UpdateExerciseCmd,
  DeleteExerciseCmd,
  ExercisesQueryParams,
} from "../types";

const QUERY_KEY = "exercises";

/**
 * Fetches all exercises with optional filtering
 */
export function useExercises(params: ExercisesQueryParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const db = await getDB();
      const tx = db.transaction(STORE_NAMES.exercises, "readonly");
      const store = tx.objectStore(STORE_NAMES.exercises);

      // Apply filters
      let exercises: ExerciseDTO[];

      if (params.category) {
        const index = store.index("category");
        exercises = await index.getAll(params.category);
      } else if (params.equipment && params.equipment.length > 0) {
        // For equipment, we need to use multiEntry index
        const index = store.index("equipment");
        const allExercises = await Promise.all(
          params.equipment.map((eq) => index.getAll(eq))
        );
        // Merge and deduplicate
        exercises = Array.from(
          new Map(
            allExercises.flat().map((ex) => [ex.id, ex])
          ).values()
        );
      } else {
        exercises = await store.getAll();
      }

      // Text search on name
      if (params.q) {
        const query = params.q.toLowerCase();
        exercises = exercises.filter((ex) =>
          ex.name.toLowerCase().includes(query)
        );
      }

      // Sort
      if (params.sort === "name") {
        exercises.sort((a, b) => a.name.localeCompare(b.name));
      } else if (params.sort === "createdAt") {
        exercises.sort((a, b) => b.createdAt - a.createdAt);
      }

      // Pagination (simple slice-based)
      if (params.pagination) {
        const { page = 0, pageSize = 50 } = params.pagination;
        const start = page * pageSize;
        exercises = exercises.slice(start, start + pageSize);
      }

      return exercises;
    },
  });
}

/**
 * Fetches a single exercise by ID
 */
export function useExercise(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      const db = await getDB();
      return db.get(STORE_NAMES.exercises, id);
    },
    enabled: !!id,
  });
}

/**
 * Creates a new exercise
 */
export function useCreateExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exercise: CreateExerciseCmd) => {
      const db = await getDB();
      await db.add(STORE_NAMES.exercises, exercise);
      return exercise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
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
        updatedAt: Date.now(),
      };

      await db.put(STORE_NAMES.exercises, updated);
      return updated;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, data.id] });
    },
  });
}

/**
 * Deletes an exercise
 */
export function useDeleteExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cmd: DeleteExerciseCmd) => {
      const db = await getDB();
      
      // TODO: Consider adding to undo_trash before deletion
      await db.delete(STORE_NAMES.exercises, cmd.id);
      
      return cmd.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
