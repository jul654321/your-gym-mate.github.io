---
name: Settings Exercises
overview: Add Exercises management subpage under Settings and move Backup to its own subpage. Provide CRUD UI for exercises with safe deletion rules (prevent deletion when referenced) and DB hooks for referential checks and undo behavior.
todos: []
isProject: false
---

# View Implementation Plan [Settings - Exercises]

## 1. Overview

A Settings extension that adds an Exercises management subpage where users can list, create, edit, and remove canonical exercises. Deletion is only allowed when an exercise is not referenced by any Plan, Session, or LoggedSet. The existing Backup UI is moved to a dedicated `/settings/backup` subpage. All data remains local (IndexedDB) and uses the app's hooks + React Query patterns.

## 2. View Routing

- Parent route: `/settings` (existing) — refactor to support subroutes.
- New sub-routes:
  - `/settings/exercises` — Exercises management page (primary new view)
  - `/settings/backup` — Backup page (move `BackupPanel` here)

Update reference to Settings page entry point: `src/pages/SettingsPage.tsx` should mount a subrouter or a `SettingsRoutes` component that renders Settings nav and child routes.

## 3. Component Structure

- `SettingsRoutes` (new) — container for settings subpages and nav
  - `SettingsNav` — left/stacked nav for subpages
  - Routes:
    - `SettingsMain` (General settings; existing)
    - `ExercisesListPage` (new)
      - `ExerciseListHeader` (search + add CTA)
      - `ExerciseList` (list/pagination)
        - `ExerciseRow`
          - `ExerciseActions` (edit/delete)
      - `ExerciseEditorModal` (create/update)
      - `ExerciseReferenceModal` (shows referencing plans/sessions)
      - `ConfirmDeleteDialog`
    - `BackupPage` (move existing `BackupPanel` here)
  - Shared children: `DBStatusPanel`, `RecentDeletesList`, `UndoSnackbar`

## 4. Component Details

### SettingsRoutes

- Description: Router and layout for settings subpages. Ensures `useDbInit()` guard and shows migration banner if needed.
- Main elements: `SettingsNav`, `Outlet` for subroutes, `DBStatusPanel` footer.
- Handled events: route changes, show update banner.
- Validation: none.
- Types: none specific.
- Props: none.

### SettingsNav

- Description: compact vertical or horizontal nav showing links: General, Exercises, Backup, Advanced.
- Elements: nav list + active indicator.
- Events: onClick navigate to subroute.
- Validation: none.
- Props: currentRoute?: string

### ExercisesListPage

- Description: main page listing exercises with search, add button, and per-row actions.
- Elements: `ExerciseListHeader`, `ExerciseList`, `ExerciseEditorModal`, `ExerciseReferenceModal`.
- Events:
  - Search input change (debounced)
  - Add CTA click -> open `ExerciseEditorModal`
  - Edit click -> open modal with selected exercise
  - Delete click -> open reference check then either `ExerciseReferenceModal` or `ConfirmDeleteDialog`
- Validation conditions:
  - Name required (non-empty, trimmed, max 100 chars).
- Types: accepts/uses `ExerciseViewModel[]` from `useExercises()`.
- Props: none (page obtains data via hooks)

### ExerciseRow

- Description: displays exercise name, category/equipment (optional), and actions.
- Elements: title, subtitle, action buttons (edit, delete), accessible row container.
- Events: edit/delete click, row click to open details.
- Validation: none.
- Props: `exercise: ExerciseViewModel`, `onEdit(ex)`, `onDelete(ex)`

### ExerciseEditorModal

- Description: modal for create or update exercise.
- Elements: input `name` (required), optional `category`, `equipment`, Save & Cancel buttons.
- Events: Save -> validate & call `useCreateExercise()` or `useUpdateExercise()`; Cancel -> close modal.
- Validation: name required, max length 100. Disable Save until valid.
- Types: Request: `CreateExerciseCmd | UpdateExerciseCmd`. Response: `ExerciseDTO`.
- Props: `open: boolean`, `exercise?: ExerciseDTO`, `onClose()`, `onSaved(exercise)`

### ExerciseReferenceModal

- Description: when delete attempted and references exist, display lists of referencing Plans and Sessions/LoggedSets with counts and links.
- Elements: summary counts, lists of plan rows (name + link to `/plans/:id/edit`), session/loggedSet samples (link to `/sessions/:id`), guidance CTA.
- Events: Open plan/session on click, Close modal.
- Validation: none (read-only).
- Types: `ExerciseReferenceCheckResult`.
- Props: `open`, `exerciseId`, `refs: ExerciseReferenceCheckResult`, `onClose()`

### ConfirmDeleteDialog

- Description: confirmation dialog for allowed deletes.
- Elements: message, Confirm & Cancel buttons.
- Events: Confirm -> call delete mutation; Cancel -> close.
- Validation: final referential check inside delete transaction. If conflict occurs, show error and open `ExerciseReferenceModal`.
- Props: `open`, `exercise`, `onConfirm()`, `onCancel()`

### BackupPage

- Description: hosts `BackupPanel` and Import controls; same content as previous `BackupPanel` but now at `/settings/backup`.
- Elements: `BackupPanel`, Import button & file picker.
- Events: Export/Import actions wired to existing export utilities.
- Props: none.

## 5. Types

Provide exact TypeScript types required (add into `src/types.ts` or `src/types/exercises.ts`):

```typescript
// Exercise DTO stored in IndexedDB
export type ExerciseDTO = {
  id: string; // uuid
  name: string;
  category?: string;
  equipment?: string;
  createdAt?: number;
  updatedAt?: number;
};

// ViewModel used by UI
export type ExerciseViewModel = ExerciseDTO & {
  refCounts?: { plans: number; sessions: number; loggedSets: number };
};

export type CreateExerciseCmd = {
  name: string;
  category?: string;
  equipment?: string;
  createdAt?: number;
};

export type UpdateExerciseCmd = {
  id: string;
  name?: string;
  category?: string;
  equipment?: string;
  updatedAt?: number;
};

export type ExerciseReferenceCheckResult = {
  exerciseId: string;
  plans: Array<{ planId: string; planName: string }>;
  sessions: Array<{
    sessionId: string;
    sessionName?: string;
    sampleLoggedSetId?: string;
  }>;
  loggedSetsCount: number;
};
```

## 6. State Management

- Prefer React Query + hooks-per-store pattern.
- Page-level state (ExercisesListPage): `searchQuery`, `editorOpen`, `selectedExercise`, `confirmDeleteOpen`, `isCheckingRefs`.
- Server/local-state: use `useExercises()` to fetch exercise list (query key `['exercises', { q }]`) and `useQuery` for reference checks (`['exerciseRefs', id]`).
- Mutations via `useCreateExercise()`, `useUpdateExercise()`, `useDeleteExercise()` with optimistic update patterns consistent with other hooks.
- Undo for delete: use `undo_trash` store; delete mutation should put the item into `undo_trash` and show `UndoSnackbar`.

## 7. Hooks Integration (IndexedDB interactions)

Implement or extend hooks in `src/hooks/` following existing patterns (`useExercises.ts`):

- useExercises({ q?: string, page?, pageSize? }) -> returns `ExerciseViewModel[]`.
  - Query key: `['exercises', { q }]`.
  - Implementation: query `getDB()` and read `STORE_NAMES.exercises` with optional client-side filter or indexed name search if available.
- useCreateExercise() -> mutationFn(cmd: CreateExerciseCmd) => ExerciseDTO
  - Implementation: generate `id` (uuid), set createdAt, db.put(STORE_NAMES.exercises, dto)
  - OnSuccess: invalidate `['exercises']`.
  - Optimistic: add to cache with temp id.
- useUpdateExercise() -> mutationFn(cmd: UpdateExerciseCmd) => ExerciseDTO
  - Implementation: read existing, merge fields, put, invalidate `['exercises']` and any dependent caches.
- useExerciseReferenceCheck(exerciseId: string)
  - Query key: `['exerciseRefs', exerciseId]`.
  - Implementation details:
    - Prefer indices:
      - `plans` should have `exerciseIds` denormalized index (Plan DTO contains `exerciseIds: string[]`). Query `getAll` by index for exact matches.
      - `loggedSets` should expose a multiEntry index `exerciseIds` including primary `exerciseId` and alternative `alt.exerciseId` where present. Use `db.getAllFromIndex(STORE_NAMES.loggedSets, 'exerciseIds', exerciseId)`.
    - If indexes missing, fallback to scanning stores and filter in memory (warn in console and show longer spinner in UI).
    - Return `ExerciseReferenceCheckResult` with lists (capped to N items for UI, plus counts).
- useDeleteExercise() -> mutationFn({ id }) => { id, movedToUndoAt }
  - Steps:
    1. Run reference check. If counts > 0, reject with Conflict error including refs.
    2. Use `withTransaction(['exercises', 'undo_trash'], 'readwrite', async (tx) => { const ex = await tx.get(STORE_NAMES.exercises, id); await tx.delete(STORE_NAMES.exercises, id); await tx.put(STORE_NAMES.undo_trash, { id: generatedUndoId, type:'exercise', payload: ex, expiresAt: now + undoWindowMs }); });`
    3. On success, invalidate `['exercises']` and show UndoSnackbar pointing to `useRestoreFromTrash()`.
    4. If transaction aborts, rollback optimistic UI and show toast.
  - Important: re-run a reference check inside the transaction (or read dependent indexes) before delete to avoid race.
- Request/response types: use the DTOs above. Ensure mutation errors return structured `{ code: 'conflict'|'db'|'quota', details?: any }`.

## 8. User Interactions

- Open `/settings/exercises`: fetch exercises via `useExercises()`; show skeleton while loading.
- Add exercise: Add CTA -> ExerciseEditorModal -> validate -> create -> optimistic list update -> close modal -> success toast.
- Edit exercise: Edit CTA -> ExerciseEditorModal prefilled -> save -> optimistic update -> success toast.
- Delete exercise:
  - Click Delete -> start `useExerciseReferenceCheck()`.
  - If references found -> open `ExerciseReferenceModal` listing references and blocking delete. Offer links to Plans/Sessions and guidance.
  - If no references -> show ConfirmDeleteDialog -> Confirm -> run `useDeleteExercise()` -> move to `undo_trash` -> show UndoSnackbar.
  - Undo: within undoWindow, `useRestoreFromTrash()` restores exercise and invalidates caches.
- Search: client-side or server-side (hook param) debounced (200ms) filter.
- Backup: navigate to `/settings/backup` where `BackupPanel` provides Export & Import actions.

## 9. Conditions and Validation

- Name field: required, trimmed length > 0, <= 100 characters.
- Deletion condition: allowed only when `ExerciseReferenceCheckResult.loggedSetsCount === 0 && refs.plans.length === 0 && refs.sessions.length === 0`.
- Component-level verification: `ConfirmDeleteDialog` must run a final check at mutation start (inside transaction) to ensure no new references since the initial check.
- UI effect: when deletion blocked, show a non-destructive explanation and list references with CTA to open referencing entities.

## 10. Error Handling

- Reference check fails (DB read error): show inline error with Retry; disable Delete until resolved.
- Delete aborted due to race (new references): surface blocking modal with conflict details and suggest steps to remove references first.
- Transaction abort / quota: rollback optimistic update and show toast with Retry and diagnostics link to `DBStatusPanel`.
- Missing indexes causing slow scans: show progressive spinner and hint in the modal "DB index required; this may take longer on first run". Add a migration to create indexes if missing.
- Restore from Undo fails: show persistent toast with Retry action.

## 11. Implementation Steps

1. Add types in `src/types.ts` (or `src/types/exercises.ts`) per section 5.
2. Add/extend IndexedDB schema & migration if necessary:

- Ensure `STORE_NAMES.exercises` exists and `STORE_NAMES.undo_trash` exists.
- Ensure `plans` include `exerciseIds` denormalized array and index; ensure `loggedSets` includes multiEntry index `exerciseIds` (primary + alternative ids). If missing, add migration in `src/lib/db/migrations/` that populates denormalized fields and creates indexes.

1. Create hook files in `src/hooks/`: `useExercises.ts` (read), `useCreateExercise.ts`, `useUpdateExercise.ts`, `useExerciseReferenceCheck.ts`, `useDeleteExercise.ts` following the React Query contract used in `useSettings.ts`.
2. Implement UI components:

- `src/pages/SettingsPage.tsx`: refactor to mount `SettingsRoutes` (use React Router nested routes or internal route switch) and render `SettingsNav`.
- Create `src/components/settings/SettingsRoutes.tsx`, `SettingsNav.tsx`.
- Create `src/pages/settings/ExercisesListPage.tsx` and supporting components `ExerciseRow.tsx`, `ExerciseEditorModal.tsx`, `ExerciseReferenceModal.tsx`, `ConfirmDeleteDialog.tsx` under `src/components/settings/`.
- Move `BackupPanel` usage to `src/pages/settings/BackupPage.tsx` and wire route `/settings/backup`.

1. Wire routes in app router so `/settings` stays backward compatible. Update links that previously pointed to Settings main to use subroutes where appropriate.
2. Implement optimistic update behaviors for create/update/delete and hook invalidation rules.
3. Implement Undo behavior: reuse `undo_trash` store and existing `useRestoreFromTrash()` hook patterns.
4. Add tests (unit & integration): confirm create, edit, attempted delete with references (blocked), successful delete + undo, and restore.
5. Update documentation:

- `/.ai/prd.md` — add
