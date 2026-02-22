import { useMemo, useRef, useState } from "react";
import { Button } from "../ui/button";
import { useFullBackup } from "../../hooks/useFullBackup";
import { useUpdateSetting } from "../../hooks/useSettings";
import { exportToCsv } from "../../hooks/useExportBackup";
import { Modal } from "../shared/Modal";
import { Label } from "../ui/label";
import { Select } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Card } from "../ui/card";
import type { FullBackupPreview } from "../../lib/utils/importFullBackup";

interface ExportSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

type DatePresetValue = "all" | "30" | "90";

const DATE_PRESETS: { value: DatePresetValue; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

const DAY_MS = 1000 * 60 * 60 * 24;

function getDateRangeFromPreset(preset: DatePresetValue) {
  if (preset === "all") {
    return undefined;
  }
  const today = Date.now();
  const days = Number(preset);
  return { from: today - days * DAY_MS, to: today };
}

export function ExportSheet({ isOpen, onClose }: ExportSheetProps) {
  const [preset, setPreset] = useState<DatePresetValue>("all");
  const [includeAlternatives, setIncludeAlternatives] = useState(false);
  const [backupType, setBackupType] = useState<"csv" | "json">("csv");
  const [isCsvExporting, setIsCsvExporting] = useState(false);
  const [rowCount, setRowCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [jsonSummary, setJsonSummary] =
    useState<FullBackupPreview | null>(null);
  const rowCountRef = useRef(0);
  const updateSetting = useUpdateSetting();
  const {
    isExporting: isJsonExporting,
    exportError: fullBackupError,
    exportFull,
  } = useFullBackup();

  const presetLabel = useMemo(
    () => DATE_PRESETS.find((option) => option.value === preset)?.label ?? "",
    [preset]
  );

  const handleExport = async () => {
    const isExporting =
      backupType === "csv" ? isCsvExporting : isJsonExporting;
    if (isExporting) {
      return;
    }

    setIsCsvExporting(backupType === "csv");
    setRowCount(0);
    rowCountRef.current = 0;
    setJsonSummary(null);
    setError(null);
    setStatusMessage(null);

    const dateRange = getDateRangeFromPreset(preset);

    try {
      if (backupType === "csv") {
        const filename = `gymmate-export-${new Date()
          .toISOString()
          .slice(0, 10)}.csv`;

        await exportToCsv({
          filename,
          dateRange,
          includeAlternatives,
          onRow: (count) => {
            rowCountRef.current = count;
            setRowCount(count);
          },
        });

        updateSetting.mutate({
          key: "lastExportAt",
          value: Date.now(),
        });

        setStatusMessage(
          rowCountRef.current
            ? `Exported ${rowCountRef.current} row${
                rowCountRef.current === 1 ? "" : "s"
              }.`
            : "No logged sets were found for that range."
        );
      } else {
        const backup = await exportFull();
        if (!backup) {
          return;
        }

        const preview: FullBackupPreview = {
          exerciseCount: backup.exercises.length,
          planCount: backup.plans.length,
          sessionCount: backup.sessions.length,
          loggedSetCount: backup.loggedSets.length,
          settingCount: backup.settings.length,
        };
        setJsonSummary(preview);

        const summaryMessage = `Exported ${preview.exerciseCount} exercise${
          preview.exerciseCount === 1 ? "" : "s"
        }, ${preview.planCount} plan${preview.planCount === 1 ? "" : "s"}, ${preview.sessionCount
        } session${preview.sessionCount === 1 ? "" : "s"}, ${preview.loggedSetCount
        } set${preview.loggedSetCount === 1 ? "" : "s"}, and ${preview.settingCount
        } setting${preview.settingCount === 1 ? "" : "s"}.`;
        setStatusMessage(summaryMessage);
      }
    } catch (exportError) {
      const message =
        exportError instanceof Error
          ? exportError.message
          : "Failed to export sessions.";
      console.error("[ExportSheet] Export failed", {
        preset,
        includeAlternatives,
        rowCount: rowCountRef.current,
        error: exportError,
      });
      setError(
        `${message} If the failure persists, open DevTools > Console, copy the error, and share it so we can trace the exact cause.`
      );
    } finally {
      setIsCsvExporting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const isWorking =
    backupType === "csv" ? isCsvExporting : isJsonExporting;
  const defaultMessage =
    backupType === "csv"
      ? "Choose a date range and export your workout sessions as a CSV file."
      : "Export every store to a JSON file for device-to-device transfers.";
  const progressMessage = isWorking
    ? backupType === "csv"
      ? `Streaming ${rowCount} row${rowCount === 1 ? "" : "s"}…`
      : "Preparing the full backup…"
    : statusMessage ?? defaultMessage;
  const combinedError =
    error || (backupType === "json" ? fullBackupError : null);

  return (
    <Modal
      title="Export data"
      onClose={onClose}
      actionButtons={[
        <Button key="export" onClick={handleExport} disabled={isWorking}>
          {isWorking ? "Exporting..." : "Start export"}
        </Button>,
      ]}
    >
      <>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex flex-col gap-2 text-sm">
              Backup format
              <div className="flex gap-2">
                <Button
                  variant={backupType === "csv" ? "primary" : "secondary"}
                  onClick={() => setBackupType("csv")}
                  type="button"
                >
                  Sessions CSV
                </Button>
                <Button
                  variant={backupType === "json" ? "primary" : "secondary"}
                  onClick={() => setBackupType("json")}
                  type="button"
                >
                  Full backup (JSON)
                </Button>
              </div>
            </Label>
            {backupType === "csv" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="date-range">Date range</Label>
                  <Select
                    value={preset}
                    onChange={(event) =>
                      setPreset(event.target.value as DatePresetValue)
                    }
                  >
                    {DATE_PRESETS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-gray-500">
                    Current selection: {presetLabel}.
                  </p>
                </div>
                <div>
                  <Label className="flex items-center gap-3">
                    <Checkbox
                      checked={includeAlternatives}
                      onChange={(event) =>
                        setIncludeAlternatives(event.target.checked)
                      }
                    >
                      Include alternative sets
                    </Checkbox>
                  </Label>
                  <p className="text-xs text-gray-500">
                    Alternative snapshots are only included when you opt-in.
                  </p>
                </div>
              </div>
            )}
            {backupType === "json" && (
              <p className="text-xs text-gray-500">
                Exports exercises, plans, sessions, logged sets, and settings.
                Use this when moving to a new device.
              </p>
            )}
          </div>

          <Card theme="secondary">
            <p>{progressMessage}</p>
            {jsonSummary && (
              <p className="text-xs text-muted-foreground">
                Includes {jsonSummary.exerciseCount} exercise
                {jsonSummary.exerciseCount === 1 ? "" : "s"},{" "}
                {jsonSummary.planCount} plan{jsonSummary.planCount === 1 ? "" : "s"
                }, {jsonSummary.sessionCount} session
                {jsonSummary.sessionCount === 1 ? "" : "s"},{" "}
                {jsonSummary.loggedSetCount} set
                {jsonSummary.loggedSetCount === 1 ? "" : "s"}, and{" "}
                {jsonSummary.settingCount} setting
                {jsonSummary.settingCount === 1 ? "" : "s"}.
              </p>
            )}
            {combinedError && (
              <p className="mt-2 text-xs font-semibold text-red-600">
                {combinedError}
              </p>
            )}
          </Card>
        </div>
      </>
    </Modal>
  );
}
