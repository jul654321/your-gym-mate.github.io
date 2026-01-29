// Database migrations registry
// Each migration is versioned and should be idempotent

import type { IDBPDatabase } from "idb";

export type MigrationFunction = (
  db: IDBPDatabase,
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
    // Initial schema is created in the main upgrade function
    // No additional migration needed
    console.log("[Migration v1] Initial schema created");
  },

  // Example for future migrations:
  // 2: async (db) => {
  //   // Add exerciseIds array to existing plans
  //   const tx = db.transaction('plans', 'readwrite');
  //   const store = tx.objectStore('plans');
  //   const plans = await store.getAll();
  //
  //   for (const plan of plans) {
  //     if (!plan.exerciseIds) {
  //       plan.exerciseIds = plan.planExercises.map(pe => pe.exerciseId);
  //       await store.put(plan);
  //     }
  //   }
  //
  //   await tx.done;
  //   console.log('[Migration v2] Added exerciseIds to plans');
  // },
};

/**
 * Runs all migrations between oldVersion and newVersion
 */
export async function runMigrations(
  db: IDBPDatabase,
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
