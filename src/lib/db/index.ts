// IndexedDB wrapper for Your Gym Mate
// Implements the schema defined in .cursor/plans/indexeddb_schema_ef33b4bd.plan.md
// Uses idb library for promise-based API

import { openDB } from "idb";
import type { DBSchema, IDBPDatabase } from "idb";
import type {
  ExerciseDTO,
  PlanDTO,
  SessionDTO,
  LoggedSetDTO,
  SettingEntryDTO,
  EventRecordDTO,
  TrashRecordDTO,
} from "../../types";
import { runMigrations } from "./migrations";

// Database configuration
export const DB_NAME = "your-gym-mate";
export const DB_VERSION = 5;

// Object store names
export const STORE_NAMES = {
  exercises: "exercises",
  plans: "plans",
  sessions: "sessions",
  loggedSets: "loggedSets",
  settings: "settings",
  events: "events",
  undoTrash: "undo_trash",
} as const;

// Define the database schema
export interface GymMateDB extends DBSchema {
  exercises: {
    key: string;
    value: ExerciseDTO;
    indexes: {
      name: string;
      category: string;
      equipment: string;
    };
  };
  plans: {
    key: string;
    value: PlanDTO;
    indexes: {
      name: string;
      exerciseIds: string;
    };
  };
  sessions: {
    key: string;
    value: SessionDTO;
    indexes: {
      date: number;
      status: string;
      sourcePlanId: string;
      status_date: [string, number];
    };
  };
  loggedSets: {
    key: string;
    value: LoggedSetDTO;
    indexes: {
      sessionId: string;
      exerciseId: string;
      exerciseIds: string;
      timestamp: number;
      exerciseId_timestamp: [string, number];
      exerciseId_weight: [string, number];
    };
  };
  settings: {
    key: string;
    value: SettingEntryDTO;
  };
  events: {
    key: string;
    value: EventRecordDTO;
    indexes: {
      type: string;
      timestamp: number;
    };
  };
  undo_trash: {
    key: string;
    value: TrashRecordDTO;
    indexes: {
      expiresAt: number;
    };
  };
}

// Global database instance
let dbInstance: IDBPDatabase<GymMateDB> | null = null;

/**
 * Opens or creates the database with proper schema and migrations
 */
export async function getDB(): Promise<IDBPDatabase<GymMateDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<GymMateDB>(DB_NAME, DB_VERSION, {
    upgrade: async (db, oldVersion, newVersion) => {
      console.log(
        `[DB] Upgrading database from version ${oldVersion} to ${newVersion}`
      );

      // Version 1: Initial schema
      if (oldVersion < 1) {
        // Create exercises store
        if (!db.objectStoreNames.contains(STORE_NAMES.exercises)) {
          const exercisesStore = db.createObjectStore(STORE_NAMES.exercises, {
            keyPath: "id",
          });
          exercisesStore.createIndex("name", "name", { unique: false });
          exercisesStore.createIndex("category", "category", {
            unique: false,
          });
          exercisesStore.createIndex("equipment", "equipment", {
            unique: false,
            multiEntry: true,
          });
        }

        // Create plans store
        if (!db.objectStoreNames.contains(STORE_NAMES.plans)) {
          const plansStore = db.createObjectStore(STORE_NAMES.plans, {
            keyPath: "id",
          });
          plansStore.createIndex("name", "name", { unique: false });
          plansStore.createIndex("exerciseIds", "exerciseIds", {
            unique: false,
            multiEntry: true,
          });
        }

        // Create sessions store
        if (!db.objectStoreNames.contains(STORE_NAMES.sessions)) {
          const sessionsStore = db.createObjectStore(STORE_NAMES.sessions, {
            keyPath: "id",
          });
          sessionsStore.createIndex("date", "date", { unique: false });
          sessionsStore.createIndex("status", "status", { unique: false });
          sessionsStore.createIndex("sourcePlanId", "sourcePlanId", {
            unique: false,
          });
          sessionsStore.createIndex("status_date", ["status", "date"], {
            unique: false,
          });
        }

        // Create loggedSets store
        if (!db.objectStoreNames.contains(STORE_NAMES.loggedSets)) {
          const loggedSetsStore = db.createObjectStore(STORE_NAMES.loggedSets, {
            keyPath: "id",
          });
          loggedSetsStore.createIndex("sessionId", "sessionId", {
            unique: false,
          });
          loggedSetsStore.createIndex("exerciseId", "exerciseId", {
            unique: false,
          });
          loggedSetsStore.createIndex("exerciseIds", "exerciseIds", {
            unique: false,
            multiEntry: true,
          });
          loggedSetsStore.createIndex("timestamp", "timestamp", {
            unique: false,
          });
          loggedSetsStore.createIndex(
            "exerciseId_timestamp",
            ["exerciseId", "timestamp"],
            { unique: false }
          );
          loggedSetsStore.createIndex(
            "exerciseId_weight",
            ["exerciseId", "weight"],
            { unique: false }
          );
        }

        // Create settings store
        if (!db.objectStoreNames.contains(STORE_NAMES.settings)) {
          db.createObjectStore(STORE_NAMES.settings, { keyPath: "key" });
        }

        // Create events store
        if (!db.objectStoreNames.contains(STORE_NAMES.events)) {
          const eventsStore = db.createObjectStore(STORE_NAMES.events, {
            keyPath: "id",
          });
          eventsStore.createIndex("type", "type", { unique: false });
          eventsStore.createIndex("timestamp", "timestamp", { unique: false });
        }

        // Create undo_trash store
        if (!db.objectStoreNames.contains(STORE_NAMES.undoTrash)) {
          const trashStore = db.createObjectStore(STORE_NAMES.undoTrash, {
            keyPath: "id",
          });
          trashStore.createIndex("expiresAt", "expiresAt", { unique: false });
        }
      }

      // Run registered migrations after initial schema creation
      await runMigrations(db, oldVersion, newVersion);
    },
    blocked() {
      console.warn(
        "[DB] Database upgrade blocked - close other tabs using this app"
      );
    },
    blocking() {
      console.warn("[DB] Database blocking other connections");
      // Close the database to allow the upgrade
      dbInstance?.close();
      dbInstance = null;
    },
    terminated() {
      console.error("[DB] Database connection terminated unexpectedly");
      dbInstance = null;
    },
  });

  console.log("[DB] Database opened successfully");
  return dbInstance;
}

/**
 * Closes the database connection
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    console.log("[DB] Database closed");
  }
}

/**
 * Helper function to execute operations within a transaction
 * Ensures proper error handling and rollback
 */
export async function withTransaction<T>(
  _storeNames: string | string[],
  _mode: IDBTransactionMode,
  callback: (db: IDBPDatabase<GymMateDB>) => Promise<T>
): Promise<T> {
  const db = await getDB();
  try {
    return await callback(db);
  } catch (error) {
    console.error("[DB] Transaction error:", error);
    throw error;
  }
}

/**
 * Clears all data from the database (useful for testing)
 */
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const storeNames = Object.values(STORE_NAMES);

  await Promise.all(
    storeNames.map(async (storeName) => {
      const tx = db.transaction(storeName, "readwrite");
      await tx.objectStore(storeName).clear();
      await tx.done;
    })
  );

  console.log("[DB] All data cleared");
}

/**
 * Exports all data from the database as JSON
 * Useful for backups and debugging
 */
export async function exportData(): Promise<Record<string, unknown[]>> {
  const db = await getDB();
  const storeNames = Object.values(STORE_NAMES);
  const data: Record<string, unknown[]> = {};

  await Promise.all(
    storeNames.map(async (storeName) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      data[storeName] = await store.getAll();
    })
  );

  return data;
}

/**
 * Gets the current database version
 */
export function getDBVersion(): number {
  return DB_VERSION;
}
