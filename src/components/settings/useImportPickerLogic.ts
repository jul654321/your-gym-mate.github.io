import type { ChangeEvent } from "react";
import { useCallback, useId, useMemo, useState } from "react";
import { SESSION_EXPORT_COLUMNS } from "../../hooks/useExportBackup";
import {
  buildSessionGroups,
  buildSessionRow,
  computeDuplicateReport,
  gatherSessionLookup,
  importPayloads,
  parseCsvText,
  validateRow,
  type DuplicateReport,
  type DuplicateStrategy,
  type ImportSummary,
  type ParsedImportRow,
  type SessionLookup,
} from "../../lib/utils/importBackup";
import { useGetSetting, useUpdateSetting } from "../../hooks/useSettings";
import { STORE_NAMES, withTransaction } from "../../lib/db";
import { importFullBackup, validateFullBackup } from "../../lib/utils/importFullBackup";
import type { FullBackupPreview, FullBackupV1 } from "../../lib/utils/importFullBackup";

interface ImportHistoryEntry extends ImportSummary {
  importedAt: number;
  duplicateStrategy: DuplicateStrategy;
}

interface UseImportPickerLogicProps {
  onClose: () => void;
}

export interface ImportPickerLogicResult {
  selectedFileLabel: string;
  inputKey: number;
  validRows: ParsedImportRow[];
  invalidRows: ParsedImportRow[];
  duplicateReport: DuplicateReport;
  duplicateStrategy: DuplicateStrategy;
  onDuplicateStrategyChange: (strategy: DuplicateStrategy) => void;
  readyRowsCount: number;
  validationLiveMessage: string;
  validationError: string | null;
  isImporting: boolean;
  importError: string | null;
  lastImport: ImportSummary | null;
  importMode: "csv" | "json";
  fullBackupPreview: FullBackupPreview | null;
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleImport: () => Promise<void>;
  handleUndo: () => Promise<void>;
  handleClose: () => void;
  liveRegionId: string;
  progressMessage: string;
}

const DEFAULT_LIVE_MESSAGE = "Pick a Gym Mate export to begin.";

export function useImportPickerLogic({
  onClose,
}: UseImportPickerLogicProps): ImportPickerLogicResult {
  const [selectedFileLabel, setSelectedFileLabel] = useState(
    "No file selected yet"
  );
  const [inputKey, setInputKey] = useState(0);
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [duplicateReport, setDuplicateReport] = useState<DuplicateReport>({
    idMatches: [],
    nameDateMatches: [],
  });
  const [importMode, setImportMode] = useState<"csv" | "json">("csv");
  const [fullBackupPreview, setFullBackupPreview] =
    useState<FullBackupPreview | null>(null);
  const [fullBackupPayload, setFullBackupPayload] =
    useState<FullBackupV1 | null>(null);
  const [sessionLookup, setSessionLookup] = useState<SessionLookup | null>(
    null
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationLiveMessage, setValidationLiveMessage] =
    useState(DEFAULT_LIVE_MESSAGE);
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
    setIsImporting(false);
    setImportProgress(0);
    setStatusMessage(null);
    setImportError(null);
    setDuplicateStrategy("skip");
    setImportMode("csv");
    setFullBackupPreview(null);
    setFullBackupPayload(null);
    setInputKey((value) => value + 1);
    setSelectedFileLabel("No file selected yet");
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

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
      const isJson =
        file.name.toLowerCase().endsWith(".json") ||
        file.type === "application/json";
      if (isJson) {
        void parseJsonFile(file);
      } else {
        void parseCsvFile(file);
      }
      event.target.value = "";
    },
    []
  );

  async function parseCsvFile(file: File) {
    setValidationError(null);
    setValidationLiveMessage("Parsing CSV…");
    setParsedRows([]);
    setDuplicateReport({ idMatches: [], nameDateMatches: [] });

    setImportMode("csv");
    setFullBackupPreview(null);
    setFullBackupPayload(null);
    try {
      const text = await file.text();
      const rows = parseCsvText(text);

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
    }
  }

  async function parseJsonFile(file: File) {
    setValidationError(null);
    setValidationLiveMessage("Parsing JSON backup…");
    setParsedRows([]);
    setDuplicateReport({ idMatches: [], nameDateMatches: [] });
    setSessionLookup(null);
    setImportMode("json");
    setFullBackupPreview(null);
    setFullBackupPayload(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const backup = validateFullBackup(parsed);
      const preview: FullBackupPreview = {
        exerciseCount: backup.exercises.length,
        planCount: backup.plans.length,
        sessionCount: backup.sessions.length,
        loggedSetCount: backup.loggedSets.length,
        settingCount: backup.settings.length,
      };
      setFullBackupPayload(backup);
      setFullBackupPreview(preview);

      const summaryMessage = [
        `${preview.exerciseCount} exercise${preview.exerciseCount === 1 ? "" : "s"}`,
        `${preview.planCount} plan${preview.planCount === 1 ? "" : "s"}`,
        `${preview.sessionCount} session${preview.sessionCount === 1 ? "" : "s"}`,
        `${preview.loggedSetCount} set${preview.loggedSetCount === 1 ? "" : "s"}`,
        `${preview.settingCount} setting${preview.settingCount === 1 ? "" : "s"}`,
      ].join(", ");
      setValidationLiveMessage(`Parsed full backup: ${summaryMessage}.`);
    } catch (error) {
      setValidationError(
        error instanceof Error
          ? error.message
          : "Failed to parse the JSON backup file."
      );
    }
  }

  const handleImport = async () => {
    if (isImporting) {
      return;
    }

    if (importMode === "csv" && !validRows.length) {
      return;
    }

    if (importMode === "json" && !fullBackupPayload) {
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setImportError(null);
    setStatusMessage(null);

    try {
      if (importMode === "csv") {
        const lookup = sessionLookup ?? (await gatherSessionLookup());
        const summary = await importPayloads({
          rows: validRows.map((row) => row.data),
          duplicateStrategy,
          filename: selectedFileLabel,
          lookup,
          onProgress: (percent) => setImportProgress(percent),
        });

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
        const nextHistory = [...(importHistory ?? []), historyEntry];
        updateSetting.mutate({
          key: "importHistory",
          value: nextHistory,
        });
      } else {
        const summary = await importFullBackup(
          fullBackupPayload!,
          duplicateStrategy,
          (percent) => setImportProgress(percent)
        );

        setStatusMessage(
          `Imported ${summary.exerciseCount} exercise${
            summary.exerciseCount === 1 ? "" : "s"
          }, ${summary.planCount} plan${summary.planCount === 1 ? "" : "s"}, ${summary.sessionCount
          } session${summary.sessionCount === 1 ? "" : "s"}, ${summary.loggedSetCount
          } set${summary.loggedSetCount === 1 ? "" : "s"}, and ${summary.settingCount
          } setting${summary.settingCount === 1 ? "" : "s"}.`
        );
        setFullBackupPreview(null);
        setFullBackupPayload(null);
      }
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
    if (importMode === "json" || !lastImport || isImporting) {
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

  const jsonPreviewMessage = fullBackupPreview
    ? `Full backup contains ${fullBackupPreview.exerciseCount} exercise${
        fullBackupPreview.exerciseCount === 1 ? "" : "s"
      }, ${fullBackupPreview.planCount} plan${
        fullBackupPreview.planCount === 1 ? "" : "s"
      }, ${fullBackupPreview.sessionCount} session${
        fullBackupPreview.sessionCount === 1 ? "" : "s"
      }, ${fullBackupPreview.loggedSetCount} set${
        fullBackupPreview.loggedSetCount === 1 ? "" : "s"
      }, and ${fullBackupPreview.settingCount} setting${
        fullBackupPreview.settingCount === 1 ? "" : "s"
      }.`
    : "Select a Gym Mate JSON backup to preview what will be imported.";
  const progressMessage = isImporting
    ? `Working through ${importProgress}%…`
    : importMode === "json"
    ? statusMessage ?? jsonPreviewMessage
    : statusMessage ||
      `Parsed ${parsedRows.length} row${
        parsedRows.length === 1 ? "" : "s"
      }. ${readyRowsCount} ready to import.`;

  return {
    selectedFileLabel,
    inputKey,
    validRows,
    invalidRows,
    duplicateReport,
    duplicateStrategy,
    onDuplicateStrategyChange: setDuplicateStrategy,
    readyRowsCount,
    validationLiveMessage,
    validationError,
    isImporting,
    importError,
    lastImport,
    importMode,
    fullBackupPreview,
    handleFileChange,
    handleImport,
    handleUndo,
    handleClose,
    liveRegionId,
    progressMessage,
  };
}
