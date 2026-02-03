import { useCallback, useId, useMemo, useState } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import { Button } from "../ui/button";
import { getDB, STORE_NAMES, withTransaction } from "../../lib/db";
import { useGetSetting, useUpdateSetting } from "../../hooks/useSettings";
import type { LoggedSetDTO, SessionDTO, SessionStatus } from "../../types";
import { SESSION_EXPORT_COLUMNS, type SessionExportRow } from "./ExportSheet";

interface ImportPickerProps {
  isOpen: boolean;
  onClose: () => void;
}

type ParsedImportRow = {
  rowIndex: number;
  data: SessionExportRow;
  issues: string[];
};

type DuplicateStrategy = "skip" | "createNew";

interface DuplicateReport {
  idMatches: string[];
  nameDateMatches: string[];
}

interface SessionLookup {
  byId: Map<string, SessionDTO>;
  byNameDate: Map<string, SessionDTO>;
}

interface SessionGroupPayload {
  key: string;
  rows: SessionExportRow[];
  sessionId: string;
}

interface ImportSummary {
  importId: string;
  sessionIds: string[];
  loggedSetIds: string[];
  rowCount: number;
  filename: string;
}

interface ImportHistoryEntry extends ImportSummary {
  importedAt: number;
  duplicateStrategy: DuplicateStrategy;
}

const DEFAULT_LIVE_MESSAGE = "Pick a Gym Mate export to begin.";
const MAX_PREVIEW_ISSUES = 3;
const DUPLICATE_STRATEGY_LABELS: Record<DuplicateStrategy, string> = {
  skip: "Skip duplicates",
  createNew: "Import as new",
};

function createUUID(): string {
  return (
    crypto.randomUUID?.() ??
    `import-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
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

function buildSessionRow(cells: Record<string, string>): SessionExportRow {
  return {
    sessionId: cells["Session ID"]?.trim() ?? "",
    sessionName: cells["Session name"]?.trim() ?? "",
    sessionDate: toNumber(cells["Session date"]),
    sessionCreatedAt: toNumber(cells["Session created"]),
    sessionUpdatedAt: toOptionalNumber(cells["Session updated"]),
    sessionStatus: toSessionStatus(cells["Session status"]),
    sourcePlanId: cells["Source plan ID"]?.trim() ?? "",
    setId: cells["Set ID"]?.trim() ?? "",
    exerciseId: cells["Exercise ID"]?.trim() ?? "",
    exerciseName: cells["Exercise name"]?.trim() ?? "",
    weight: toNumber(cells["Weight"]),
    weightUnit: cells["Unit"]?.trim() ?? "",
    reps: toNumber(cells["Reps"]),
    timestamp: toNumber(cells["Set timestamp"]),
    orderIndex: toOptionalNumber(cells["Order index"]),
    notes: cells["Notes"]?.trim() ?? "",
    alternativeExerciseId: cells["Alternative exercise ID"]?.trim() ?? "",
    alternativeExerciseName: cells["Alternative name"]?.trim() ?? "",
    alternativeWeight: toOptionalNumber(cells["Alternative weight"]),
    alternativeReps: toOptionalNumber(cells["Alternative reps"]),
    setCreatedAt: toNumber(cells["Set created"]),
    setUpdatedAt: toOptionalNumber(cells["Set updated"]),
  };
}

function validateRow(row: SessionExportRow): string[] {
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

async function gatherSessionLookup(): Promise<SessionLookup> {
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

function computeDuplicateReport(
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

function buildSessionGroups(
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

export function ImportPicker({ isOpen, onClose }: ImportPickerProps) {
  const [selectedFileLabel, setSelectedFileLabel] = useState(
    "No file selected yet"
  );
  const [inputKey, setInputKey] = useState(0);
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [duplicateReport, setDuplicateReport] = useState<DuplicateReport>({
    idMatches: [],
    nameDateMatches: [],
  });
  const [sessionLookup, setSessionLookup] = useState<SessionLookup | null>(
    null
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationLiveMessage, setValidationLiveMessage] =
    useState(DEFAULT_LIVE_MESSAGE);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] =
    useState<DuplicateStrategy>("skip");
  const [lastImport, setLastImport] = useState<ImportSummary | null>(null);

  const { data: importHistory = [] } = useGetSetting<ImportHistoryEntry[]>(
    "importHistory",
    { cacheTime: 1000 * 60 }
  );
  const updateSetting = useUpdateSetting();
  const liveRegionId = useId();

  const validRows = useMemo(
    () => parsedRows.filter((row) => row.issues.length === 0),
    [parsedRows]
  );
  const invalidRows = useMemo(
    () => parsedRows.filter((row) => row.issues.length > 0),
    [parsedRows]
  );

  const readyRowsCount = useMemo(() => {
    const lookup = sessionLookup ?? { byId: new Map(), byNameDate: new Map() };
    const groups = buildSessionGroups(
      validRows.map((row) => row.data),
      lookup,
      duplicateStrategy,
      false
    );
    return groups.reduce((sum, group) => sum + group.rows.length, 0);
  }, [sessionLookup, validRows, duplicateStrategy]);

  const resetState = useCallback(() => {
    setParsedRows([]);
    setDuplicateReport({ idMatches: [], nameDateMatches: [] });
    setSessionLookup(null);
    setValidationError(null);
    setValidationLiveMessage(DEFAULT_LIVE_MESSAGE);
    setIsParsing(false);
    setIsImporting(false);
    setImportProgress(0);
    setStatusMessage(null);
    setImportError(null);
    setDuplicateStrategy("skip");
    setInputKey((value) => value + 1);
    setSelectedFileLabel("No file selected yet");
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const handleBackdropClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        setSelectedFileLabel("No file selected yet");
        return;
      }
      setSelectedFileLabel(file.name);
      setStatusMessage(null);
      setImportError(null);
      setLastImport(null);
      parseFile(file);
      event.target.value = "";
    },
    []
  );

  async function parseFile(file: File) {
    setIsParsing(true);
    setValidationError(null);
    setValidationLiveMessage("Parsing CSV…");
    setParsedRows([]);
    setDuplicateReport({ idMatches: [], nameDateMatches: [] });

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (!rows.length) {
        throw new Error("The selected file is empty.");
      }

      const headerRow = rows[0].map((header) =>
        header.replace(/^\uFEFF/, "").trim()
      );
      const headerIndex = new Map<string, number>();
      headerRow.forEach((header, index) => {
        if (header) {
          headerIndex.set(header, index);
        }
      });

      const expectedHeaders = SESSION_EXPORT_COLUMNS.map(
        (column) => column.header
      );
      const missingHeaders = expectedHeaders.filter(
        (expected) => !headerIndex.has(expected)
      );
      if (missingHeaders.length) {
        throw new Error(
          `Missing required CSV headers: ${missingHeaders.join(", ")}`
        );
      }

      const dataRows = rows
        .slice(1)
        .filter((row) => row.some((cell) => cell.trim() !== ""));

      const parsed = dataRows.map((row, index) => {
        const rowIndex = index + 2;
        const cells: Record<string, string> = {};
        headerIndex.forEach((columnIndex, header) => {
          cells[header] = row[columnIndex] ?? "";
        });
        const data = buildSessionRow(cells);
        const issues = validateRow(data);
        return { rowIndex, data, issues };
      });

      setParsedRows(parsed);

      const lookup = await gatherSessionLookup();
      setSessionLookup(lookup);
      const duplicates = computeDuplicateReport(parsed, lookup);
      setDuplicateReport(duplicates);

      const summaryParts = [
        `Parsed ${parsed.length} row${parsed.length === 1 ? "" : "s"}.`,
      ];
      if (duplicates.idMatches.length) {
        summaryParts.push(
          `${duplicates.idMatches.length} exact session ID match${
            duplicates.idMatches.length === 1 ? "" : "es"
          }.`
        );
      }
      if (duplicates.nameDateMatches.length) {
        summaryParts.push(
          `${duplicates.nameDateMatches.length} name+date duplicate${
            duplicates.nameDateMatches.length === 1 ? "" : "s"
          }.`
        );
      }
      setValidationLiveMessage(summaryParts.join(" "));

      if (!parsed.length) {
        setValidationError("No CSV rows detected after removing headers.");
      }
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : "Failed to parse the CSV file."
      );
    } finally {
      setIsParsing(false);
    }
  }

  const handleImport = async () => {
    if (isImporting || !validRows.length) {
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setImportError(null);
    setStatusMessage(null);

    try {
      const lookup = sessionLookup ?? (await gatherSessionLookup());
      const payloadGroups = buildSessionGroups(
        validRows.map((row) => row.data),
        lookup,
        duplicateStrategy,
        true
      ) as SessionGroupPayload[];

      const totalRows = payloadGroups.reduce(
        (sum, group) => sum + group.rows.length,
        0
      );

      if (!payloadGroups.length || totalRows === 0) {
        setImportError("No rows remain after duplicate filtering.");
        return;
      }

      const importedSessionIds: string[] = [];
      const importedSetIds: string[] = [];
      let processedSets = 0;

      const chunkSize = 100;
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
                const setPayload = createLoggedSetPayload(
                  row,
                  sessionPayload.id
                );
                await loggedSetsStore.put(setPayload);
                importedSetIds.push(setPayload.id);
                processedSets += 1;
              }
            }

            await tx.done;
          }
        );

        setImportProgress(
          Math.min(100, Math.round((processedSets / totalRows) * 100))
        );
      }

      const summary: ImportSummary = {
        importId: createUUID(),
        sessionIds: importedSessionIds,
        loggedSetIds: importedSetIds,
        rowCount: processedSets,
        filename: selectedFileLabel,
      };

      setLastImport(summary);
      setStatusMessage(
        `Imported ${summary.rowCount} row${summary.rowCount === 1 ? "" : "s"}.`
      );
      setValidationLiveMessage(
        `Ready to import ${readyRowsCount} row${
          readyRowsCount === 1 ? "" : "s"
        }.`
      );

      const historyEntry: ImportHistoryEntry = {
        ...summary,
        importedAt: Date.now(),
        duplicateStrategy,
      };
      const nextHistory = [...importHistory, historyEntry];
      updateSetting.mutate({
        key: "importHistory",
        value: nextHistory,
      });
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Import failed due to an unexpected error."
      );
      console.error("[ImportPicker] Import failed", { error });
    } finally {
      setIsImporting(false);
      setImportProgress(100);
    }
  };

  const handleUndo = async () => {
    if (!lastImport || isImporting) {
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setStatusMessage("Undoing previous import…");

    try {
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
            lastImport.loggedSetIds.map((setId) =>
              loggedSetsStore.delete(setId)
            )
          );
          await Promise.all(
            lastImport.sessionIds.map((sessionId) =>
              sessionStore.delete(sessionId)
            )
          );

          await tx.done;
        }
      );

      setStatusMessage("Last import removed.");
      setLastImport(null);
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Undo failed. Please try again."
      );
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const progressMessage = isImporting
    ? `Working through ${importProgress}%…`
    : statusMessage ||
      `Parsed ${parsedRows.length} row${
        parsedRows.length === 1 ? "" : "s"
      }. ${readyRowsCount} ready to import.`;

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-picker-title"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2
              id="import-picker-title"
              className="text-2xl font-semibold text-gray-900"
            >
              Import data
            </h2>
            <p className="text-sm text-gray-500">
              Upload a Gym Mate CSV, validate it, and import your sessions
              transactionally.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            aria-label="Close import modal"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M4 4l12 12M16 4L4 16" />
            </svg>
          </Button>
        </div>

        <div className="space-y-6 p-6 text-sm text-gray-600">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Select Gym Mate CSV
            </span>
            <input
              key={inputKey}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isImporting}
              className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700 focus:border-primary focus:outline-none"
            />
          </label>
          <p className="text-xs text-gray-500" aria-live="polite">
            {selectedFileLabel}
          </p>

          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-gray-500">
            <p>{validationLiveMessage}</p>
            {validationError && (
              <p className="mt-2 text-xs font-semibold text-red-600">
                {validationError}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Validation
              </p>
              <p className="text-sm text-gray-900">
                {validRows.length} valid row
                {validRows.length === 1 ? "" : "s"} · {invalidRows.length} issue
                {invalidRows.length === 1 ? "" : "s"}
              </p>
              {invalidRows.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-red-600">
                  {invalidRows.slice(0, MAX_PREVIEW_ISSUES).map((row) => (
                    <li key={row.rowIndex}>
                      Row {row.rowIndex}: {row.issues.join("; ")}
                    </li>
                  ))}
                  {invalidRows.length > MAX_PREVIEW_ISSUES && (
                    <li>
                      ...and {invalidRows.length - MAX_PREVIEW_ISSUES} more rows
                      with issues.
                    </li>
                  )}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Duplicates
              </p>
              <p className="text-sm text-gray-900">
                ID matches: {duplicateReport.idMatches.length}
              </p>
              <p className="text-sm text-gray-900">
                Name + date matches: {duplicateReport.nameDateMatches.length}
              </p>
              <div className="mt-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Duplicate handling
                </label>
                <select
                  value={duplicateStrategy}
                  onChange={(event) =>
                    setDuplicateStrategy(
                      event.target.value as DuplicateStrategy
                    )
                  }
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
                >
                  {Object.entries(DUPLICATE_STRATEGY_LABELS).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </div>

          <div
            className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-500"
            aria-live="polite"
            id={liveRegionId}
          >
            <p>{progressMessage}</p>
            {importError && (
              <p className="mt-2 text-xs font-semibold text-red-600">
                {importError}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-gray-200 px-6 py-4">
          <Button
            onClick={handleImport}
            disabled={
              isImporting ||
              !validRows.length ||
              Boolean(validationError) ||
              readyRowsCount === 0
            }
            isLoading={isImporting}
            className="flex-1 md:flex-none"
          >
            {isImporting
              ? "Importing…"
              : `Import ${readyRowsCount} row${
                  readyRowsCount === 1 ? "" : "s"
                }`}
          </Button>
          <Button
            variant="ghost"
            onClick={handleClose}
            size="sm"
            className="text-gray-600"
            disabled={isImporting}
          >
            Dismiss
          </Button>
          {lastImport && (
            <Button
              variant="outline"
              onClick={handleUndo}
              disabled={isImporting}
              className="text-red-600"
            >
              Undo last import
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
