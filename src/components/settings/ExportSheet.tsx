import { useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { Button } from "../ui/button";
import { useUpdateSetting } from "../../hooks/useSettings";
import { exportToCsv } from "../../hooks/useExportBackup";

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
  const [includeAlternatives, setIncludeAlternatives] = useState(true);
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

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

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
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-sheet-title"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2
              id="export-sheet-title"
              className="text-2xl font-semibold text-gray-900"
            >
              Export data
            </h2>
            <p className="text-sm text-gray-500">
              Stream your sessions and logged sets into CSV while keeping memory
              usage low.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close export modal"
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Date range
              </label>
              <select
                value={preset}
                onChange={(event) =>
                  setPreset(event.target.value as DatePresetValue)
                }
                className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
              >
                {DATE_PRESETS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                Current selection: {presetLabel}.
              </p>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <input
                  type="checkbox"
                  checked={includeAlternatives}
                  onChange={(event) =>
                    setIncludeAlternatives(event.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                Include alternative sets
              </label>
              <p className="text-xs text-gray-500">
                Alternative snapshots are only included when you opt-in.
              </p>
            </div>
          </div>

          <div
            className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-gray-500"
            aria-live="polite"
          >
            <p>{progressMessage}</p>
            {error && (
              <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-gray-200 px-6 py-4">
          <Button
            onClick={handleExport}
            disabled={isExporting}
            isLoading={isExporting}
            className="flex-1 md:flex-none"
          >
            {isExporting ? "Exporting..." : "Start export"}
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            size="sm"
            className="text-gray-600"
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
