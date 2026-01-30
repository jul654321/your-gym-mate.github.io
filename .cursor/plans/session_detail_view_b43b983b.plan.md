---
name: Session Detail View
overview: Implementation plan for the Session Detail view (/sessions/:sessionId) that allows viewing a session, listing and grouping logged sets, quick logging, editing, deleting with undo, and session totals. Integrates with IndexedDB hooks already present in the codebase.
todos: []
isProject: false
---

# View Implementation Plan — Session Detail

## 1. Overview

The Session Detail view displays a single session (/sessions/:sessionId), showing the session header (name, date, status, source plan), a grouped and ordered list of logged sets, session totals (volume, sets), and provides Quick Add and Edit flows for logged sets including optional alternative exercises. All operations are local-first (IndexedDB) using the project's hooks layer with optimistic updates and undo support.

## 2. View Routing

- Path: `/sessions/:sessionId`
- Route params: `sessionId` (string)

## 3. Component Structure

- `SessionView` (page)
  - `SessionHeader`
  - `SessionTotalsBar`
  - `LoggedSetsList`
    - `ExerciseGroup` (per exercise)
      - `ExerciseHeader` (name, QuickAdd CTA)
      - `LoggedSetRow` (per set)
  - `QuickAddModal` (portal)
  - `EditSetModal` (portal)
  - `UndoSnackbar` / `GlobalToasts`

## 4. Component Details

### `SessionView`

- Description: Page container that loads `session` and `loggedSets`, derives grouped view models, controls modals and actions, and wires hooks.
- Main elements: page container, sticky header, totals bar, scrollable list, modals.
- Handled interactions: open QuickAdd (exerciseId), open EditSet (setId), rename session, toggle status, delete session, paginate "Load more".
- Validation: `sessionId` valid, DB ready before writes; show skeleton when loading.
- Types: `SessionDTO`, `LoggedSetDTO[]`, `SessionVM` (see Types section).
- Props: none (route-driven).

### `SessionHeader`

- Description: displays session name, date, status badge, source plan link, rename action, status toggle.
- Elements: title (editable), date, status toggle, instantiate/origin link, actions menu (delete/rename).
- Events: onRename(name) -> `useUpdateSession`, onToggleStatus(status) -> `useUpdateSession`, onDelete -> show confirm -> `useDeleteSession` (transactional, move to undo_trash).
- Validation: name non-empty; status ∈ {"active","completed"}.
- Props: `{ session: SessionVM, onRename, onToggleStatus, onDelete }`.

### `SessionTotalsBar`

- Description: shows computed totals for the session (total volume, total sets), per-exercise mini-summaries, includeAlternatives toggle hook.
- Elements: total volume, set count, includeAlternatives toggle, small per-exercise chips.
- Events: none except toggles; toggle triggers settings update and recompute of aggregates.
- Validation: volume calculation = Σ(weight reps) for included sets.
- Props: `{ totals: { totalVolume:number, totalSets:number }, includeAlternatives:boolean, onToggleIncludeAlternatives }`.

### `LoggedSetsList`

- Description: renders grouped exercise sections; supports ordering, pagination, and lazy aggregate per-group.
- Elements: group headers, list of `LoggedSetRow`, "Load more" control if paginated.
- Events: tap set -> open EditSetModal; tap group header QuickAdd -> open QuickAddModal; swipe-to-delete -> confirm -> delete.
- Validation: rows in order by `setIndex` (then timestamp) and grouped by `exerciseId`.
- Props: `{ groupedSets: GroupedExerciseVM[], onOpenQuickAdd, onEditSet, onDeleteSet }`.

### `LoggedSetRow`

- Description: shows a single logged set with weight (value + unit), reps, setIndex, timestamp, alternative pill if present, edit and delete actions.
- Elements: left index/timestamp, center weight x reps, right actions (edit/delete), alt pill below main text if alt present.
- Events: onEdit -> open EditSetModal; onDelete -> confirm -> `useDeleteLoggedSet`.
- Validation: display formatted timestamp; weight >= 0; reps >= 1.
- Props: `{ set: LoggedSetVM, exerciseName: string, onEdit, onDelete }`.

### `QuickAddModal`

- Description: fast modal to add a set to a session; pre-fills from last set; supports optional alternative fields.
- Elements: Exercise selector (or preselected), weight input (numeric), unit select (kg/lb), reps input (numeric), optional "Add alternative" toggle & fields, Save CTA, Cancel.
- Events: onSave(payload: CreateLoggedSetRequest) -> calls `useCreateLoggedSet` (or `useQuickAddSet`) with optimistic update; onCancel -> close.
- Validation: must have `exerciseId`, `reps >=1`, `weight >=0`; disable Save until `isDbReady` and form valid.
- Types: `QuickAddVM` input and `CreateLoggedSetRequest` (see Types).
- Props: `{ sessionId:string, exerciseId?:string, initial?:Partial<QuickAddVM>, onClose }`.

### `EditSetModal`

- Description: edit existing logged set fields or alternative; supports deletion.
- Elements: same inputs as QuickAdd prefilled with set values, Save and Delete CTA.
- Events: onSave -> `useUpdateLoggedSet`; onDelete -> `useDeleteLoggedSet` (with confirm), onCancel -> close.
- Validation: same as QuickAdd.
- Props: `{ setId:string, set: LoggedSetVM, onClose }`.

### `UndoSnackbar` / `GlobalToasts`

- Description: shows Undo for deletes and toasts for errors; global component.
- Events: onUndo(id) -> `useRestoreFromTrash(id)`; onRetry -> re-trigger mutation.
- Props: global, typically no direct props.

## 5. Types

(Stored DTOs and ViewModels used by components)

### Stored DTOs (IndexedDB)

- `ExerciseDTO`
  - id: string
  - name: string
  - category?: string
  - equipment?: string
- `PlanExerciseDTO`
  - id: string
  - exerciseId: string
  - defaultSets?: number
  - defaultReps?: number
  - defaultWeight?: number
  - optionalAlternativeExerciseId?: string | null
  - notes?: string
  - order: number
- `PlanDTO`
  - id: string
  - name: string
  - planExercises: PlanExerciseDTO[]
  - exerciseIds: string[]
- `SessionDTO`
  - id: string
  - name: string
  - date: number (epoch ms)
  - sourcePlanId?: string | null
  - loggedSetIds: string[]
  - status: 'active'|'completed'
- `LoggedSetDTO`
  - id: string
  - sessionId: string
  - exerciseId: string
  - timestamp: number (epoch ms)
  - weight: number
  - unit: 'kg'|'lb'
  - reps: number
  - setIndex: number
  - alternative?: { exerciseId: string, weight: number, unit: 'kg'|'lb', reps: number } | null
  - notes?: string
- `UndoTrashDTO`
  - id: string
  - type: 'session'|'loggedSet'|'plan'
  - payload: any
  - expiresAt: number (epoch ms)

### ViewModel / UI types

- `LoggedSetVM` extends `LoggedSetDTO` with:
  - displayTimestamp: string (localized)
  - altPresent: boolean
  - provisional?: boolean (for optimistic writes)
- `GroupedExerciseVM`
  - exerciseId: string
  - exerciseName: string
  - sets: LoggedSetVM[]
- `SessionVM` extends `SessionDTO` with:
  - totalVolume: number
  - totalSets: number
  - groupedExercises: GroupedExerciseVM[]

### Request / Response types for write hooks

- `CreateLoggedSetRequest`
  - sessionId: string
  - exerciseId: string
  - weight: number
  - unit: 'kg'|'lb'
  - reps: number
  - alternative?: { exerciseId: string, weight: number, unit:'kg'|'lb', reps: number }
  - timestamp?: number
- `CreateLoggedSetResponse` = `LoggedSetDTO` (with canonical `id` and `setIndex` allocated by DB transaction)
- `UpdateLoggedSetRequest`
  - id: string
  - weight?: number
  - reps?: number
  - alternative?: {...} | null
  - notes?: string
- `DeleteLoggedSetRequest`
  - id: string
- `InstantiateSessionRequest`
  - planId: string
  - name?: string
- `InstantiateSessionResponse` = `SessionDTO`

## 6. State Management

- Use existing hooks-based data layer + React Query for caching and optimistic updates.
- Local component state:
  - `const { data:session, loading } = useSession(sessionId)`
  - `const { data:loggedSets } = useLoggedSets({ sessionId, sort: 'timestamp' })`
  - `const exercises = useExercises()` (lookup names)
  - Modal state: `quickAddState`, `editSetState` (open + ids)
  - Derived: `groupedSets = useMemo(() => groupByExercise(loggedSets, exercises), [loggedSets, exercises])`
  - Totals: computed in `useSessionViewModel(sessionId)` (memoized) -> totalVolume = Σ(weight reps) (respect includeAlternatives setting)
- Mutations:
  - Create set: `useCreateLoggedSet()` with optimistic update: immediately append provisional LoggedSetVM with provisional id and provisional setIndex, then replace with canonical on success or rollback on error.
  - Update set: `useUpdateLoggedSet()` optimistic update of the single set in cache.
  - Delete set: `useDeleteLoggedSet()` moves to `undo_trash` optimistically and removes from visible caches; schedule permanent deletion at expiry.
- Custom hook: `useSessionViewModel(sessionId)` that composes reads, grouping, totals, and exposes actions (openQuickAdd, createUpdateDelete wrappers) to keep component code small and testable.

## 7. Hooks for state management and data storage in IndexedDB (Integration details)

- Read hooks (already present):
  - `useDbInit()` → check `ready` before enabling write CTAs
  - `useSession(sessionId)` → SessionDTO
  - `useLoggedSets({ sessionId, sort: 'timestamp' })` → LoggedSetDTO[] (supports paging args)
  - `useExercises()` → ExerciseDTO[]
  - `useGetLastSetForExercise(exerciseId)` → LoggedSetDTO | null (prefill)
- Write hooks (already present / to use):
  - `useCreateLoggedSet()`
    - Request: `CreateLoggedSetRequest`
    - Behavior: runs in transaction to compute `setIndex` = max(setIndex in session)+1; inserts into `loggedSets` and appends id to `sessions.loggedSetIds` in same transaction. Returns canonical `LoggedSetDTO`.
    - OnSuccess: invalidate `['sessions']`, `['loggedSets','session',sessionId]`, `['compute','volume',exerciseId]`, `['compute','pr',exerciseId]`.
    - OnError: rollback optimistic and show toast with Retry.
  - `useUpdateLoggedSet()`
    - Request: `UpdateLoggedSetRequest`
    - Behavior: update `loggedSets` store; invalidate same compute keys.
  - `useDeleteLoggedSet()`
    - Request: `{ id }`
    - Behavior: move set record into `undo_trash` with `expiresAt` and remove from `loggedSets`; in transaction update session.loggedSetIds and undo_trash.
    - UI: show UndoSnackbar; `useRestoreFromTrash()` to reverse.
  - `useInstantiateSessionFromPlan()`
    - Request: `InstantiateSessionRequest`
    - Behavior: read PlanDTO, snapshot planExercises, create SessionDTO (with denormalized snapshots as needed), persist in `sessions` and return SessionDTO.
- Request/Response verification: each write hook must return canonical stored record with IDs and computed fields (setIndex). Components must verify the returned object sessionId === expected and handle mismatches by refetch/invalidation.

## 8. User Interactions

- Add set (Quick Add): user taps exercise or FAB → QuickAddModal opens prefilled from `useGetLastSetForExercise` → user edits inputs → Save triggers `useCreateLoggedSet` (optimistic) → modal closes → new set appears → totals update. If create fails: show toast and Retry option.
- Edit set: tap set row → `EditSetModal` opens → save triggers `useUpdateLoggedSet` optimistic -> row updates; on failure rollback with toast.
- Delete set: tap delete → confirm → `useDeleteLoggedSet` -> row removed/greyed, UndoSnackbar shows; Undo restores via `useRestoreFromTrash`.
- Rename session / toggle status: updates session via `useUpdateSession`, invalidates sessions list.
- Instantiate session from plan (from Plans view): `useInstantiateSessionFromPlan` -> transactional create and navigate to `/sessions/:newId`.

## 9. Conditions and Validation

- DB readiness: check `useDbInit().ready` before enabling write actions; show disabled Save and descriptor when `!ready`.
- Input validation:
  - `exerciseId` required for QuickAdd (or select ad-hoc exercise creation flow)
  - `reps` integer, >=1
  - `weight` numeric, >=0
  - `unit` must match user's settings or choose explicitly
- Transaction-level conditions:
  - setIndex allocation done server-side in DB transaction; component should not assume canonical index until response unless marked provisional.
  - Ensure `sessionId` exists before assigning set; if session missing, show error and option to recreate session.
- Aggregation conditions:
  - Include/exclude alternatives per `settings.includeAlternatives` when computing totals and PRs.

## 10. Error Handling

- DB not ready or migration in progress: disable saves; show message and migration progress UI in `DBStatusIndicator`.
- Mutation failures: rollback optimistic changes, show toast with `Retry` and `Save-as-draft` where appropriate.
- Quota errors: show user-friendly message recommending cleanup and export; fallback to localStorage if feasible (deferred decision).
- Schema mismatch/corruption: show recovery CTA in Settings to restore from backup or re-run migration; log error to `events` store for debugging.
- Race conditions (setIndex collisions): rely on DB transaction to compute canonical setIndex; reconcile provisional optimistic entries on response by replacing provisional id/index with canonical values.
- Undo failures: if restore fails, show error and keep user on Recovery/Settings flow.

## 11. Implementation Steps

1. Create route `/sessions/:sessionId` and `SessionView` skeleton. Wire route param parsing and `useDbInit()` guard to show skeleton while DB not ready.
2. Implement `useSessionViewModel(sessionId)` hook: compose `useSession`, `useLoggedSets`, `useExercises`, compute grouped exercises and totals, and expose action wrappers.
3. Build `SessionHeader` component with rename & status toggle wired to `useUpdateSession` and delete to `useDeleteSession` with confirm.
4. Build `LoggedSetRow` UI and keyboard/touch-friendly actions (edit/delete), alt pill rendering.
5. Build `LoggedSetsList` and grouping logic; test ordering by setIndex and timestamp, add pagination "Load more" behavior using `useLoggedSets` paging params.
6. Build `QuickAddModal` using `useGetLastSetForExercise` to prefill and wire `useCreateLoggedSet` with optimistic updates. Ensure disabled Save when `!isDbReady`.
7. Build `EditSetModal` wired to `useUpdateLoggedSet` and `useDeleteLoggedSet` and confirm flows; ensure optimistic update/rollback.
8. Implement `SessionTotalsBar` computing volume & set count; wire includeAlternatives toggle to `useUpdateSetting('includeAlternatives')`.
9. Implement `UndoSnackbar` global handler for delete operations; connect to `useRestoreFromTrash` and schedule cleanup.
10. Add unit/integration tests for: create logged set, edit set, delete+undo, instantiate session from plan, totals calculations.
11. Accessibility pass: ARIA labels, modal focus trap, 44–48px touch targets, high contrast text.
12. Performance pass: test with large number of sets, add cursor-based pagination and virtualization if needed.

## Todos

- create-session-view: Implement SessionView route and skeleton
- implement-viewmodel: Create `useSessionViewModel` hook
- ui-components: Implement `SessionHeader`, `LoggedSetRow`, `LoggedSetsList`, `SessionTotalsBar`
- modals: Implement `QuickAddModal` and `EditSetModal`
- undo: Implement `UndoSnackbar` integration
- tests: Add unit/integration tests for core flows
