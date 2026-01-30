markdown# UI Architecture for Your Gym Mate

## 1. UI Structure Overview

Your Gym Mate is a mobile-first PWA with a local-first architecture: all data lives in IndexedDB and the UI accesses data via a thin hooks-based layer. The UI is optimized for one-handed mobile use (bottom-tab navigation), fast logging (Quick Add), and accessible controls (44–48px tap targets, ARIA). React + TypeScript + Tailwind + Shadcn UI compose the UI stack. React Query (recommended) is used for caching, optimistic updates, and invalidation; hooks remain agnostic to allow a DbProvider alternative.

Key principles:

- Local-first: read/write directly to IndexedDB via hooks; offline == online.
- Hooks-per-store: one primary hook per object store for reads and writes.
- Optimistic UI: immediate UI updates on writes with rollback on failure.
- Cursor-based pagination & streaming aggregates to avoid OOM.
- Accessibility, PWA readiness, and migration-aware startup.

## 2. IndexedDB Data Layer Integration

Overview of hooks-based data layer

- `useDbInit()` exposes { db, ready, upgrading, version, error } and helper `withTransaction(storeNames, mode, cb)`.
- Read hooks: return `{ data, loading, error, refetch }`.
- Write hooks: return `{ mutate(payload, opts), loading, error, data }` and accept `optimistic` and callbacks.
- Recommended caching: React Query with keys per store and parameterized queries.

Main IndexedDB stores and purpose

- `exercises` — canonical exercise definitions (id, name, category, equipment).
- `plans` — user plans with ordered `planExercises` and denormalized `exerciseIds`.
- `sessions` — instantiated sessions (id, name, date, status, sourcePlanId).
- `loggedSets` — per-set rows (sessionId, exerciseId, alt, weight, reps, timestamp, exerciseIds multiEntry).
- `settings` — key-value preferences.
- `events` — local telemetry for time-to-log and UX metrics.
- `undo_trash` — short-lived storage for deleted items (expiresAt).

Core data hooks and computed hooks

- Read hooks: `useExercises()`, `usePlans()`, `useSessions(params)`, `useLoggedSets(params)`, `useSettings(key)`, `useUndoTrash()`.
- Write hooks: `useCreateExercise()`, `useUpdateExercise()`, `useDeleteExercise()`, `useCreatePlan()`, `useUpdatePlan()`, `useDeletePlan()`, `useCreateSession()`, `useUpdateSession()`, `useDeleteSession()`, `useCreateLoggedSet()`, `useUpdateLoggedSet()`, `useDeleteLoggedSet()`, `useRestoreFromTrash()`.
- Business / convenience hooks: `useInstantiateSessionFromPlan()`, `useGetLastSetForExercise(exerciseId)`, `useQuickAddSet()`.
- Aggregate hooks: `useComputePR(exerciseId, opts)`, `useComputeVolume(opts)` — streaming cursor-based aggregators with debouncing.

Transaction patterns and cross-store ops

- Use `withTransaction(['sessions','loggedSets','undo_trash'], 'readwrite', cb)` for multi-store changes (delete session + move loggedSets to undo_trash).
- Atomic restore: restore from `undo_trash` into proper stores inside transaction.
- Retry transient failures with exponential backoff; surface retry actions to user for long-running migration failures.

Caching strategy & invalidation

- React Query keys: `['exercises']`, `['plans']`, `['sessions', params]`, `['loggedSets','session',sessionId]`, `['loggedSets','exercise',exerciseId,filters]`, `['compute','pr',...]`, `['compute','volume',...]`.
- Invalidation rules:
  - create/update/delete `loggedSet` → invalidate session lists, session's loggedSets, exercise loggedSets, and compute keys for PR/volume for affected exerciseId(s).
  - create/update/delete `plan` → invalidate `['plans']` and any cached instantiate endpoints.
  - update `settings` → invalidate settings cache and components that consume UI preferences.

Optimistic update patterns

- All create/update/delete operations accept an optimistic update: update React Query cache immediately, perform DB write, rollback on failure and show error toast with retry.
- Delete flows: move object(s) into `undo_trash` (optimistic removal from visible lists), show Undo snackbar for configured undoWindow (default ~8s), finalize permanent delete at expiry.

Error handling & retry strategies

- Central `dbErrorToUserMessage(err)` maps low-level errors to user-friendly messages (quota, transaction abort, migration failure).
- Mutations expose `onError` to allow rollback and show toast with Retry action.
- Long migrations surface progress via `useDbInit()` upgrading flag & `settings.meta.migrationProgress`.

## 3. View List

Overview: maps each view to purpose, hooks, data flow, components, optimistic patterns.

1. Bottom Tab Shell (root)

- Path: `/`
- Purpose: primary navigation container (Sessions, Plans, Quick Log, Dashboard, Settings).
- Data hooks used: `useDbInit()`, `useSettings('navPref')` (optional).
- Data flow: shows global DB-ready indicator; registers SW update banner.
- Loading/error: show splash while !ready; migration progress UI when upgrading; block navigation until DB ready for non-destructive flows.
- Key components: `BottomTabBar`, `DBStatusIndicator`, `UpdateAvailableBanner`.
- Accessibility: large hit targets, labels, ARIA role="tablist".

2. Sessions List

- Path: `/sessions`
- Purpose: list sessions sorted by date, quick access to active session.
- Key info: session name, date, status badge (active/completed), session volume, session-set count, source plan indicator.
- Data hooks used: `useSessions({ page?, pageSize?, status?, dateRange? })`, `useComputeVolume({ sessionId })` (optional per-row cached volume).
- Data flow: read sessions via index `status_date` with cursor-based pagination ("Load more"); fetch per-session summary aggregates lazily.
- Loading/error: skeleton rows on loading; db errors show retry CTA.
- Key components: `SessionRow`, `CreateSessionFAB`, `FilterBar`.
- Optimistic patterns: create session optimistic add to top of list; rename/status toggle immediate update; delete session moves to `undo_trash` via transactional write with Undo.
- Accessibility & UX: swipe-to-delete with confirm modal; clear update of status changes.

3. Session Detail (Session View)

- Path: `/sessions/:sessionId`
- Purpose: view and manage logged sets for a session (ordered).
- Key info: session header (name, date, status, source plan link), list of `LoggedSet` rows ordered by setIndex/timestamp, per-exercise grouping visually, session totals.
- Data hooks used: `useSessions({ id })` or `useSession(id)`, `useLoggedSets({ sessionId, sort:'timestamp' })`, `useGetLastSetForExercise(exerciseId)` for Quick Add prefill, `useUpdateSession()`, `useCreateLoggedSet()`, `useUpdateLoggedSet()`, `useDeleteLoggedSet()`.
- Data flow: listen to `loggedSets` for sessionId; paginate if many sets; Quick Add modal uses last-set hook to prefill.
- Loading/error: show session skeleton; individual set row errors surfaced inline with Retry/Edit buttons.
- Key components: `LoggedSetRow` (shows alt pill when alternative present), `QuickAddModal`, `EditSetModal`, `SessionTotalsBar`.
- Optimistic patterns: Quick Add uses `useQuickAddSet()` optimistic write to cache & UI; editing set updates cache immediately; delete moves set to `undo_trash` and greys-out row until permanent delete.
- Accessibility & UX: each set row has accessible labels, edit & delete buttons sized for touch, confirm delete, undo via snackbar.

4. Quick Log (Quick Add)

- Path: `/quick-log` (also accessible as modal from other views)
- Purpose: fastest path to log a set; prefilled with last values for chosen exercise.
- Key info: exercise selector, weight input, reps input, optional alt exercise toggle+fields, Save CTA, history preview of last set.
- Data hooks used: `useExercises({ q? })`, `useGetLastSetForExercise(exerciseId)`, `useQuickAddSet()`, `useLogEvent('quick_add')`.
- Data flow: select exercise → pre-fill from last set → optimistic create via `useQuickAddSet()` → update `['sessions']`/`['loggedSets']` caches.
- Loading/error: disabled Save until db ready; show inline validation errors; on write failure rollback and show toast with Retry.
- Key components: `ExerciseAutocomplete`, `PrefillPreview`, `SaveCTA`.
- Optimistic patterns: immediate local add to session's list if active session selected; if no session selected, allow creating ad-hoc session and attach set in same transactional flow.
- Accessibility & UX: large single-handed Save button; keyboard numeric input optimization.

5. Plans List

- Path: `/plans`
- Purpose: list, create, edit, delete workout plans.
- Key info: plan name, exercise count, instantiate CTA.
- Data hooks used: `usePlans({ page?, q? })`, `useCreatePlan()`, `useUpdatePlan()`, `useDeletePlan()`, `useInstantiateSessionFromPlan()`.
- Data flow: instantiate plan → transactional create session (copy snapshots) and navigate to session detail.
- Loading/error: skeleton rows; delete confirmation; on instantiate failure rollback and show error.
- Key components: `PlanRow`, `PlanEditor` (modal or route), `InstantiateButton`.
- Optimistic patterns: create/update plan optimistic; delete requires confirmation and is immediate in UI; sessions created from deleted plan remain (per PRD).

6. Plan Editor

- Path: `/plans/:planId/edit` or modal
- Purpose: create/edit planExercises, defaults, alternative mapping.
- Key info: plan name, ordered list of planExercises (exercise selector, default sets/reps/weight, alt).
- Data hooks used: `usePlans({ id })`, `useExercises()`, `useCreatePlan()`, `useUpdatePlan()`.
- Data flow: validate entries client-side before saving; on save update `plans` cache and keep `exerciseIds` denormalized.
- Loading/error: inline validation messages; save CTA disabled when invalid.
- Accessibility & UX: drag-to-reorder exercises, clear controls for default values, accessible form labels.

7. Dashboard

- Path: `/dashboard`
- Purpose: filterable analytics: PR table, trend lines, per-session volume bars.
- Key info: filters (exercise multi-select, includeAlternatives toggle, date presets/custom range, min/max weight/reps), chart area, PR list, totals.
- Data hooks used: `useExercises()`, `useComputePR(exerciseId, filters)`, `useComputeVolume(filters)`, `useSettings('includeAlternatives')`.
- Data flow: filters debounced (150–300ms) → streaming aggregate hooks recompute using indexedDB cursors → update charts/tables progressively; show skeleton / progressive loading.
- Loading/error: show spinner/skeleton in charts while streaming; errors show friendly message with Retry.
- Key components: `FilterBar`, `TrendChart`, `PRTable`, `VolumeBarChart`, `DebouncedFilterInputs`.
- Optimistic patterns: none for aggregates — they reflect persisted data; when sets change elsewhere, recompute invalidates and refreshes.
- Accessibility & UX: charts with accessible annotations, table rows keyboard focusable, legend and toggle controls keyboard operable.

8. Settings

- Path: `/settings`
- Purpose: app preferences: units, undoWindow, DB/migration status, restore deleted items.
- Key info: weight units (kg/lb), undoWindow seconds, DB version & migration progress, Recent deletes/Restore UI.
- Data hooks used: `useSettings()`, `useUndoTrash()`, `useRestoreFromTrash()`, `useUpdateSetting()`.
- Data flow: settings read/write via `settings` store; restore triggers transactional restore and cache invalidation.
- Loading/error: show DB ready & upgrading states; migration-progress CTA if long-running.
- Key components: `SettingsForm`, `DBStatusPanel`, `RecentDeletesList`.
- Optimistic patterns: settings changes optimistic but persisted; restore uses transaction and shows progress.

9. UpdateAvailableBanner & Global Toasts

- Purpose: non-blocking Service Worker update banner, global toasts for Undo/Errors.
- Data hooks used: `useDbInit()` (for ready), SW registration hook, `useUndoTrash()` for Undo action.
- UX: banner with "Refresh" action; toasts have accessible labels and actions (Undo/Retry).

## 4. User Journey Map

Main use case: Create plan → Instantiate session → Quick Add set → Edit set → View dashboard update.

Step-by-step:

1. User creates plan in Plans → `useCreatePlan()` optimistic write updates `['plans']` cache → persisted to IndexedDB → onSuccess keep; onError rollback and show toast.
2. User taps "Start Session" on plan → `useInstantiateSessionFromPlan(planId)` reads plan, constructs session object with ordered exercises and denormalized snapshots, writes `sessions` via transaction → invalidates `['sessions']` cache and navigates to `/sessions/:id`.
3. In Session Detail, user taps exercise → opens `QuickAddModal` → `useGetLastSetForExercise(exerciseId)` pre-fills values.
4. User saves set → `useQuickAddSet()` performs optimistic cache update for `['loggedSets','session',sessionId]` and `['loggedSets','exercise',exerciseId]`, persists to DB; UI shows set immediately; background compute hooks (`useComputeVolume`, `useComputePR`) are invalidated and recompute.
5. User edits a set → `useUpdateLoggedSet()` optimistic update on row; on failure rollback and show retry.
6. User views Dashboard → debounced filters trigger `useComputeVolume` and `useComputePR` streaming aggregators; charts render progressively.

Optimistic updates & rollback scenarios

- Quick Add: optimistic add → DB write fails → rollback (remove set from cache) + toast with Retry and Save-as-draft option.
- Delete session/set: move to `undo_trash` optimistic → UI removes/greys-out item → user taps Undo within undoWindow to call `useRestoreFromTrash()`; if not undone, scheduled cleanup permanently deletes.

Cache invalidation triggers

- On loggedSet mutations: invalidate session list, session's loggedSets, exercise-specific loggedSets, and aggregate compute keys for affected exercises.
- On plan mutation: invalidate `['plans']` and any cached instantiate results.

Performance considerations

- Use cursor pagination for session lists and loggedSets; fetch per-session aggregates lazily.
- Debounce filter inputs (150–300ms) to reduce aggregate recomputations.
- Streaming aggregations render partial results; show skeleton/percent complete for long scans.

## 5. Layout and Navigation Structure

Primary navigation

- Bottom Tab Bar (mobile-first): Sessions, Plans, Quick Log (center FAB), Dashboard, Settings.
- On larger screens, use a left rail with the same items; allow keyboard navigation.

Route guards and DB-ready state

- App root shows splash while `useDbInit().ready === false`.
- If `upgrading === true`, show migration progress banner and limit destructive operations until safe; non-destructive reads remain available where possible.
- All routes depend on DB-ready except lightweight /about/help pages.

Navigation patterns to minimize refetching

- Keep sessions list and session detail both mounted where possible (split-screen on large screens) to reuse cached data.
- Use React Query's background refetch to refresh aggregates; avoid full-store scans on navigation by relying on cache keys and proper invalidation.

## 6. Key Components

- Data-connected components:
  - `SessionRow`, `PlanRow`, `LoggedSetRow`, `ExerciseAutocomplete`, `FilterBar`, `SessionTotalsBar`.
- Loading/error boundary components:
  - `SkeletonList`, `ErrorRetry`, `MigrationProgressPanel`.
- Optimistic UI feedback components:
  - `UndoSnackbar` (with accessible controls), `OptimisticPlaceholder` (greyed-out row while pending).
- DB status components:
  - `DBStatusIndicator` (ready/upgrading/error), `UpdateAvailableBanner`.
- Charting components:
  - `TrendChart`, `VolumeBarChart`, `PRTable` — lightweight chart lib with ARIA descriptions.

## 7. Data Flow Patterns

Create operations

- Pattern: optimistic create → React Query cache update (e.g., add session to `['sessions']`) → IndexedDB write via hook → onSuccess: no-op or refetch aggregates; onError: rollback and show Retry.

Update operations

- Pattern: optimistic patch in cache → write to DB → invalidate dependent keys (loggedSets → session aggregates and compute hooks) → rollback on error.

Delete operations

- Pattern: move deleted payload to `undo_trash` inside a transaction → optimistic removal from visible lists → show Undo snackbar for undoWindow → if expired, perform permanent delete cleanup job.

Aggregate computations

- Pattern: filters → debounce → call streaming aggregator hook → return progressive results via React Query or hook subscription → update charts and PR table; stop early where possible (PR computation).

Pagination/lazy loading

- Cursor-based pagination: store lastPrimaryKey token per query; "Load more" requests resume cursor; session and loggedSets lists load incrementally.

## 8. Error Handling & Edge Cases

IndexedDB transaction failures

- Retry with exponential backoff automatically a few times for transient failures; after retries fail show toast with Retry and Diagnose action (open DBStatusPanel).
- Rollback optimistic UI changes and mark affected items with error state to allow Retry.

Concurrent modification conflicts

- Single-user environment reduces conflicts; adopt last-write-wins for UI edits. If two UI components attempt simultaneous writes, transactions will serialize; surface conflict messages only if validation fails.

DB migration states

- `useDbInit()` exposes `upgrading` and `version` with `migrationProgress`; show migration banner and avoid destructive writes; allow read-only access where safe.

Quota exceeded errors

- Map to friendly message: "Storage limit reached" with guidance (clear history/export data) and Retry; provide settings option to purge old `events` or `undo_trash`.

Corrupted data scenarios

- If validation detects corrupted shape, show diagnostic UI in Settings with Repair/Reset options; optionally export corrupted records to `events` for later analysis.

Other edge cases

- Missing session when creating a loggedSet: reject write and prompt user to create/select session; Quick Add handles this by creating ad-hoc session transactionally.
- Large dataset performance: stream aggregations and paginated lists; show progressive UI and don't attempt full-memory loads.

## 9. Mapping PRD User Stories → UI Elements & Hooks

- US-001 Create a plan → Plan Editor UI → `useCreatePlan()`, `usePlans()` (post-create invalidate).
- US-002 Edit plan → Plan Editor → `useUpdatePlan()`, `usePlans()` invalidate.
- US-003 Delete plan → Plans List delete flow → `useDeletePlan()` (no cascade).
- US-004 Instantiate session → PlanRow Instantiate → `useInstantiateSessionFromPlan()`, `useSessions()` invalidate.
- US-005 Create ad-hoc session → Sessions FAB → `useCreateSession()`.
- US-006 Mark session active/completed → Session header status toggle → `useSetSessionStatus()` / `useUpdateSession()`.
- US-007 Log a set → Session Detail / Quick Log → `useQuickAddSet()` / `useCreateLoggedSet()`, `useGetLastSetForExercise()`.
- US-008 Log with alternative → QuickAdd/EditSet modal alt fields → `useCreateLoggedSet()` with alternative object; `loggedSets.exerciseIds` multiEntry ensures aggregation inclusion.
- US-009 Edit a logged set → EditSetModal → `useUpdateLoggedSet()`.
- US-010 Delete a logged set → Delete flow → `useDeleteLoggedSet()` -> move to `undo_trash`.
- US-011 View session history → Session Detail list → `useLoggedSets({sessionId})`.
- US-012 Quick log reuse last set → `useGetLastSetForExercise()` prefill in QuickAdd.
- US-013 View dashboard → Dashboard view → `useComputePR()`, `useComputeVolume()`.
- US-014 Dashboard filters → Debounced FilterBar → streaming aggregate hooks.
- US-015 PR calculation → `useComputePR()` and PR table UI.
- US-016 Aggregate volume → `useComputeVolume()` and Volume charts.
- US-017 Edit/Delete sessions → `useUpdateSession()`, `useDeleteSession()` with transactional loggedSets removal.
- US-018/019 Export/Import → deferred; UI placeholders in Settings linking to future feature.
- US-020 Local access control → Settings toggle and gating flow (deferred implementation).
- US-021 App settings → Settings UI → `useSettings()` and `useUpdateSetting()`.
- US-022 Alternatives handling → Toggle in Dashboard and alt pill UI in rows; hooks accept includeAlternatives param.
- US-023 Undo delete → Delete flow + `undo_trash` + `UndoSnackbar` using `useUndoTrash()` and `useRestoreFromTrash()`.
- US-024 Offline reliability → Hooks all operate on IndexedDB; `useDbInit()` signals ready.
- US-025 Accessibility → app-wide design tokens, component rules, and enforcement in UI components.

## 10. Potential User Pain Points & Mitigations

- Slow aggregate recompute on large datasets:
  - Mitigation: streaming aggregators, debounced filters, progressive chart rendering.
- Losing a recently-deleted item:
  - Mitigation: undo snackbar, Recent Deletes list in Settings, `undo_trash` store.
- Confusing state during migrations:
  - Mitigation: show migration progress in DBStatusPanel, disable destructive actions, surface clear messaging.
- Mistaken edits during fast logging:
  - Mitigation: large Save CTA, prefill from last set, confirmable undo for deletes, lightweight edit modal.
- Storage quota issues:
  - Mitigation: friendly messages, purge options, compact old telemetry/events.

---

This file is the UI architecture plan for Your Gym Mate. Implementers should use it to guide component breakdowns, hook implementations, and acceptance testing mapping. Keep hooks and UI decoupled: UI consumes the hook contracts listed above and treats cache invalidation and optimistic behavior as first-class patterns.

# UI Architecture for Your Gym Mate

## 1. UI Structure Overview

- Mobile-first PWA, local-first data model: the UI is a React + TypeScript single-page app that reads/writes exclusively to IndexedDB via a hooks-based data layer. No server sync in MVP.
- Primary navigation: bottom tab bar (mobile) with Sessions, Plans, Quick Log, Dashboard, Settings. Larger screens use an expanded left rail while preserving the same route structure.
- Key goals: fast logging (<20s), optimistic UX, accessible touch-friendly controls (44–48px targets), and robust offline-first behavior with clear DB-ready/migration state.

## 2. IndexedDB Data Layer Integration

- Overview:
  - All views interact with IndexedDB through a set of React hooks (thin UI layer → hooks → idb wrapper). `useDbInit` provides db lifecycle (ready, upgrading, error) and `withTransaction` for cross-store transactions.
- Main stores and purposes:
  - `exercises` — canonical exercise definitions (useExercises).
  - `plans` — plan definitions and planExercises (usePlans).
  - `sessions` — instantiated sessions, status (useSessions).
  - `loggedSets` — set-level rows (core store; useLoggedSets).
  - `settings` — key/value prefs (useSettings).
  - `events` — local telemetry (useEvents).
  - `undo_trash` — temporary deleted objects for undo (useUndoTrash).
- Core hooks:
  - Read hooks return `{ data, loading, error, refetch }`: `useExercises`, `usePlans`, `useSessions`, `useLoggedSetsBySession`, `useLoggedSetsByExercise`, `useSettings`, `useUndoTrash`.
  - Write hooks expose `{ mutate, loading, error, data }` and support optimistic updates: `useCreate*`, `useUpdate*`, `useDelete*`, plus business hooks: `useInstantiateSessionFromPlan`, `useGetLastSetForExercise`, `useQuickAddSet`, `useComputePR`, `useComputeVolume`.
- Computed/aggregate hooks:
  - `useComputePR(exerciseId, opts)` — reverse cursor on `exerciseId_weight`, stops early on first match.
  - `useComputeVolume({ exerciseIds, from, to, includeAlternatives })` — streaming cursor aggregation.
  - Debounced inputs (150–300ms) and skeleton/UI loading for long-running computes.
- Transaction patterns:
  - `withTransaction(storeNames, mode, cb)` for atomic cross-store ops (delete session + loggedSets → move to `undo_trash`, restore from trash).
- Caching strategy:
  - Recommend React Query key patterns: `['exercises']`, `['plans']`, `['sessions', params]`, `['loggedSets', 'session', sessionId]`, `['loggedSets','exercise', exerciseId, filters]`.
  - Invalidation rules: creating/updating/deleting a `loggedSet` invalidates related session and exercise queries and aggregate caches.
- Optimistic updates:
  - UI applies optimistic cache change, shows temporary toasts/snackbar, persists to IndexedDB; on failure rollback and show actionable error via `dbErrorToUserMessage`.
- Error & retry:
  - Central `dbErrorToUserMessage(err)` mapping. Transient errors retried with exponential backoff; permanent errors surface a dismissible message and suggested actions (retry, export, restore).

## 3. View List

Note: Each view lists its route, purpose, hooks, data flow, loading/error handling, key components, optimistic patterns, and accessibility notes.

- Sessions

  - Path: `/sessions`
  - Purpose: list sessions (active & historical), start/new session, instantiate from plan.
  - Key info: session name, date, status badge (active/completed), session volume, last activity.
  - Data hooks: `useSessions({ sort: 'date_desc', page })`, `useComputeVolume(sessionId)` (for per-session volume), `useDbInit` for DB state.
  - Data flow: read sessions list; on select navigate to Session Detail; create → `useCreateSession()`; instantiate → `useInstantiateSessionFromPlan()`.
  - Loading / error: skeleton rows while loading; route guard if DB not ready (show migration/status UI); errors map via `dbErrorToUserMessage` with retry.
  - Components: SessionList, SessionRow (aria labels, large tap area), NewSessionModal, InstantiateFromPlanSheet.
  - Optimistic patterns: creating session shows row immediately (optimistic id + "saving" indicator); rollback on failure with toast.
  - Accessibility: each row is keyboard focusable; swipe-to-delete uses accessible confirm modal.

- Session Detail

  - Path: `/sessions/:id`
  - Purpose: view and log sets for a session; edit/rename session.
  - Key info: ordered logged sets, per-exercise groups, quick-add button, session metadata.
  - Data hooks: `useSessions({ id })` or `useSession(id)`, `useLoggedSetsBySession(sessionId)`, `useGetLastSetForExercise(exerciseId)`, `useSettings`.
  - Data flow: subscribe to loggedSets cursor for session; quick-add uses `useQuickAddSet()`; edit set uses `useUpdateLoggedSet()`; delete uses `useDeleteLoggedSet()` which moves to `undo_trash`.
  - Loading / error: show spinner or empty-state if no sets; optimistic create shows transient placeholder set immediately.
  - Components: SessionHeader (rename/status toggle), LoggedSetRow (shows alternative pill inline), QuickAddFAB, EditSetModal, UndoSnackbar.
  - Optimistic patterns: Quick Add — optimistic insert into list and update session aggregates; rollback with toast and remove placeholder.
  - Accessibility: modals trap focus and have keyboard shortcuts; form inputs labeled; tap targets large.

- Quick Log

  - Path: `/quick-log` (accessible via bottom tab & FAB)
  - Purpose: single-tap quick logging pre-filled with last-set values.
  - Key info: exercise picker (search), prefilled weight/reps from `useGetLastSetForExercise`, save button.
  - Data hooks: `useExercises({ q })`, `useGetLastSetForExercise(exerciseId)`, `useQuickAddSet()`, `useSettings`.
  - Data flow: select exercise → fetch last set → present Quick Add modal → optimistic create via `useQuickAddSet()` into active session or create ephemeral session if none.
  - Loading / error: debounce search (150–300ms); show last-set skeleton while fetching; on DB error show compact inline error.
  - Components: ExerciseSearch, LastSetPreview, QuickAddForm.
  - Optimistic patterns: create set shows immediate confirmation and temporary UI state; on failure show retry and rollback.
  - Accessibility: large controls, screen-reader friendly labels for exercise and last-set info.

- Plans

  - Path: `/plans`
  - Purpose: create/edit/delete plans and instantiate sessions from plans.
  - Key info: plan name, exercise count, last used date, actions (edit, instantiate, delete).
  - Data hooks: `usePlans()`, `useCreatePlan()`, `useUpdatePlan()`, `useDeletePlan()`, `useExercises()` for lookup.
  - Data flow: CRUD on plans with validation; instantiate uses `useInstantiateSessionFromPlan()`.
  - Loading / error: form validation errors map to field-level messages; list uses skeletons.
  - Components: PlanList, PlanEditor (ordered planExercises), PlanExerciseRow (defaults editor), InstantiateSheet.
  - Optimistic patterns: plan create/update optimistic in list; deletion confirms and then moves to undo flow? (plans deletion does not remove sessions).
  - Accessibility: drag handle keyboard accessible for ordering exercises.

- Dashboard

  - Path: `/dashboard`
  - Purpose: filterable aggregates, PR table, trend/volume charts.
  - Key info: filters (exercise, date presets/custom, min/max weight/reps), include-alternatives toggle, charts, PR table.
  - Data hooks: `useComputeVolume(filters)`, `useComputePR(exerciseId, filters)`, `useExercises()`, `useSettings()`.
  - Data flow: on filter change (debounced 150–300ms) recalc aggregates via streaming cursor hooks; charts read aggregated result.
  - Loading / error: show skeleton charts and spinner for long aggregations; partial results stream in where supported (progress indicator).
  - Components: FilterBar (debounced), TrendChart, VolumeBar, PRTable, IncludeAlternativesToggle.
  - Optimistic patterns: none for aggregates; ensure UI reflects pending writes immediately via invalidation of aggregate keys on loggedSet writes.
  - Accessibility: charts provide accessible summaries and table fallback.

- Settings
  - Path: `/settings`
  - Purpose: units (kg/lb), undoWindow, DB/migration status, manage recent deletes.
  - Key info: `useSettings()` values, DB status from `useDbInit`, Undo Trash viewer (`useUndoTrash()`).
  - Data flow: update settings via `useUpdateSetting()`; show migration progress and upgrade actions; allow restore from `undo_trash`.
  - Loading / error: show DB-ready state and migration progress UI; expose "retry migration" action on failure.
  - Components: SettingsForm, DBStatusIndicator, RecentDeletesList.
  - Optimistic patterns: small settings changes apply immediately; rollback on DB error with toast.
  - Accessibility: ensure forms have labels and toggles have clear accessible descriptions.

## 4. User Journey Map

Main Use Case: Create plan → instantiate session → log sets quickly → view progress.

1. Create Plan (Plans view)
   - User opens `/plans` → `usePlans()` reads plans.
   - Creates new plan via PlanEditor → `useCreatePlan()` optimistic insert into list.
   - On success: plan persisted; on failure: rollback + show error from `dbErrorToUserMessage`.
2. Instantiate Session (Plans → Sessions)
   - User taps "Start Session" on plan → `useInstantiateSessionFromPlan(planId)` reads plan then writes session to `sessions`.
   - Transaction: single-store create; optimistic UI shows session row in `/sessions`.
3. Start Session (Sessions)
   - User opens session `/sessions/:id` → `useLoggedSetsBySession` returns empty list.
4. Quick Add Set (Session Detail / Quick Log)
   - User taps exercise → `useGetLastSetForExercise(exerciseId)` returns last values; Quick Add modal prefilled.
   - Submit → `useQuickAddSet()` performs optimistic write: add placeholder LoggedSet with temporary id in local cache and UI.
   - Persist to `loggedSets`: success replaces placeholder with real saved row; failure rolls back and prompts retry.
   - On create: invalidate `['sessions']`, `['loggedSets','session',sessionId]`, `['loggedSets','exercise',exerciseId]` and aggregate keys.
5. View Dashboard
   - User opens `/dashboard` → `useComputeVolume` and `useComputePR` compute aggregates from `loggedSets` via streaming cursor.
   - If a recent optimistic write exists, invalidation ensures aggregates reflect updates immediately (React Query triggers refetch).

Rollback scenarios

- If DB write fails (quota/transaction abort), rollback optimistic cache changes, show snackbar with action (Retry / Report), and place failed operation in transient retry queue (exponential backoff).

Performance considerations

- Use cursor-based pagination for long lists; load more on user request, preserve scroll position.
- Debounce filter inputs to avoid excessive DB scans.
- Stream aggregate results and show progressive UI rather than blocking full computation.

## 5. Layout and Navigation Structure

- Primary navigation: BottomTabNav with five tabs (Sessions, Plans, Quick Log, Dashboard, Settings).
- Secondary navigation: in-screen modals/sheets for quick-add, plan editor, set editor.
- Routes:
  - `/sessions` → list
  - `/sessions/:id` → detail
  - `/plans` → list
  - `/plans/:id/edit` → plan editor
  - `/quick-log` → quick add interface
  - `/dashboard` → analytics
  - `/settings` → preferences
- Route guards:
  - Global DB-ready guard from `useDbInit`: show lightweight status/migration UI if not ready; otherwise allow routes.
  - Prevent destructive actions during an active migration; queue user actions or show migration progress and option to continue later.
- Navigation optimizations:
  - Keep query params for filters and pagination to minimize re-fetch on back/forward.
  - Pre-warm aggregate caches when user opens Sessions (prefetch `useComputeVolume` for recent exercises).

## 6. Key Components

- Data-connected components:
  - LoggedSetRow — shows set data + alternative pill; connects to `useUpdateLoggedSet` and `useDeleteLoggedSet`.
  - ExerciseSearch — debounced search using `useExercises`.
  - SessionList/PlanList — uses list hooks with cursor-based pagination.
- Generic components:
  - DbStatusIndicator — shows ready/upgrading/error, linked to `useDbInit`.
  - OptimisticPlaceholder — reusable UI for transient optimistic items.
  - UndoSnackbar — handles undo window, calls `useRestoreFromTrash` or finalizes delete.
  - LoadingSkeleton & ErrorBoundary — per-view variants that map to DB loading and error states.
  - AccessibleModal/Dialog — used for Quick Add and Edit flows (focus trap, ARIA).

## 7. Data Flow Patterns

- Create (e.g., LoggedSet):

  1. UI calls `useQuickAddSet().mutate(payload, { optimistic: true })`.
  2. Optimistic cache insert and UI placeholder shown.
  3. Hook writes to `loggedSets` inside transaction.
  4. On success: replace placeholder with saved item, invalidate dependent queries and aggregate keys.
  5. On failure: rollback cache and show actionable error.

- Update (e.g., edit set):

  1. Apply optimistic update to cache and UI.
  2. Write update to `loggedSets` with `withTransaction` if cross-store impacts.
  3. On success: confirm UI; on failure: rollback and notify.

- Delete:

  1. Move payload to `undo_trash` inside transaction with `expiresAt = now + undoWindowMs`.
  2. Remove from visible lists (optimistic).
  3. Show UndoSnackbar (~8s default from settings).
  4. On Undo: restore from `undo_trash` via `useRestoreFromTrash`.
  5. On expiry: scheduled cleanup permanently deletes from `undo_trash`.

- Aggregates:

  - Debounced filter inputs → call streaming aggregator hooks (`useComputeVolume`, `useComputePR`) that use cursors and yield results progressively; UI shows partial results and progress indicator.

- Pagination / Lazy loading:
  - Cursor-based pattern: hooks expose `fetchNext(cursorToken)` which continues the cursor from last key; UI uses "Load more" pattern.

## 8. Error Handling & Edge Cases

- IndexedDB transaction failures:
  - Retry with exponential backoff for transient errors (blocked transaction). After N retries, present user with retry action and log event.
- Concurrent modification conflicts:
  - Single-user model: last-write-wins for concurrent UI edits; detect outdated edit attempts by comparing `updatedAt` and warn user if conflict detected.
- DB migration states:
  - `useDbInit` exposes `upgrading` and migration progress in `settings.meta`. During heavy migrations show non-blocking banner and disable destructive actions; queue writes or show "Try again later" if necessary.
- Quota exceeded:
  - Map to friendly message via `dbErrorToUserMessage`, offer guidance (clear old data, export), and prevent further writes until user acts.
- Corrupted data:
  - Detect validation failures during reads; surface repair option in Settings to attempt deterministic repair (run validation/migration scripts), backup/export before repair.
- Undo window / scheduled cleanup:
  - Ensure cleanup runner survives app restarts by checking `undo_trash.expiresAt` on `useDbInit` start and scheduling deletions.

## 9. Mapping PRD User Stories → UI & Hooks (explicit)

- US-001 Create a workout plan
  - UI: Plans → PlanEditor. Hooks: `useCreatePlan`, `usePlans`. UX: optimistic create; validation errors shown inline.
- US-002 Edit a workout plan
  - UI: PlanEditor. Hooks: `useUpdatePlan`. UX: preserve order, denormalize `exerciseIds`.
- US-003 Delete a plan
  - UI: Plans list delete flow with confirm. Hooks: `useDeletePlan`. Behavior: does NOT delete sessions.
- US-004 Instantiate a session from a plan
  - UI: Plans → Instantiate action. Hooks: `useInstantiateSessionFromPlan` → `useCreateSession`.
- US-005 Create ad-hoc session
  - UI: Sessions → New Session modal. Hooks: `useCreateSession`.
- US-006 Start/mark session active/completed
  - UI: SessionHeader status toggle. Hooks: `useSetSessionStatus`.
- US-007 Log a set for an exercise
  - UI: Session Detail Quick Add/Edit. Hooks: `useQuickAddSet`, `useCreateLoggedSet`, `useLoggedSetsBySession`.
- US-008 Log alternative exercise
  - UI: Inline alternative pill in LoggedSetRow and Quick Add alternative input. Hooks: `useCreateLoggedSet` with alternative object; `useLoggedSetsByExercise` uses multiEntry indexes.
- US-009 Edit a logged set
  - UI: EditSetModal. Hooks: `useUpdateLoggedSet`. UX: optimistic update + aggregate invalidation.
- US-010 Delete a logged set
  - UI: Delete action → confirm → UndoSnackbar. Hooks: `useDeleteLoggedSet` (moves to `undo_trash`), `useRestoreFromTrash`.
- US-011 View session history
  - UI: Session Detail list. Hooks: `useLoggedSetsBySession`.
- US-012 Quick log reuse last set
  - UI: Quick Log prefill. Hooks: `useGetLastSetForExercise`.
- US-013 View statistics dashboard
  - UI: Dashboard. Hooks: `useComputeVolume`, `useComputePR`.
- US-014 Dashboard filters
  - UI: FilterBar with debounced inputs. Hooks: compute hooks; filters passed as params.
- US-015 PR calculation
  - UI: PRTable on Dashboard. Hooks: `useComputePR`.
- US-016 Aggregate volume
  - UI: VolumeBar/TrendChart. Hooks: `useComputeVolume`.
- US-017 Edit/delete sessions
  - UI: Session edit/delete in Sessions view. Hooks: `useUpdateSession`, `useDeleteSession` (transactional delete of loggedSets).
- US-018/019 Export/import
  - UI: Settings → Export/Import (deferred). Hooks: (future) export util reading stores.
- US-020 Local access control (deferred)
  - UI: Settings → toggle local access control. Hook: `useSettings`.
- US-021 App settings
  - UI: Settings form. Hooks: `useSettings`, `useUpdateSetting`.
- US-022 Alternatives handling
  - UI: Include Alternatives toggle on Dashboard; alternative pill in set rows. Hooks: `useLoggedSetsByExercise` with `includeAlternatives` param and `useComputeVolume`.
- US-023 Undo last delete
  - UI: UndoSnackbar and RecentDeletesList. Hooks: `useUndoTrash`, `useRestoreFromTrash`.
- US-024 Offline reliability
  - UI: All CRUD use hooks reading/writing IndexedDB directly; `useDbInit` shows DB state if migration blocks usage.
- US-025 Accessibility
  - UI: accessible components; hooks surface error codes for aria-live regions.

## 10. Potential User Pain Points & Mitigations

- Slow dashboard aggregations on large datasets:
  - Mitigation: streaming aggregators, show progressive results, allow shorter presets (7/30/90d) and serverless pagination.
- Losing optimistic updates due to transaction failures:
  - Mitigation: clear rollback UX, Retry action in snackbar, and transient retry queue with exponential backoff.
- Confusing undo or accidental deletes:
  - Mitigation: move deletes to `undo_trash`, show prominent UndoSnackbar (~8s default) and RecentDeletes in Settings to restore.
- Conflicting edits across tabs:
  - Mitigation: last-write-wins, warn on stale edit if updatedAt mismatch, and use short-lived locks in UI where appropriate (visual "editing" indicator).
- Migration blocking usage:
  - Mitigation: show non-blocking migration progress, disable only destructive ops, surface estimated time and allow export/backup before heavy migration.

---

This document maps the PRD and IndexedDB hooks plan into a cohesive UI architecture focused on local-first reliability, fast optimistic interactions, accessibility, and extensible data hooks. Implement UI components to call the listed hooks and follow the caching/invalidation patterns to keep UI and DB consistent.
