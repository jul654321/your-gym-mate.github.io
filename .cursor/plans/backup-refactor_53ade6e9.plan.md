---
name: backup-refactor
overview: Refactor backup/export/import into testable hooks and align CSV import/export contracts (date formats).
todos:
  - id: extract-export-hook
    content: Create src/hooks/useExportBackup.ts with exported SESSION_EXPORT_COLUMNS, createRow, buildSessionExportRows, exportToCsv helper.
    status: pending
  - id: extract-import-hook
    content: Create src/hooks/useImportBackup.ts with parseCsvText, parseEpochMs, buildSessionRow, validateRow, gatherSessionLookup, computeDuplicateReport, buildSessionGroups, importPayloads, undoImport.
    status: pending
  - id: ui-refactor
    content: Refactor ExportSheet.tsx and ImportPicker.tsx to use the new hooks and keep only UI state and presentation.
    status: pending
  - id: tests
    content: Add unit tests for parsing (ISO & epoch), payload creation, and import chunking/transaction behavior.
    status: pending
  - id: docs
    content: Add docs/backup.md describing hook API, CSV headers, and import/export contract (date handling and backupVersion).
    status: pending
isProject: false
---

# Backup refactor: extract hooks, align contracts

Goal: move business logic out of UI components into reusable hooks/modules so other devs can safely refactor, add tests, and maintain the export/import contract.

Summary of current hotspots (examples):

```109:140:src/components/settings/ExportSheet.tsx
async function* buildSessionExportRows({
  dateRange,
  includeAlternatives,
}: ExportFilters): AsyncGenerator<SessionExportRow> { ... }
```

```154:184:src/components/settings/ExportSheet.tsx
function createRow(
  session: SessionDTO,
  set: LoggedSetDTO,
  includeAlternatives: boolean
): SessionExportRow { ... }
```

```54:107:src/components/settings/ExportSheet.tsx
export const SESSION_EXPORT_COLUMNS: CsvColumn<SessionExportRow>[] = [ ... ]
```

```65:112:src/components/settings/ImportPicker.tsx
function parseCSV(text: string, delimiter = ","): string[][] { ... }
```

```137:162:src/components/settings/ImportPicker.tsx
function buildSessionRow(cells: Record<string, string>): SessionExportRow { ... }
```

Key mismatch found (must be fixed):

- Export formats date fields using ISO strings (e.g. via formatter in `SESSION_EXPORT_COLUMNS`) while Import currently expects epoch milliseconds (numbers). This will produce NaN for date fields when re-importing. Fix by making the import parser robust (accept ISO or epoch ms) or change export to write epoch ms. I recommend updating the import parser to accept both (preserves human-readable ISO CSVs).

Concrete step-by-step plan (safe, incremental commits):

Todos:

1. extract-export-hook
   n: Create `src/hooks/useExportBackup.ts` that exports:

- `SESSION_EXPORT_COLUMNS` (move here)
- `buildSessionExportRows(dateRange, includeAlternatives)` generator
- `createRow(session, set, includeAlternatives)` helper
- `exportToCsv({dateRange, includeAlternatives, filename, onProgress})` which uses CSVStreamer
  Why: isolates DB reads and streaming logic from UI.

1. extract-import-hook
   n: Create `src/hooks/useImportBackup.ts` that exports:

- `parseCsvText(text)` (wrapper around parseCSV)
- `buildSessionRow(cells)` and `validateRow(row)` (move here)
- `gatherSessionLookup()`
- `computeDuplicateReport()`
- `buildSessionGroups()`
- `importPayloads({rows, duplicateStrategy, onProgress})` (performs chunked `withTransaction` writes and returns summary)
- `undoImport(importSummary)`
  Why: centralize validation, duplicate logic, and DB writes for testing and reuse.

1. make import date parsing robust
   n: In the new import hook, replace `toNumber` with `parseEpochMs(value)` which:

- If value is numeric string -> Number(value)
- Else if value is ISO date string -> Date.parse(value)
- Else -> NaN
  Update all callers (sessionDate, createdAt, timestamps) to use this function.
  Why: allows re-import of human-readable ISO exports and numeric epoch exports.

1. tighten runtime validation
   n: Add checks in `validateRow` for `weightUnit` to match `WeightUnit = 'kg' | 'lb'` (or accept empty -> undefined). Add clear error messages for date parsing failures. Return structured issue codes where helpful.
2. slim UI components to presentation only
   n: Refactor `ExportSheet.tsx` and `ImportPicker.tsx` so they only:

- Render UI and call hook functions (e.g. `useExportBackup().exportToCsv(...)`)
- Keep only the local UI state (modal open/close, progress UI state mapped from hook callbacks)
  Minimal changes: swap local helper calls for hook calls.

1. add unit + integration tests
   n: Create tests under `src/hooks/__tests__/` for:

- `parseEpochMs` parsing ISO and numeric strings
- `buildSessionExportRows` (mock DB or use in-memory idb mock)
- `importPayloads` chunking and transaction behavior (mock `withTransaction` and verify calls)
  Why: prevents regressions when moving logic.

1. add migration/version metadata for backups (optional but recommended)
   n: Introduce a CSV metadata header or a companion JSON backup format with a `backupVersion` integer and `createdAt` so future schema changes can be handled. Add a minimal parser that can detect unknown versions and surface a friendly message.
2. docs & developer notes
   n: Add `docs/backup.md` describing:

- Hook APIs (`useExportBackup`, `useImportBackup`) and their responsibilities
- Expected CSV headers and date handling rules (ISO accepted)
- How to run tests and how to manually test import/export

1. rollout & commit strategy (small, reviewable commits)

- Commit A: add new hooks files with tests (no UI changes) + export CSV columns moved but export UI still imports them from new hooks
- Commit B: update ExportSheet to use hook API
- Commit C: add import parser changes and tests
- Commit D: update ImportPicker to use hook API
- Commit E: add documentation and bump version / changelog

Files to change (high-value list):

- Add: `src/hooks/useExportBackup.ts`
- Add: `src/hooks/useImportBackup.ts`
- Update: `src/components/settings/ExportSheet.tsx` (remove DB & creation logic)
- Update: `src/components/settings/ImportPicker.tsx` (remove parsing & db write logic)
- Add tests: `src/hooks/__tests__/useExportBackup.test.ts`, `src/hooks/__tests__/useImportBackup.test.ts`
- Add docs: `docs/backup.md`

Developer notes / rationale:

- Follow project rules: put hooks under `src/hooks` (see `.cursor/rules/react.md`) and keep UI components purely presentational.
- Keep CSV human-readable (ISO date strings) but make import robust to accept both ISO and epoch ms.
- Preserve undo semantics (ImportPicker `undo` behavior) by returning `ImportSummary` from `importPayloads` and storing it in component state.
- Use small chunked transactions (existing chunkSize=100) to avoid blocking the main thread; keep that behavior in the hook.

Acceptance criteria (what to verify after refactor):

- Export still produces identical CSV content as before (no regressions).
- Import can successfully re-import CSV exported by the app (dates parse correctly).
- UI components (`ExportSheet`, `ImportPicker`) contain minimal DB/IO logic — calls to hooks only.
- New hooks are covered by unit tests for parsing and payload construction.
- Linter passes and code follows `.cursor/rules/frontend.mdc` and `.cursor/rules/react.md` guidance.

Estimated effort: 3–6 small PRs (2–3 days total depending on test coverage and review cycle).

If you want, I can now generate the concrete hook file templates and a sequence of patches for the first commit (extracting `SESSION_EXPORT_COLUMNS`, `createRow`, and `buildSessionExportRows`) — confirm and I will prepare the patch set.
