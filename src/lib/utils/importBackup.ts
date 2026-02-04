import { getDB, STORE_NAMES, withTransaction } from "../db";
import type { LoggedSetDTO, SessionDTO, SessionStatus } from "../../types";
import type { SessionExportRow } from "../../hooks/useExportBackup";

export type DuplicateStrategy = "skip" | "createNew";

export interface DuplicateReport {
  idMatches: string[];
  nameDateMatches: string[];
}

export interface SessionLookup {
  byId: Map<string, SessionDTO>;
  byNameDate: Map<string, SessionDTO>;
}

export interface SessionGroupPayload {
  key: string;
  rows: SessionExportRow[];
  sessionId: string;
}

export interface ImportSummary {
  importId: string;
  sessionIds: string[];
  loggedSetIds: string[];
  rowCount: number;
  filename: string;
}

export interface ParsedImportRow {
  rowIndex: number;
  data: SessionExportRow;
  issues: string[];
}

interface ImportPayloadsOptions {
  rows: SessionExportRow[];
  duplicateStrategy: DuplicateStrategy;
  filename: string;
  onProgress?: (percent: number) => void;
  chunkSize?: number;
  lookup?: SessionLookup;
}

function parseCSV(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];

    if (char === '"') {
      if (inQuotes && normalized[i + 1] === '"') {
        current += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if (char === "\n" && !inQuotes) {
      row.push(current);
      rows.push(row);
      current = "";
      row = [];
      continue;
    }

    current += char;
  }

  if (inQuotes) {
    throw new Error("Malformed CSV: unmatched quotes detected.");
  }

  if (current || row.length) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

export function parseCsvText(text: string) {
  return parseCSV(text);
}

export function parseEpochMs(value?: string): number {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return Number.NaN;
  }

  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) {
    return numeric;
  }

  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseOptionalEpochMs(value?: string): number | "" {
  const parsed = parseEpochMs(value);
  return Number.isFinite(parsed) ? parsed : "";
}

function toNumber(value?: string): number {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return Number.NaN;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function toOptionalNumber(value?: string): number | "" {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return "";
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : "";
}

function toSessionStatus(value?: string): SessionStatus {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "active" ? "active" : "completed";
}

export function buildSessionRow(
  cells: Record<string, string>
): SessionExportRow {
  return {
    sessionId: cells["Session ID"]?.trim() ?? "",
    sessionName: cells["Session name"]?.trim() ?? "",
    sessionDate: parseEpochMs(cells["Session date"]),
    sessionCreatedAt: parseEpochMs(cells["Session created"]),
    sessionUpdatedAt: parseOptionalEpochMs(cells["Session updated"]),
    sessionStatus: toSessionStatus(cells["Session status"]),
    sourcePlanId: cells["Source plan ID"]?.trim() ?? "",
    setId: cells["Set ID"]?.trim() ?? "",
    exerciseId: cells["Exercise ID"]?.trim() ?? "",
    exerciseName: cells["Exercise name"]?.trim() ?? "",
    weight: toNumber(cells["Weight"]),
    weightUnit: cells["Unit"]?.trim() ?? "",
    reps: toNumber(cells["Reps"]),
    timestamp: parseEpochMs(cells["Set timestamp"]),
    orderIndex: toOptionalNumber(cells["Order index"]),
    notes: cells["Notes"]?.trim() ?? "",
    alternativeExerciseId: cells["Alternative exercise ID"]?.trim() ?? "",
    alternativeExerciseName: cells["Alternative name"]?.trim() ?? "",
    alternativeWeight: toOptionalNumber(cells["Alternative weight"]),
    alternativeReps: toOptionalNumber(cells["Alternative reps"]),
    setCreatedAt: parseEpochMs(cells["Set created"]),
    setUpdatedAt: parseOptionalEpochMs(cells["Set updated"]),
  };
}

export function validateRow(row: SessionExportRow): string[] {
  const issues: string[] = [];
  if (!row.sessionStatus) {
    issues.push("Session status is missing");
  }
  if (!row.setId) {
    issues.push("Set ID is missing");
  }
  if (!row.exerciseId) {
    issues.push("Exercise ID is missing");
  }
  if (!Number.isFinite(row.weight)) {
    issues.push("Weight is missing or not a number");
  }
  if (!Number.isFinite(row.reps)) {
    issues.push("Reps is missing or not a number");
  }
  return issues;
}

export async function gatherSessionLookup(): Promise<SessionLookup> {
  const db = await getDB();
  const sessions = await db.getAll(STORE_NAMES.sessions);
  const byId = new Map<string, SessionDTO>();
  const byNameDate = new Map<string, SessionDTO>();
  sessions.forEach((session) => {
    byId.set(session.id, session);
    const normalizedName = (session.name ?? "").trim().toLowerCase();
    const key = `${session.date}:${normalizedName}`;
    byNameDate.set(key, session);
  });
  return { byId, byNameDate };
}

function resolveSessionDate(row: SessionExportRow): number {
  return Number.isFinite(row.sessionDate)
    ? row.sessionDate
    : row.sessionCreatedAt;
}

export function computeDuplicateReport(
  rows: ParsedImportRow[],
  lookup: SessionLookup
): DuplicateReport {
  const idMatches = new Set<string>();
  const nameDateMatches = new Set<string>();

  rows.forEach(({ data }) => {
    if (data.sessionId && lookup.byId.has(data.sessionId)) {
      idMatches.add(data.sessionId);
      return;
    }

    const normalizedName = (data.sessionName ?? "").trim().toLowerCase();
    const key = `${resolveSessionDate(data)}:${normalizedName}`;
    const match = lookup.byNameDate.get(key);
    if (match) {
      nameDateMatches.add(match.id);
    }
  });

  return {
    idMatches: Array.from(idMatches),
    nameDateMatches: Array.from(nameDateMatches),
  };
}

function normalizeNameDate(row: SessionExportRow): string {
  const name = (row.sessionName ?? "").trim().toLowerCase();
  return `${resolveSessionDate(row)}:${name}`;
}

export function buildSessionGroups(
  rows: SessionExportRow[],
  lookup: SessionLookup,
  strategy: DuplicateStrategy,
  assignIds: boolean
): SessionGroupPayload[] {
  const map = new Map<string, SessionGroupPayload>();

  rows.forEach((row) => {
    const fallbackKey = `${(row.sessionName ?? "").trim()}:${resolveSessionDate(
      row
    )}`;
    const key = row.sessionId?.trim() || fallbackKey;
    const normalizedNameDate = normalizeNameDate(row);
    const exactMatch = row.sessionId
      ? lookup.byId.get(row.sessionId)
      : undefined;
    const fuzzyMatch = lookup.byNameDate.get(normalizedNameDate);
    const existingSession = exactMatch ?? fuzzyMatch;

    if (strategy === "skip" && existingSession) {
      return;
    }

    let group = map.get(key);
    if (!group) {
      const sessionId = assignIds
        ? existingSession && strategy === "createNew"
          ? createUUID()
          : row.sessionId?.trim() || createUUID()
        : row.sessionId?.trim() || "";

      group = {
        key,
        sessionId,
        rows: [],
      };
      map.set(key, group);
    }

    group.rows.push(row);
  });

  return Array.from(map.values());
}

function createUUID(): string {
  return (
    crypto.randomUUID?.() ??
    `import-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

function createSessionPayload(
  row: SessionExportRow,
  sessionId: string
): SessionDTO {
  return {
    id: sessionId,
    name: row.sessionName || undefined,
    date: Number.isFinite(row.sessionDate)
      ? row.sessionDate
      : row.sessionCreatedAt,
    status: row.sessionStatus,
    sourcePlanId: row.sourcePlanId || undefined,
    createdAt: Number.isFinite(row.sessionCreatedAt)
      ? row.sessionCreatedAt
      : Date.now(),
    updatedAt: Number.isFinite(row.sessionUpdatedAt)
      ? row.sessionUpdatedAt
      : undefined,
  };
}

function createLoggedSetPayload(
  row: SessionExportRow,
  sessionId: string
): LoggedSetDTO {
  const altExerciseId = row.alternativeExerciseId || undefined;
  const altSnapshot =
    altExerciseId || row.alternativeExerciseName
      ? {
          exerciseId: altExerciseId ?? createUUID(),
          nameSnapshot: row.alternativeExerciseName || undefined,
          weight:
            typeof row.alternativeWeight === "number"
              ? row.alternativeWeight
              : undefined,
          reps:
            typeof row.alternativeReps === "number"
              ? row.alternativeReps
              : undefined,
        }
      : null;

  const exerciseIds = new Set<string>();
  exerciseIds.add(row.exerciseId);
  if (altSnapshot?.exerciseId) {
    exerciseIds.add(altSnapshot.exerciseId);
  }

  return {
    id: row.setId || createUUID(),
    sessionId,
    exerciseId: row.exerciseId,
    exerciseNameSnapshot: row.exerciseName || undefined,
    weight: row.weight,
    weightUnit: row.weightUnit || undefined,
    reps: row.reps,
    timestamp: Number.isFinite(row.timestamp) ? row.timestamp : Date.now(),
    orderIndex: typeof row.orderIndex === "number" ? row.orderIndex : undefined,
    notes: row.notes || undefined,
    alternative: altSnapshot,
    createdAt: Number.isFinite(row.setCreatedAt)
      ? row.setCreatedAt
      : Date.now(),
    updatedAt:
      typeof row.setUpdatedAt === "number" ? row.setUpdatedAt : undefined,
    exerciseIds: Array.from(exerciseIds),
  };
}

export async function importPayloads({
  rows,
  duplicateStrategy,
  filename,
  onProgress,
  chunkSize = 100,
  lookup,
}: ImportPayloadsOptions): Promise<ImportSummary> {
  const resolvedLookup = lookup ?? (await gatherSessionLookup());
  const payloadGroups = buildSessionGroups(
    rows,
    resolvedLookup,
    duplicateStrategy,
    true
  );

  if (!payloadGroups.length) {
    throw new Error("No rows remain after duplicate filtering.");
  }

  const totalRows = payloadGroups.reduce(
    (sum, group) => sum + group.rows.length,
    0
  );

  if (!totalRows) {
    throw new Error("No rows remain after duplicate filtering.");
  }

  const importedSessionIds: string[] = [];
  const importedSetIds: string[] = [];
  let processedSets = 0;

  for (let i = 0; i < payloadGroups.length; i += chunkSize) {
    const chunk = payloadGroups.slice(i, i + chunkSize);

    await withTransaction(
      [STORE_NAMES.sessions, STORE_NAMES.loggedSets],
      "readwrite",
      async (db) => {
        const tx = db.transaction(
          [STORE_NAMES.sessions, STORE_NAMES.loggedSets],
          "readwrite"
        );
        const sessionStore = tx.objectStore(STORE_NAMES.sessions);
        const loggedSetsStore = tx.objectStore(STORE_NAMES.loggedSets);

        for (const group of chunk) {
          const sessionPayload = createSessionPayload(
            group.rows[0],
            group.sessionId
          );
          await sessionStore.put(sessionPayload);
          importedSessionIds.push(sessionPayload.id);

          for (const row of group.rows) {
            const setPayload = createLoggedSetPayload(row, sessionPayload.id);
            await loggedSetsStore.put(setPayload);
            importedSetIds.push(setPayload.id);
            processedSets += 1;
          }
        }

        await tx.done;
      }
    );

    if (onProgress) {
      onProgress(Math.min(100, Math.round((processedSets / totalRows) * 100)));
    }
  }

  return {
    importId: createUUID(),
    sessionIds: importedSessionIds,
    loggedSetIds: importedSetIds,
    rowCount: processedSets,
    filename,
  };
}

export async function undoImport(summary: ImportSummary) {
  await withTransaction(
    [STORE_NAMES.sessions, STORE_NAMES.loggedSets],
    "readwrite",
    async (db) => {
      const tx = db.transaction(
        [STORE_NAMES.sessions, STORE_NAMES.loggedSets],
        "readwrite"
      );
      const sessionStore = tx.objectStore(STORE_NAMES.sessions);
      const loggedSetsStore = tx.objectStore(STORE_NAMES.loggedSets);

      await Promise.all(
        summary.loggedSetIds.map((setId) => loggedSetsStore.delete(setId))
      );
      await Promise.all(
        summary.sessionIds.map((sessionId) => sessionStore.delete(sessionId))
      );

      await tx.done;
    }
  );
}
