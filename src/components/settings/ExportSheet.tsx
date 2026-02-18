import { useMemo, useRef, useState } from "react";
import { Button } from "../ui/button";
import { useUpdateSetting } from "../../hooks/useSettings";
import { exportToCsv } from "../../hooks/useExportBackup";
import { Modal } from "../shared/Modal";
import { Label } from "../ui/label";
import { Select } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Card } from "../ui/card";

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
  const [isExporting, setIsExporting] = useState(false);
  const [rowCount, setRowCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const rowCountRef = useRef(0);
  const updateSetting = useUpdateSetting();

  const presetLabel = useMemo(
    () => DATE_PRESETS.find((option) => option.value === preset)?.label ?? "",
    [preset]
  );

  const handleExport = async () => {
    if (isExporting) {
      return;
    }

    setIsExporting(true);
    setRowCount(0);
    rowCountRef.current = 0;
    setError(null);
    setStatusMessage(null);

    const filename = `gymmate-export-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    const dateRange = getDateRangeFromPreset(preset);

    try {
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
      setIsExporting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const progressMessage = isExporting
    ? `Streaming ${rowCount} row${rowCount === 1 ? "" : "s"}…`
    : statusMessage ??
      "Choose a date range and export your workout sessions as a CSV file.";

  return (
    <Modal
      title="Export data"
      onClose={onClose}
      actionButtons={[
        <Button key="export" onClick={handleExport} disabled={isExporting}>
          {isExporting ? "Exporting..." : "Start export"}
        </Button>,
      ]}
    >
      <>
        <div className="space-y-4">
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

          <Card theme="secondary">
            <p>{progressMessage}</p>
            {error && (
              <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>
            )}
          </Card>
        </div>
      </>
    </Modal>
  );
}
