import { STORE_NAMES, withTransaction } from "../db";
import type {
  ExerciseDTO,
  PlanDTO,
  SessionDTO,
  LoggedSetDTO,
  SettingEntryDTO,
} from "../../types";
import type { DuplicateStrategy } from "./importBackup";

const BACKUP_VERSION = 1;
const CHUNK_SIZE = 100;
type StoreName = (typeof STORE_NAMES)[keyof typeof STORE_NAMES];

export interface FullBackupV1 {
  version: typeof BACKUP_VERSION;
  exportedAt: number;
  exercises: ExerciseDTO[];
  plans: PlanDTO[];
  sessions: SessionDTO[];
  loggedSets: LoggedSetDTO[];
  settings: SettingEntryDTO[];
}

export interface FullBackupImportSummary {
  exerciseCount: number;
  planCount: number;
  sessionCount: number;
  loggedSetCount: number;
  settingCount: number;
}

export type FullBackupPreview = FullBackupImportSummary;

export function validateFullBackup(data: unknown): FullBackupV1 {
  if (typeof data !== "object" || data === null) {
    throw new Error("Backup must be an object.");
  }

  const backup = data as Partial<FullBackupV1>;

  if (backup.version !== BACKUP_VERSION) {
    throw new Error(
      `Unsupported backup version: ${backup.version ?? "unknown"} (expected ${BACKUP_VERSION}).`
    );
  }

  const arrays: Array<keyof FullBackupV1> = [
    "exercises",
    "plans",
    "sessions",
    "loggedSets",
    "settings",
  ];

  arrays.forEach((key) => {
    const value = (backup as Record<string, unknown>)[key];
    if (!Array.isArray(value)) {
      throw new Error(`Backup entry "${key}" must be an array.`);
    }
  });

  if (typeof backup.exportedAt !== "number" || Number.isNaN(backup.exportedAt)) {
    throw new Error("Backup timestamp is missing or invalid.");
  }

  return backup as FullBackupV1;
}

export async function importFullBackup(
  backup: FullBackupV1,
  strategy: DuplicateStrategy,
  onProgress?: (percent: number) => void
): Promise<FullBackupImportSummary> {
  const totalRecords =
    backup.exercises.length +
    backup.plans.length +
    backup.sessions.length +
    backup.loggedSets.length +
    backup.settings.length;
  let processedRecords = 0;
  const progressCallback = onProgress;
  const updateProgress = () => {
    processedRecords += 1;
    if (!progressCallback || totalRecords === 0) {
      return;
    }
    const percent = Math.min(
      100,
      Math.round((processedRecords / totalRecords) * 100)
    );
    progressCallback(percent);
  };

  const sessionIdMap = new Map<string, string>();
  const summary: FullBackupImportSummary = {
    exerciseCount: 0,
    planCount: 0,
    sessionCount: 0,
    loggedSetCount: 0,
    settingCount: 0,
  };

  await runChunked(
    backup.exercises,
    STORE_NAMES.exercises,
    async (store, entry) => {
      if (strategy === "skip" && (await store.get(entry.id))) {
        updateProgress();
        return;
      }
      await store.put(entry);
      summary.exerciseCount += 1;
      updateProgress();
    }
  );

  await runChunked(
    backup.plans,
    STORE_NAMES.plans,
    async (store, entry) => {
      if (strategy === "skip" && (await store.get(entry.id))) {
        updateProgress();
        return;
      }
      await store.put(entry);
      summary.planCount += 1;
      updateProgress();
    }
  );

  await runChunked(
    backup.sessions,
    STORE_NAMES.sessions,
    async (store, session) => {
      const existing = await store.get(session.id);
      if (strategy === "skip" && existing) {
        updateProgress();
        return;
      }

      let targetId = session.id;
      if (strategy === "createNew" && existing) {
        targetId = createUUID();
      }

      const payload: SessionDTO = {
        ...session,
        id: targetId,
      };

      await store.put(payload);
      summary.sessionCount += 1;
      sessionIdMap.set(session.id, targetId);
      updateProgress();
    }
  );

  await runChunked(
    backup.loggedSets,
    STORE_NAMES.loggedSets,
    async (store, loggedSet) => {
      const targetSessionId = sessionIdMap.get(loggedSet.sessionId);
      if (!targetSessionId) {
        updateProgress();
        return;
      }

      if (strategy === "skip" && (await store.get(loggedSet.id))) {
        updateProgress();
        return;
      }

      const payload: LoggedSetDTO = {
        ...loggedSet,
        sessionId: targetSessionId,
      };

      await store.put(payload);
      summary.loggedSetCount += 1;
      updateProgress();
    }
  );

  await withTransaction(
    STORE_NAMES.settings,
    "readwrite",
    async (db) => {
      const tx = db.transaction([STORE_NAMES.settings], "readwrite");
      const store = tx.objectStore(STORE_NAMES.settings);
      for (const entry of backup.settings) {
        await store.put(entry);
        summary.settingCount += 1;
        updateProgress();
      }
      await tx.done;
    }
  );

  onProgress?.(100);

  return summary;
}

async function runChunked<T extends { id: string }>(
  values: T[],
  storeName: StoreName,
  handler: (store: any, value: T) => Promise<void>
) {
  if (!values.length) {
    return;
  }

  for (let offset = 0; offset < values.length; offset += CHUNK_SIZE) {
    const chunk = values.slice(offset, offset + CHUNK_SIZE);
    await withTransaction(storeName, "readwrite", async (db) => {
      const tx = db.transaction([storeName], "readwrite");
      const store = tx.objectStore(storeName);
      for (const entry of chunk) {
        await handler(store, entry);
      }
      await tx.done;
    });
  }
}

function createUUID(): string {
  return (
    crypto.randomUUID?.() ??
    `backup-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}
