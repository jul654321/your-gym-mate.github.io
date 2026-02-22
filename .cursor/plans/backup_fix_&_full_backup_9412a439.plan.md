---
name: Backup Fix & Full Backup
overview: "Fix all 11 issues from the Backup Export/Import Inconsistency Report: patch missing fields in the existing CSV round-trip, fix logic bugs and validation gaps, and introduce a new JSON full-backup format that covers the `exercises`, `plans`, and `settings` stores that the CSV format cannot reach."
todos:
  - id: t1-export-csv-fields
    content: Add workoutType, exerciseOrder, setStatus, setIndex to SessionExportRow, SESSION_EXPORT_COLUMNS, and createRow() in useExportBackup.ts
    status: pending
  - id: t2-import-csv-fields
    content: Update buildSessionRow(), createSessionPayload(), createLoggedSetPayload() in importBackup.ts to hydrate the four new fields
    status: pending
  - id: t3-fix-alt-id-bug
    content: Fix alternative exerciseId fabrication bug in createLoggedSetPayload() — drop altSnapshot when exerciseId is blank instead of minting UUID
    status: pending
  - id: t4-fix-validation
    content: Fix weightUnit coercion ('' -> undefined) and add NaN date, missing sessionId, unrecognised setType checks to validateRow()
    status: pending
  - id: t5-export-full-backup
    content: Create src/lib/utils/exportFullBackup.ts with FullBackupV1 type, buildFullBackup(), and exportFullBackupToFile()
    status: pending
  - id: t6-import-full-backup
    content: Create src/lib/utils/importFullBackup.ts with validateFullBackup() and importFullBackup() writing stores in dependency order
    status: pending
  - id: t7-hook-full-backup
    content: Create src/hooks/useFullBackup.ts exposing exportFull() with isExporting/exportError state
    status: pending
  - id: t8-export-ui
    content: Update ExportSheet.tsx to add backupType toggle (CSV vs JSON) and route to the appropriate export function
    status: pending
  - id: t9-import-ui
    content: Update useImportPickerLogic.ts and ImportPickerView.tsx to detect .json files, validate with validateFullBackup(), show preview counts, and call importFullBackup()
    status: pending
isProject: false
---

# Backup Fix & Full Backup Implementation Plan

## Architecture after the fix

```mermaid
flowchart TD
    subgraph IDB [IndexedDB]
        exercises
        plans
        sessions
        loggedSets
        settings
    end

    subgraph ExportCSV [CSV Export - extended]
        csv["Sessions + LoggedSets CSV\n+ workoutType, exerciseOrder\n+ status, setIndex"]
    end

    subgraph ExportJSON [JSON Full Backup - new]
        json["gymmate-backup.json\n{ version, exercises, plans,\n  sessions, loggedSets, settings }"]
    end

    subgraph Import [Import - extended]
        detectFormat{"File type?"}
        csvImport["CSV import\n(existing + fixed)"]
        jsonImport["JSON import\n(new)"]
    end

    exercises -->|"now included"| json
    plans -->|"now included"| json
    sessions --> csv
    sessions --> json
    loggedSets --> csv
    loggedSets --> json
    settings -->|"now included"| json

    csv --> detectFormat
    json --> detectFormat
    detectFormat -->|".csv"| csvImport
    detectFormat -->|".json"| jsonImport

    csvImport --> sessions
    csvImport --> loggedSets
    jsonImport --> exercises
    jsonImport --> plans
    jsonImport --> sessions
    jsonImport --> loggedSets
    jsonImport --> settings
```

---

## Task 1 — Fix missing fields in the CSV round-trip

Report items: #4 `workoutType`, #5 `exerciseOrder`, #6 `LoggedSetDTO.status`, #7 `setIndex`

### 1a. `[src/hooks/useExportBackup.ts](src/hooks/useExportBackup.ts)`

Add four fields to `SessionExportRow`:

```typescript
workoutType: WorkoutType | null | "";
exerciseOrder: string; // JSON-serialised UUID[] e.g. '["uuid1","uuid2"]'
setStatus: LoggedSetStatus | "";
setIndex: number | "";
```

Add four entries to `SESSION_EXPORT_COLUMNS` (after `sessionStatus` and `orderIndex` respectively):

```typescript
{ header: "Workout type",   key: "workoutType" },
{ header: "Exercise order", key: "exerciseOrder" },   // formatter: JSON.stringify array
{ header: "Set status",     key: "setStatus" },
{ header: "Set index",      key: "setIndex" },
```

Update `createRow()` to populate them:

```typescript
workoutType:   session.workoutType ?? "",
exerciseOrder: session.exerciseOrder?.length
                 ? JSON.stringify(session.exerciseOrder) : "",
setStatus:     set.status ?? "",
setIndex:      set.setIndex ?? "",
```

### 1b. `[src/lib/utils/importBackup.ts](src/lib/utils/importBackup.ts)`

`**buildSessionRow()**` — parse new columns:

```typescript
workoutType:   cells["Workout type"]?.trim() || "",
exerciseOrder: cells["Exercise order"]?.trim() ?? "",
setStatus:     cells["Set status"]?.trim() ?? "",
setIndex:      toOptionalNumber(cells["Set index"]),
```

`**createSessionPayload()**` — hydrate the two new `SessionDTO` fields:

```typescript
workoutType:   (row.workoutType as WorkoutType) || undefined,
exerciseOrder: (() => {
  try { return row.exerciseOrder ? JSON.parse(row.exerciseOrder) : undefined; }
  catch { return undefined; }
})(),
```

`**createLoggedSetPayload()**` — hydrate `status` and `setIndex`:

```typescript
status:   (row.setStatus as LoggedSetStatus) || undefined,
setIndex: typeof row.setIndex === "number" ? row.setIndex : undefined,
```

---

## Task 2 — Fix the alternative exerciseId bug (#8)

In `createLoggedSetPayload()`, the current code mints a random UUID when `altExerciseId` is blank but `altExerciseName` is present. Replace with:

```typescript
// Only create an altSnapshot if we have a real exerciseId.
// A name without an ID is unresolvable; fabricating an ID poisons multiEntry indexes.
const altSnapshot =
  altExerciseId
    ? {
        exerciseId: altExerciseId,
        nameSnapshot: row.alternativeExerciseName || undefined,
        weight: ...,
        reps:   ...,
      }
    : null;
```

Remove the `createUUID()` call from this path entirely. Document the limitation inline: full exercise resolution requires a JSON full backup (Task 4).

---

## Task 3 — Fix type and validation issues (#9, #10)

### 3a. `weightUnit` coercion (#9) in `buildSessionRow()`

```typescript
// Before (wrong): (cells["Unit"]?.trim() as WeightUnit) ?? ""
// After (correct):
weightUnit: (cells["Unit"]?.trim() as WeightUnit) || undefined,
```

The `SessionExportRow.weightUnit` type changes to `WeightUnit | undefined`.

### 3b. `validateRow()` gaps (#10)

Add three new checks:

```typescript
// NaN session date — both date columns are unparseable
if (
  !Number.isFinite(row.sessionDate) &&
  !Number.isFinite(row.sessionCreatedAt)
) {
  issues.push("Session date is missing or unparseable");
}

// Missing session ID — rows will be collapsed by name+date which may also be empty
if (!row.sessionId) {
  issues.push("Session ID is missing; rows will be grouped by name and date");
}

// Unrecognised set type — stored verbatim, could corrupt index queries
const VALID_SET_TYPES: SetType[] = [
  "warmup",
  "main",
  "drop",
  "drop set",
  "accessory",
];
if (row.setType && !VALID_SET_TYPES.includes(row.setType)) {
  issues.push(`Unknown set type: "${row.setType}"`);
}
```

---

## Task 4 — New JSON full backup: export (#1, #2, #3, #11)

### 4a. New file: `[src/lib/utils/exportFullBackup.ts](src/lib/utils/exportFullBackup.ts)`

Define a versioned envelope:

```typescript
export interface FullBackupV1 {
  version: 1;
  exportedAt: number; // epoch ms
  exercises: ExerciseDTO[];
  plans: PlanDTO[];
  sessions: SessionDTO[];
  loggedSets: LoggedSetDTO[];
  settings: SettingEntryDTO[];
}
```

`buildFullBackup(): Promise<FullBackupV1>` — reads all five stores in a single parallel batch using `getDB()`.

`exportFullBackupToFile(): Promise<void>` — serialises as `JSON.stringify` → `Blob` (type `application/json`), then reuses the same present-blob logic as `CSVStreamer.presentBlob` (navigator.share first, anchor-download fallback). Filename: `gymmate-backup-YYYY-MM-DD.json`.

**Import order on restore (referential integrity):** exercises first → plans → sessions → loggedSets → settings. This ensures FK references are valid when loggedSets are written.

### 4b. New file: `[src/lib/utils/importFullBackup.ts](src/lib/utils/importFullBackup.ts)`

```typescript
export interface FullBackupImportSummary {
  exerciseCount: number;
  planCount: number;
  sessionCount: number;
  loggedSetCount: number;
  settingCount: number;
}

export function validateFullBackup(data: unknown): FullBackupV1; // throws on bad shape
export async function importFullBackup(
  backup: FullBackupV1,
  strategy: DuplicateStrategy,
  onProgress?: (percent: number) => void
): Promise<FullBackupImportSummary>;
```

- `validateFullBackup`: checks `version === 1` and that each store array is present; throws a descriptive `Error` for invalid shape.
- `importFullBackup`: writes stores in dependency order using chunked `readwrite` transactions (chunk size 100, matching existing pattern). For `strategy === "skip"`, read the existing primary key before writing; for `"createNew"` on sessions, mint new IDs (same as existing CSV logic). Settings always use `put` (last-write-wins).

---

## Task 5 — New hook: `[src/hooks/useFullBackup.ts](src/hooks/useFullBackup.ts)`

Following React/hook rules: all async logic extracted from components, hook exposes only state + callbacks.

```typescript
export function useFullBackup(): {
  isExporting: boolean;
  exportError: string | null;
  exportFull: () => Promise<void>;
};
```

`exportFull` calls `exportFullBackupToFile()` and updates the `"lastExportAt"` setting via `useUpdateSetting` (same as existing CSV flow).

---

## Task 6 — Update Export UI

### `[src/components/settings/ExportSheet.tsx](src/components/settings/ExportSheet.tsx)`

Add a `backupType` state: `"csv" | "json"` (default `"csv"`).

- Add a segmented control / radio group: **"Sessions CSV"** | **"Full backup (JSON)"**.
- When `"json"` is selected: hide date-range and alternatives controls (full backup is always all-time and unconditional); show description: _"Exports exercises, plans, sessions, and settings. Use this when moving to a new device."_
- When `"csv"` is selected: existing UI unchanged.
- `handleExport` routes to `exportToCsv()` or `exportFull()` based on `backupType`.
- Update status message: for JSON, show counts per store on success.

---

## Task 7 — Update Import UI

### `[src/components/settings/useImportPickerLogic.ts](src/components/settings/useImportPickerLogic.ts)`

In `handleFileChange`:

```typescript
const isJson = file.name.endsWith(".json") || file.type === "application/json";
```

- For `.csv`: existing parse → validate → duplicate-report flow (unchanged).
- For `.json`:
  - `JSON.parse` the file text
  - Call `validateFullBackup(parsed)` (throws on bad shape, caught → `validationError`)
  - Skip per-row validation (JSON store entries are trusted typed objects)
  - Show a preview summary: `"X exercises, Y plans, Z sessions, W sets, V settings"`
  - On confirm: call `importFullBackup(backup, duplicateStrategy, onProgress)`

Extend `ImportPickerLogicResult` with:

- `importMode: "csv" | "json"`
- `fullBackupPreview: FullBackupPreview | null` (counts per store)

### `[src/components/settings/ImportPickerView.tsx](src/components/settings/ImportPickerView.tsx)`

- Update `accept` on the file input: `".csv,.json"`
- When `importMode === "json"`: show the full-backup preview card instead of the per-row valid/invalid table.

---

## Summary of file changes

- **Modified** — `src/hooks/useExportBackup.ts` (Task 1a)
- **Modified** — `src/lib/utils/importBackup.ts` (Tasks 1b, 2, 3)
- **New** — `src/lib/utils/exportFullBackup.ts` (Task 4a)
- **New** — `src/lib/utils/importFullBackup.ts` (Task 4b)
- **New** — `src/hooks/useFullBackup.ts` (Task 5)
- **Modified** — `src/components/settings/ExportSheet.tsx` (Task 6)
- **Modified** — `src/components/settings/useImportPickerLogic.ts` (Task 7)
- **Modified** — `src/components/settings/ImportPickerView.tsx` (Task 7)
