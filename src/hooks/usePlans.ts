// Hooks for Plan CRUD operations
// Handles workout plans and their exercises

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDB, STORE_NAMES } from "../lib/db";
import { v4 as uuidv4 } from "uuid";
import type {
  PlanDTO,
  CreatePlanCmd,
  UpdatePlanCmd,
  DeletePlanCmd,
  PlansQueryParams,
  InstantiateSessionFromPlanCmd,
  SessionDTO,
  LoggedSetDTO,
} from "../types";

const QUERY_KEY = "plans";

/**
 * Fetches all plans with optional filtering
 */
export function usePlans(params: PlansQueryParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const db = await getDB();
      const tx = db.transaction(STORE_NAMES.plans, "readonly");
      const store = tx.objectStore(STORE_NAMES.plans);

      let plans: PlanDTO[];

      // Filter by exerciseId using multiEntry index
      if (params.exerciseId) {
        const index = store.index("exerciseIds");
        plans = await index.getAll(params.exerciseId);
      } else {
        plans = await store.getAll();
      }

      // Text search on name
      if (params.q) {
        const query = params.q.toLowerCase();
        plans = plans.filter((plan) => plan.name.toLowerCase().includes(query));
      }

      // Sort
      if (params.sort === "name") {
        plans.sort((a, b) => a.name.localeCompare(b.name));
      } else if (params.sort === "createdAt") {
        plans.sort((a, b) => b.createdAt - a.createdAt);
      }

      // Pagination
      if (params.pagination) {
        const { page = 0, pageSize = 50 } = params.pagination;
        const start = page * pageSize;
        plans = plans.slice(start, start + pageSize);
      }

      return plans;
    },
  });
}

/**
 * Fetches a single plan by ID
 */
export function usePlan(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      const db = await getDB();

      // Get the plan first
      const plan = await db.get(STORE_NAMES.plans, id);
      if (!plan) return undefined;

      // Enrich planExercises with exercise name snapshots (join with exercises store)
      const tx = db.transaction(STORE_NAMES.exercises, "readonly");
      const exercisesStore = tx.objectStore(STORE_NAMES.exercises);

      const enrichedPlanExercises = await Promise.all(
        plan.planExercises.map(async (pe) => {
          const exerciseRecord = await exercisesStore.get(pe.exerciseId);
          // Preserve existing nameSnapshot if present, otherwise take from exercise record
          const nameSnapshot = pe.nameSnapshot ?? exerciseRecord?.name;

          return {
            ...pe,
            nameSnapshot,
          } as typeof pe;
        })
      );

      await tx.done;

      return {
        ...plan,
        planExercises: enrichedPlanExercises,
      };
    },
    enabled: !!id,
  });
}

/**
 * Creates a new plan
 * Automatically populates exerciseIds from planExercises
 */
export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (plan: CreatePlanCmd) => {
      const db = await getDB();

      // Ensure exerciseIds is populated
      const planToCreate: PlanDTO = {
        ...plan,
        exerciseIds: plan.planExercises.map((pe) => pe.exerciseId),
      };

      await db.add(STORE_NAMES.plans, planToCreate);
      return planToCreate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

/**
 * Updates an existing plan
 * Recalculates exerciseIds if planExercises changed
 */
export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cmd: UpdatePlanCmd) => {
      const db = await getDB();
      const existing = await db.get(STORE_NAMES.plans, cmd.id);
      if (!existing) {
        throw new Error(`Plan ${cmd.id} not found`);
      }

      const updated: PlanDTO = {
        ...existing,
        ...cmd,
        updatedAt: Date.now(),
        // Recalculate exerciseIds if planExercises changed
        exerciseIds: cmd.planExercises
          ? cmd.planExercises.map((pe) => pe.exerciseId)
          : existing.exerciseIds,
      };

      await db.put(STORE_NAMES.plans, updated);
      return updated;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, data.id] });
    },
  });
}

/**
 * Deletes a plan
 * Note: Does NOT delete sessions created from this plan (per PRD)
 */
export function useDeletePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cmd: DeletePlanCmd) => {
      const db = await getDB();

      // TODO: Consider adding to undo_trash before deletion
      await db.delete(STORE_NAMES.plans, cmd.id);

      return cmd.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

/**
 * Instantiates a new session from a plan
 * Copies planExercises into session exerciseOrder
 */
export function useInstantiateSessionFromPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cmd: InstantiateSessionFromPlanCmd) => {
      const db = await getDB();

      const tx = db.transaction(
        [
          STORE_NAMES.plans,
          STORE_NAMES.sessions,
          STORE_NAMES.loggedSets,
          STORE_NAMES.exercises,
        ],
        "readwrite"
      );
      const planStore = tx.objectStore(STORE_NAMES.plans);
      const sessionStore = tx.objectStore(STORE_NAMES.sessions);
      const loggedSetsStore = tx.objectStore(STORE_NAMES.loggedSets);
      const exercisesStore = tx.objectStore(STORE_NAMES.exercises);

      const plan = await planStore.get(cmd.planId);
      if (!plan) {
        throw new Error(`Plan ${cmd.planId} not found`);
      }

      const sessionIndex = sessionStore.index("sourcePlanId");
      const sessionsFromPlan = await sessionIndex.getAll(cmd.planId);
      const lastSession = sessionsFromPlan
        .sort((a, b) => b.date - a.date)
        .at(0);

      const lastSetByExercise = new Map<string, LoggedSetDTO>();
      if (lastSession) {
        const lastSessionSets = await loggedSetsStore
          .index("sessionId")
          .getAll(lastSession.id);
        for (const set of lastSessionSets) {
          const existing = lastSetByExercise.get(set.exerciseId);
          if (!existing || (set.timestamp ?? 0) > (existing.timestamp ?? 0)) {
            lastSetByExercise.set(set.exerciseId, set);
          }
        }
      }

      const session: SessionDTO = {
        id: cmd.id,
        name: cmd.overrides?.name ?? plan.name,
        date: cmd.overrides?.date ?? Date.now(),
        sourcePlanId: cmd.planId,
        exerciseOrder: plan.planExercises.map((pe) => pe.exerciseId),
        status: "active",
        createdAt: cmd.createdAt ?? Date.now(),
      };

      await sessionStore.add(session);

      const baseTimestamp = Date.now();
      for (const [
        exerciseOrderIndex,
        planExercise,
      ] of plan.planExercises.entries()) {
        const exerciseRecord = await exercisesStore.get(
          planExercise.exerciseId
        );
        const exerciseName = exerciseRecord?.name ?? "Exercise";
        const lastSet = lastSetByExercise.get(planExercise.exerciseId);
        const totalSets = Math.max(1, planExercise.defaultSets ?? 1);
        const weight = lastSet?.weight ?? planExercise.defaultWeight ?? 0;
        const reps = lastSet?.reps ?? planExercise.defaultReps ?? 8;
        const weightUnit = lastSet?.weightUnit ?? "kg";
        const setType = lastSet?.setType ?? "main";
        const altId = planExercise.optionalAlternativeExerciseId ?? null;
        const altExercise = altId ? await exercisesStore.get(altId) : null;
        const altDefaults = planExercise.alternativeDefaults;
        const lastAlternative = lastSet?.alternative;

        const altBase = altId
          ? {
              exerciseId: altId,
              nameSnapshot: altExercise?.name,
              weight: lastAlternative?.weight ?? altDefaults?.weight ?? weight,
              reps: lastAlternative?.reps ?? altDefaults?.reps ?? reps,
            }
          : null;

        for (let setIndex = 0; setIndex < totalSets; setIndex += 1) {
          const alternativeSnapshot = altBase ? { ...altBase } : null;

          const loggedSet: LoggedSetDTO = {
            id: uuidv4(),
            sessionId: cmd.id,
            exerciseId: planExercise.exerciseId,
            exerciseNameSnapshot: exerciseName,
            timestamp: baseTimestamp + setIndex,
            weight,
            weightUnit,
            reps,
            setType,
            setIndex,
            orderIndex: exerciseOrderIndex,
            alternative: alternativeSnapshot,
            notes: planExercise.notes,
            createdAt: baseTimestamp,
            exerciseIds: [
              planExercise.exerciseId,
              alternativeSnapshot?.exerciseId,
            ].filter(Boolean) as string[],
          };

          await loggedSetsStore.add(loggedSet);
        }
      }

      await tx.done;
      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["loggedSets"] });
    },
  });
}
