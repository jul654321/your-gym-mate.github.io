import { getDB, STORE_NAMES } from "../db";
import type {
  ExerciseDTO,
  PlanDTO,
  SessionDTO,
  LoggedSetDTO,
  SettingEntryDTO,
} from "../../types";

const BACKUP_VERSION = 1;
const FILENAME_PREFIX = "gymmate-backup";

export interface FullBackupV1 {
  version: typeof BACKUP_VERSION;
  exportedAt: number;
  exercises: ExerciseDTO[];
  plans: PlanDTO[];
  sessions: SessionDTO[];
  loggedSets: LoggedSetDTO[];
  settings: SettingEntryDTO[];
}

export async function buildFullBackup(): Promise<FullBackupV1> {
  const exportedAt = Date.now();
  const db = await getDB();
  const [exercises, plans, sessions, loggedSets, settings] = await Promise.all([
    db.getAll(STORE_NAMES.exercises),
    db.getAll(STORE_NAMES.plans),
    db.getAll(STORE_NAMES.sessions),
    db.getAll(STORE_NAMES.loggedSets),
    db.getAll(STORE_NAMES.settings),
  ]);

  return {
    version: BACKUP_VERSION,
    exportedAt,
    exercises,
    plans,
    sessions,
    loggedSets,
    settings,
  };
}

export async function exportFullBackupToFile(): Promise<FullBackupV1> {
  const backup = await buildFullBackup();
  const payload = JSON.stringify(backup, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const dateLabel = new Date(backup.exportedAt).toISOString().slice(0, 10);
  const filename = `${FILENAME_PREFIX}-${dateLabel}.json`;

  await presentBlob(blob, filename);
  return backup;
}

async function presentBlob(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: "application/json" });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: "Your Gym Mate backup",
      });
      return;
    } catch (error) {
      console.warn("[exportFullBackup] Share aborted:", error);
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
