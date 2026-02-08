// Database migrations registry
// Each migration is versioned and should be idempotent

import type { IDBPDatabase } from "idb";
import type { PlanDTO } from "../../../types";

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
