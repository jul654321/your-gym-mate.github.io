---
name: Backup UI Plan
overview: Add a Settings → Backup view with Export and Import flows (UI + small utilities) that integrate with existing hooks and the DB wrapper. The plan creates a Settings page, BackupPanel, ExportSheet, ImportPicker, CSVStreamer utility, and routes the page into the app with Tailwind-based UI and React hooks.
todos:
  - id: create-settings-page
    content: Create `src/pages/SettingsPage.tsx`, add `/settings` route in `src/App.tsx`, wire navigation.
    status: pending
  - id: add-backup-panel
    content: Implement `src/components/settings/BackupPanel.tsx` with last export timestamp, DB size estimate, Export/Import buttons.
    status: pending
  - id: export-sheet
    content: Implement `src/components/settings/ExportSheet.tsx` (controls, estimate, CSV export CTA).
    status: pending
  - id: csv-streamer
    content: Add `src/lib/csv/CSVStreamer.ts` with `streamToFile` and streaming CSV generation from async generator.
    status: pending
  - id: import-picker
    content: Implement `src/components/settings/ImportPicker.tsx` and `src/lib/csv/CSVParser.ts` for parsing and validation with `ValidationReport` UI.
    status: pending
  - id: import-writes
    content: Implement batched import writes using `withTransaction`, add `importId` metadata, progress UI, and Undo behavior.
    status: pending
  - id: tests-and-docs
    content: Add unit/feature tests for CSVStreamer and import logic; add `docs/backup.md` describing privacy and flows.
    status: pending
  - id: lint-and-fix
    content: Run linter on added files and fix any issues.
    status: pending
isProject: false
---

# Implement Settings → Backup (Export / Import)

Overview

- Add a Settings page and a Backup panel (route: `/settings`, sub-route/modal `?backup=true` or `/settings/backup`) that implements the Export and Import flows described in `.ai/ui-plan.md` (lines 609-750).

Files to add

- `src/pages/SettingsPage.tsx` — page shell, reads settings and shows panels
- `src/components/settings/BackupPanel.tsx` — summary (last export timestamp, DB size estimate) and primary actions
- `src/components/settings/ExportSheet.tsx` — bottom sheet/modal for export controls (date range, toggles, estimate counter, Export CTA)
- `src/components/settings/ImportPicker.tsx` — file picker + parse/validate CTA
- `src/components/settings/ValidationReport.tsx` — validation UI and conflict resolver hooks
- `src/lib/csv/CSVStreamer.ts` — incremental CSV writer utility (streams from cursor in batches)
- `src/lib/csv/CSVParser.ts` — CSV parsing wrapper (wraps PapaParse or built-in parser with strict header mapping)

Integration points (existing code to use)

- Use `useSessions()` and `useLoggedSets()` hooks to read data for estimate and export.
- Use `withTransaction(storeNames, 'readwrite', cb)` from `src/lib/db/index.ts` for import writes and for batched transactional writes.
- Use `useGetSetting()` and `useUpdateSetting()` from `src/hooks/useSettings.ts` to read/update `settings.lastExportAt` and `settings.importHistory`.
- Preserve UUIDs when present; generate new UUIDs (use existing `src/lib/uuid.ts` if present, otherwise `crypto.randomUUID()`).

Key implementation details

- Export
  - `ExportSheet` queries `sessions` and `loggedSets` via existing hooks with filters (date range). Do not materialize full dataset: use DB cursor (via `getDB()` + index cursors) or paginated queries from hooks.
  - Implement `CSVStreamer` which accepts an async generator of rows and writes to a `Blob` in chunks. Use `navigator.share()` when available with fallback to anchor `download`.
  - On success, call `useUpdateSetting().mutate({ key: 'lastExportAt', value: Date.now() })`.
- Import
  - `ImportPicker` parses CSV (streaming if large) and runs schema validation via `CSVParser`.
  - Show `ValidationReport` with counts and per-row problems; for duplicates, detect by UUID or fuzzy match (date+name). Offer global presets and per-row overrides.
  - On confirm, run batched `withTransaction` writes: group records into batches (e.g., 250 rows) and write each batch inside its own transaction. Add `importId` metadata to imported rows and temporarily put them in `undo_trash` unless user confirms.
  - Track progress and show per-batch success/failure; on quota errors abort and surface guidance.

User interactions & accessibility

- Use existing modal/sheet patterns (`src/components/.../InstantiateFromPlanSheet.tsx`) for sheet/modal structure and Tailwind for styling.
- Provide aria-live region for import progress updates.
- Offer Undo action after import that removes `importId` items (or moves them to `undo_trash`).

Minimal example: ExportSheet usage (proposed implementation)

```tsx
// src/components/settings/ExportSheet.tsx
import React from 'react';
import { useSessions } from 'src/hooks/useSessions';
import { CSVStreamer } from 'src/lib/csv/CSVStreamer';
import { useUpdateSetting } from 'src/hooks/useSettings';

export function ExportSheet({ onClose }) {
  const updateSetting = useUpdateSetting();
  const { data: sessions } = useSessions({ /* date range params */ });

  async function runExport() {
    const rowGenerator = async function* () {
      for (const s of sessions) {
        const sets = /* call useLoggedSets or DB cursor per-session */;
        for (const set of sets) {
          yield { session: s, set };
        }
      }
    };

    const filename = `gymmate-export-${new Date().toISOString().slice(0,10)}.csv`;
    await CSVStreamer.streamToFile(rowGenerator(), filename);
    updateSetting.mutate({ key: 'lastExportAt', value: Date.now() });
  }

  return (
    <div>/* UI controls + Export CTA */</div>
  );
}
```

Todos

- id: create-settings-page
  content: Create `src/pages/SettingsPage.tsx`, add route `/settings` in `src/App.tsx`, and wire the Settings navigation tab to this route.
- id: add-backup-panel
  content: Implement `src/components/settings/BackupPanel.tsx` with last export timestamp, DB size estimate (use `getDB()` + count cursors), and Export / Import buttons that open sheets/modals.
- id: export-sheet
  content: Implement `src/components/settings/ExportSheet.tsx` (controls, estimate counter, export CTA) and hook it to `BackupPanel`.
- id: csv-streamer
  content: Add `src/lib/csv/CSVStreamer.ts` implementing chunked CSV creation from an async generator and a `streamToFile` helper that calls Web Share API or download fallback.
- id: import-picker
  content: Implement `src/components/settings/ImportPicker.tsx` + `src/lib/csv/CSVParser.ts` for robust parsing and schema validation, showing `ValidationReport`.
- id: import-writes
  content: Implement import commit logic using `withTransaction`, batched writes, `importId` metadata, progress tracking, and undo behavior.
- id: tests-and-docs
  content: Add basic unit/feature tests for CSVStreamer and Import logic, and add a short README entry `docs/backup.md` describing the flows and privacy notes.
- id: lint-and-fix
  content: Run linter on new files and fix any style/type errors.

Notes & assumptions

- The codebase uses React + TypeScript + Tailwind; follow existing modal/sheet patterns and UI components under `src/components/*`.
- `CSVStreamer` and `CSVParser` are new components (planned in UI doc) — keep implementations minimal and testable.
- Use `crypto.randomUUID()` for UUID generation if no existing helper is available.

Acceptance criteria

- `/settings` route exists and shows a Backup panel.
- Export flow produces a CSV and triggers system share/download; `settings.lastExportAt` is updated.
- Import flow validates CSV, shows resolution UI for duplicates, writes data transactionally into DB, and allows Undo.
