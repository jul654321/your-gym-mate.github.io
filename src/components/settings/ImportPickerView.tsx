import { Button } from "../ui/button";
import { type DuplicateStrategy } from "../../lib/utils/importBackup";
import type { ImportPickerLogicResult } from "./useImportPickerLogic";
import { Modal } from "../shared/Modal";
import { Label } from "../ui/label";
import { Select } from "../ui/select";
import { Card } from "../ui/card";

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
  validationError,
  isImporting,
  importError,
  handleFileChange,
  handleImport,
  handleUndo,
  handleClose,
  progressMessage,
}: ImportPickerLogicResult) {
  return (
    <Modal
      title="Import data"
      onClose={handleClose}
      actionButtons={[
        <Button
          key="undo"
          onClick={handleUndo}
          disabled={isImporting}
          variant="secondary"
        >
          {isImporting ? "Undoing..." : "Undo"}
        </Button>,
        <Button
          key="import"
          onClick={handleImport}
          disabled={isImporting}
          variant="primary"
        >
          {isImporting ? "Importing..." : "Import"}
        </Button>,
      ]}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload a Gym Mate CSV, validate it, and import your sessions
          transactionally.
        </p>

        <Label className="flex flex-col gap-2">
          Select Gym Mate CSV
          <input
            key={inputKey}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isImporting}
            className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700 focus:border-primary focus:outline-none placeholder:text-muted-foreground"
          />
        </Label>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {selectedFileLabel}
        </p>

        <div className="mt-2">
          <Label>Duplicate handling</Label>
          <Select
            value={duplicateStrategy}
            onChange={(event) =>
              onDuplicateStrategyChange(event.target.value as DuplicateStrategy)
            }
          >
            {Object.entries(DUPLICATE_STRATEGY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <Card theme="secondary">
          <div className="flex flex-col gap-2">
            {validationError && (
              <p className="mt-2 text-sm text-red-600">{validationError}</p>
            )}

            <div>
              <p className="text-sm font-medium text-card-foreground">
                Validation
              </p>
              <p className="text-xs text-muted-foreground">
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
              <p className="text-sm font-medium text-card-foreground">
                Duplicates
              </p>
              <p className="text-xs text-muted-foreground">
                ID matches: {duplicateReport.idMatches.length}
              </p>
              <p className="text-xs text-muted-foreground">
                Name + date matches: {duplicateReport.nameDateMatches.length}
              </p>
            </div>
          </div>
        </Card>

        <Card theme="secondary">
          <p>{progressMessage}</p>
          {importError && (
            <p className="text-sm font-semibold text-red-400">{importError}</p>
          )}
        </Card>
      </div>
    </Modal>
  );
}
