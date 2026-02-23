// Database migrations registry
// Each migration is versioned and should be idempotent

import type { IDBPDatabase } from "idb";
import type { GymMateDB } from "../index";
import { STORE_NAMES } from "../index";
import type { LoggedSetDTO, PlanDTO, PlanExerciseDTO, UUID } from "../../../types";

export type MigrationFunction = (
  db: IDBPDatabase<GymMateDB>,
  oldVersion: number,
  newVersion: number | null
) => Promise<void>;

/**
 * Registry of all database migrations
 * Key is the target version number
 */
export const migrations: Record<number, MigrationFunction> = {
  // Version 1: Initial schema (handled in main upgrade function)
  1: async () => {
    console.log("[Migration v1] Initial schema created");
  },

  2: async (db) => {
    const tx = db.transaction("plans", "readwrite");
    const store = tx.objectStore("plans");
    let cursor = await store.openCursor();
    let processed = 0;

    while (cursor) {
      const plan = cursor.value as PlanDTO;
      const shouldSetWeekday =
        !Object.prototype.hasOwnProperty.call(plan, "weekday") ||
        plan.weekday === undefined;

      if (shouldSetWeekday) {
        await cursor.update({ ...plan, weekday: null });
      }

      processed += 1;
      if (processed % 100 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      cursor = await cursor.continue();
    }

    await tx.done;
    console.log(
      "[Migration v2] Added `weekday` metadata to plans and backfilled missing values"
    );
  },
  3: async (db) => {
    const tx = db.transaction("plans", "readwrite");
    const store = tx.objectStore("plans");
    let cursor = await store.openCursor();
    let processed = 0;

    while (cursor) {
      const plan = cursor.value as PlanDTO;
      const hasWorkoutTypeField = Object.prototype.hasOwnProperty.call(
        plan,
        "workoutType"
      );
      if (!hasWorkoutTypeField || plan.workoutType === undefined) {
        await cursor.update({ ...plan, workoutType: null });
      }

      processed += 1;
      if (processed % 100 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      cursor = await cursor.continue();
    }

    await tx.done;
    console.log(
      "[Migration v3] Added `workoutType` metadata to plans and backfilled missing values"
    );
  },
  4: async (db) => {
    const tx = db.transaction("plans", "readwrite");
    const store = tx.objectStore("plans");
    let cursor = await store.openCursor();
    let processed = 0;

    while (cursor) {
      const plan = cursor.value as PlanDTO;
      let needsUpdate = false;

      const normalizedPlanExercises = plan.planExercises.map((exercise) => {
        if (Array.isArray(exercise.guideLinks)) {
          return exercise;
        }

        needsUpdate = true;
        return {
          ...exercise,
          guideLinks: [] as PlanExerciseDTO["guideLinks"],
        };
      });

      if (needsUpdate) {
        await cursor.update({
          ...plan,
          planExercises: normalizedPlanExercises,
        });
      }

      processed += 1;
      if (processed % 100 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      cursor = await cursor.continue();
    }

    await tx.done;
    console.log(
      "[Migration v4] Backfilled guideLinks arrays for existing plan exercises"
    );
  },
  5: async (db) => {
    const planTx = db.transaction(STORE_NAMES.plans, "readwrite");
    const planStore = planTx.objectStore(STORE_NAMES.plans);
    let planCursor = await planStore.openCursor();
    let planProcessed = 0;

    while (planCursor) {
      const plan = planCursor.value as PlanDTO;
      const derivedExerciseIds = plan.planExercises.map(
        (exercise) => exercise.exerciseId
      );
      const normalizedExerciseIds = Array.from(new Set(derivedExerciseIds));
      const currentExerciseIds = Array.isArray(plan.exerciseIds)
        ? plan.exerciseIds
        : [];

      const needsPlanUpdate =
        normalizedExerciseIds.length !== currentExerciseIds.length ||
        normalizedExerciseIds.some(
          (id, index) => currentExerciseIds[index] !== id
        );

      if (needsPlanUpdate) {
        await planCursor.update({
          ...plan,
          exerciseIds: normalizedExerciseIds,
        });
      }

      planProcessed += 1;
      if (planProcessed % 100 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      planCursor = await planCursor.continue();
    }

    await planTx.done;

    const loggedTx = db.transaction(STORE_NAMES.loggedSets, "readwrite");
    const loggedStore = loggedTx.objectStore(STORE_NAMES.loggedSets);
    let loggedCursor = await loggedStore.openCursor();
    let loggedProcessed = 0;

    while (loggedCursor) {
      const loggedSet = loggedCursor.value as LoggedSetDTO;
      const desiredIds = Array.from(
        new Set(
          [
            loggedSet.exerciseId,
            loggedSet.alternative?.exerciseId as UUID | undefined,
          ].filter(Boolean) as UUID[]
        )
      );
      const currentExerciseIds = Array.isArray(loggedSet.exerciseIds)
        ? loggedSet.exerciseIds
        : [];

      const hasNormalizedIds =
        desiredIds.length === currentExerciseIds.length &&
        desiredIds.every((id, index) => currentExerciseIds[index] === id);

      if (!hasNormalizedIds) {
        await loggedCursor.update({
          ...loggedSet,
          exerciseIds: desiredIds,
        });
      }

      loggedProcessed += 1;
      if (loggedProcessed % 100 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      loggedCursor = await loggedCursor.continue();
    }

    await loggedTx.done;

    console.log(
      "[Migration v5] Normalized `exerciseIds` for plans and logged sets"
    );
  },
};

/**
 * Runs all migrations between oldVersion and newVersion
 */
export async function runMigrations(
  db: IDBPDatabase<GymMateDB>,
  oldVersion: number,
  newVersion: number | null
): Promise<void> {
  if (!newVersion) {
    return;
  }

  const migrationsToRun = Object.keys(migrations)
    .map(Number)
    .filter((version) => version > oldVersion && version <= newVersion)
    .sort((a, b) => a - b);

  for (const version of migrationsToRun) {
    console.log(`[Migration] Running migration to version ${version}`);
    await migrations[version](db, oldVersion, newVersion);
  }
}
