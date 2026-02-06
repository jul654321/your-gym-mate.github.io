import type { MouseEvent } from "react";
import { Button } from "../ui/button";
import { type DuplicateStrategy } from "../../lib/utils/importBackup";
import type { ImportPickerLogicResult } from "./useImportPickerLogic";

const MAX_PREVIEW_ISSUES = 3;
const DUPLICATE_STRATEGY_LABELS: Record<DuplicateStrategy, string> = {
  skip: "Skip duplicates",
  createNew: "Import as new",
};

export function ImportPickerView({
  selectedFileLabel,
  inputKey,
  validRows,
  invalidRows,
  duplicateReport,
  duplicateStrategy,
  onDuplicateStrategyChange,
  readyRowsCount,
  validationLiveMessage,
  validationError,
  isImporting,
  importError,
  lastImport,
  handleFileChange,
  handleImport,
  handleUndo,
  handleClose,
  liveRegionId,
  progressMessage,
}: ImportPickerLogicResult) {
  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

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

          <div className="rounded-2xl border border-dashed border-gray-200 bg-background p-4 text-xs text-gray-500">
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
                    onDuplicateStrategyChange(
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
            className="rounded-2xl border border-gray-200 bg-background p-4 text-xs text-gray-500"
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
