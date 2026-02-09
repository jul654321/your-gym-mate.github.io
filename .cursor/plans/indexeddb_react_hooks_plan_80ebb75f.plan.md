---
name: IndexedDB React Hooks Plan
overview: React Hooks design for IndexedDB integration in Your Gym Mate PWA. Hooks map to object stores and PRD flows (plans, sessions, loggedSets, dashboard) and include initialization, migrations, transactions, validation, caching and offline considerations.
todos:
  - id: db-init
    content: Implement useDbInit and migration framework
    status: pending
  - id: core-hooks
    content: "Implement hooks: useExercises, usePlans, useSessions, useLoggedSets with tests"
    status: pending
  - id: dashboard-hooks
    content: "Implement compute hooks: useComputePR, useComputeVolume, and streaming aggregators"
    status: pending
isProject: false
---

# React Hooks for IndexedDB Plan

## 1. Object Stores Overview

- `exercises` — canonical exercise definitions. KeyPath: `id` (string UUID), autoIncrement: false. Indexes: `name`, `category`, `equipment` (multiEntry).
- `plans` — user-created workout plans. KeyPath: `id` (string UUID), autoIncrement: false. Contains `planExercises[]` (ordered) and denormalized `exerciseIds[]` for multiEntry indexing. Indexes: `name`, `exerciseIds` (multiEntry).
- `sessions` — instantiated sessions (from plan or ad-hoc). KeyPath: `id` (string UUID). Indexes: `date`, `status`, `sourcePlanId`, compound `status_date` (['status','date']).
- `loggedSets` — central, query-heavy store storing per-set rows and denormalized snapshots. KeyPath: `id` (string UUID). Indexes: `sessionId`, `exerciseId`, `exerciseIds` (multiEntry), `timestamp`, compound `exerciseId_timestamp`, compound `exerciseId_weight`.
- `settings` — key-value store for small prefs. KeyPath: `key`. Indexes: `key` (unique).
- `events` — local telemetry. KeyPath: `id`. Indexes: `type`, `timestamp`.
- `undo_trash` — short-term deleted objects for undo. KeyPath: `id`. Indexes: `expiresAt`.

Notes on indexes and queries:

- Use `exerciseIds` multiEntry on `loggedSets` and `plans` to include alternative.exerciseId in aggregates.
- Use `exerciseId_weight` reverse cursor to compute PRs efficiently.
- All primary keys are client-generated UUID strings (no autoIncrement).

## 2. Database Initialization

- Hook: `useDbInit` / `useIndexedDb`
  - Responsibilities: open/create DB, expose `db` wrapper (idb-compatible promises), register `onupgradeneeded` migrations, provide `ready` state and `error`.
  - API: `{ db: IDBDatabase|null, ready: boolean, version: number, upgrading: boolean, error: Error|null }`.
  - Migration strategy: implement per-version migration functions; small changes run in `onupgradeneeded` (in-place) with batched scans; heavy migrations spawn background worker-like batched loops via requestIdleCallback / setTimeout and update migration progress in `settings.meta`.
  - Expose helpers: `withTransaction(storeNames, mode, callback)` to run operations inside transactions and auto-retry on transient errors.

## 3. Custom Hooks

For each object store provide read/write/business logic hooks. All hooks assume `useDbInit` provides an idb-style API (promise wrappers) and that interactions use transactions for multi-store ops. Hooks return `{ data, loading, error, refetch }` for reads and `{ mutate, loading, error, data }` for writes. Mutations accept an optional `optimistic` flag and `onSuccess`/`onError` callbacks.

### useExercises

#### Read Operations

- Hook name: `useExercises({ filter?, q?, page?, pageSize?, sort? })`
- Parameters: optional `q` (text search for `name`), `category`, `equipment` array, pagination, sort by `name` or `createdAt`.
- Return value: `{ data: Exercise[], loading, error, refetch }`.
- IndexedDB ops: query `name` index for search (prefix match) or open store cursor for broader filters; filter `equipment` via `equipment` multiEntry index.

#### Write Operations

- Hook names: `useCreateExercise()`, `useUpdateExercise()`, `useDeleteExercise()`
- Parameters: exercise object or id.
- Return: `{ mutate, loading, error, data }`.
- Optimistic updates: update local cache (context or react-query) immediately; persist to DB; on failure rollback cache change and surface error.
- Validation: `id` required (uuid), `name` non-empty, `createdAt` epoch ms; `equipment` if present must be string[].

#### Business Logic Hooks

- `useSearchExercises(q)` — debounced text search using `name` index and client-side fuzzy matching.

### usePlans

#### Read Operations

- Hook: `usePlans({ q?, exerciseId?, weekday?, workoutType?, page?, pageSize?, sort? })`
- Parameters:
  - optional `weekday` (0=Sunday..6=Saturday) to filter plans that target a specific day. Since the Plan store is lightweight, the hook can fetch all matching plans (optionally using `name` index for sorting) and apply the weekday filter client-side or via an index if one is added later.
  - optional `workoutType` (Cardio, HighIntensity, Strength) so consumers can filter by the plan's training classification; like `weekday`, this can be applied after fetching thanks to the small data set.
- IndexedDB ops: query `exerciseIds` (multiEntry) when filtering by exercise; otherwise open cursor on `name` index.

#### Write Operations

- Hooks: `useCreatePlan()`, `useUpdatePlan()`, `useDeletePlan()`
- Special behavior: on create/update, ensure `exerciseIds` is populated from `planExercises` (`exerciseIds = planExercises.map(p=>p.exerciseId)`); enforce ordered `planExercises`.
- Validation: plan `name` non-empty; each `PlanExercise.exerciseId` required; `defaultSets/reps/weight` numeric where applicable.
- Delete: per PRD US-003, deletion must NOT cascade to sessions. Implement delete that removes plan but leaves sessions intact.

#### Business Logic Hooks

- `useInstantiateSessionFromPlan()`
  - Parameters: `planId`, optional overrides (name, date)
  - Return: `{ createSessionFromPlan(planId, opts), loading, error }`
  - Implementation: read plan by id, build session object with `exerciseOrder = plan.planExercises.map(pe => pe.exerciseId)`, copy the plan's `workoutType`, and create session record. Use a transaction on `sessions` (single store). No cascade writes needed.

### useSessions

#### Read Operations

- `useSessions({ status?, dateRange?, sourcePlanId?, page?, pageSize?, sort? })`
- IndexedDB ops: `status`, `date`, `status_date` compound index to fetch filtered/sorted lists.

#### Write Operations

- Hooks: `useCreateSession()`, `useUpdateSession()`, `useDeleteSession()`
- Deleting a session: transactional delete that also deletes associated `loggedSets` (PRD US-017 says deleting a session removes its logged sets). Implement transaction across `sessions` and `loggedSets`. For undo, move deleted session and its sets into `undo_trash` atomically.
- Validation: `status` must be "active" or "completed"; `date` epoch ms.

#### Business Logic Hooks

- `useSetSessionStatus(sessionId, status)` — transitions and emits event record (in `events`) for telemetry.

### useLoggedSets

#### Read Operations

- `useLoggedSets({ sessionId?, exerciseId?, includeAlternatives=true, dateRange?, page?, pageSize?, sort? })`
- Hook(s): `useLoggedSetsBySession(sessionId)`, `useLoggedSetsByExercise(exerciseId, {from,to,includeAlternatives})`
- Return: `{ data: LoggedSet[], loading, error, refetch }`.
- IndexedDB ops: use `sessionId` index to fetch session sets; use `exerciseIds` multiEntry for inclusion of alternatives; use `exerciseId_timestamp` or `timestamp` index for time-range scans; use `exerciseId_weight` reverse cursor for PR.
- Pagination: use cursor with limit/offset emulation — store last key to resume.

#### Write Operations

- Hooks: `useCreateLoggedSet()`, `useUpdateLoggedSet()`, `useDeleteLoggedSet()`
- Quick Add (optimistic): `useQuickAddSet()` that pre-fills weight/reps using `useLastSetForExercise(exerciseId)` (query `exerciseId_timestamp` reverse and take first). It then writes a `LoggedSet` record and returns optimistic cache update.
- Delete semantics: on delete, place deleted object into `undo_trash` with `expiresAt = now + undoWindowMs` (5–10s) and schedule cleanup.
- Validation: `sessionId` required and must reference existing session (if session missing, reject); `exerciseId` required; `timestamp`, `createdAt` required; `weight` numeric; `reps` integer >=0; `exerciseIds` must include `exerciseId` and alternative.exerciseId if present.

#### Business Logic Hooks

- `useGetLastSetForExercise(exerciseId)` — returns most recent `LoggedSet` for exercise via reverse `exerciseId_timestamp` cursor.
- `useComputePR(exerciseId, { from?, to?, includeAlternatives=true })` — use reverse cursor on `exerciseId_weight` and earliest match respecting filters; return `{ value, date, setId }`.
- `useComputeVolume({ exerciseIds[], from, to, includeAlternatives })` — range scan on `exerciseId_timestamp` or `timestamp` + filter via `exerciseIds` multiEntry and sum weightreps. Implement streaming aggregation to avoid loading large arrays.

### useSettings

- CRUD hooks for small settings: `useSetting(key)` and `useUpdateSetting(key, value)` returning `{ value, loading, error, set }`.
- IndexedDB ops: simple get/put on `settings` store.

### useEvents

- `useLogEvent(type, payload)` — append event record to `events` store. Keep operations fire-and-forget but surface errors to developer console.

### useUndoTrash

- `useUndoTrash()` — read current trash items; scheduled cleanup process uses index `expiresAt` to remove expired items.
- `useRestoreFromTrash(trashId)` — restores payload into target store inside transaction and deletes trash record.

## 4. Error Handling Strategy

- Centralize error mapping in a `dbErrorToUserMessage(err)` util. Surface friendly messages for: quota errors, transaction aborts, constraint/validation failures, and upgrade/migration failures.
- Each hook exposes `error` and optionally `errorCode`. For mutations, provide `onError` callbacks and automatic rollback of optimistic updates.
- Retries: transient failures (e.g., blocked transaction) should retry with exponential backoff a small number of times; migrations are idempotent and report progress.

## 5. State Management Integration

- Cache layer: use React Context or a caching library (React Query) to store lists and single entities. Recommend React Query (tanstack) for ease of invalidation, optimistic updates and background refetching. If using pure React, provide a `DbProvider` with in-memory cache + subscription API.
- Cache keys: `['exercises']`, `['plans']`, `['sessions', params]`, `['loggedSets', sessionId]`, `['loggedSets', 'exercise', exerciseId, filters]`.
- Invalidation rules: on create/update/delete of an entity, invalidate dependent queries: e.g., creating `loggedSet` invalidates `['loggedSets','session',sessionId]`, `['loggedSets','exercise',exerciseId]`, and aggregates cache for exercises involved.
- Optimistic updates: apply to UI store/cache first, persist to DB; rollback on failure. Ensure serverless single-user app means conflicts are local only; last-write-wins for concurrent edits in UI.

## 6. Validation and Business Logic

- Validation rules (compiled from schema):
  - All primary IDs: UUID string required.
  - `createdAt`/`updatedAt`/`timestamp` numeric epoch ms.
  - `weight` numeric; `reps` non-negative integer.
  - `session.status` in {"active","completed"}.
  - `plans.planExercises` ordered array; maintain `exerciseIds` denormalized array.
  - `loggedSets.exerciseIds` must include `exerciseId` and alternative.exerciseId when present.
- Implement client-side validators used by mutate hooks before DB writes; return structured validation errors for UI.
- Enforce PRD business logic: when instantiating sessions, copy denormalized snapshots (nameSnapshot) to preserve historical data.

## 7. Performance Considerations

- Query by indexes: always prefer index queries to full-store scans. `exerciseId_weight` and `exerciseId_timestamp` compound indexes are primary tools for PR and range scans.
- PR computation: reverse cursor on `exerciseId_weight` until first matching filter; stop early.
- Aggregations: stream via cursor to accumulate results rather than loading all matches into memory.
- Pagination: implement cursor-based pagination; store lastPrimaryKey/offset token in cache for next page.
- Batch writes: for bulk migrations or imports, write in chunks and yield to event loop using setTimeout/requestIdleCallback.
- Debounce search and filter inputs (150–300ms) to reduce DB queries.

## 8. Offline Support & Sync

- Offline behavior: all hooks read/write directly to IndexedDB; queue UI actions only if you plan background sync later. For MVP, no server sync required.
- Undo: implement short-window undo via `undo_trash` store and delayed permanent delete.
- Future sync extensibility: design `withTransaction` and model shape to support adding `pendingSync` flag on records and a `sync` hook to push changes to server when available.

## 9. Transactions & Cross-Store Operations

- Provide `useTransaction` helper or `db.withTransaction(['sessions','loggedSets','undo_trash'], 'readwrite', async (tx) => {...})`.
- Use transactions for:
  - Deleting a session and its loggedSets + moving payloads to `undo_trash`.
  - Restoring from `undo_trash`.
  - Bulk migration writes.
- Transaction failure handling: rollback optimistic cache changes and show recoverable error with retry option.

## 10. Testing & Verification

- Unit tests / smoke tests for: create/read/update/delete for `plans`, `sessions`, `loggedSets` and verification that aggregates (PR, volume) match expected results.
- Integration tests for migrations (small dataset) and undo flow.

## Assumptions & Open Questions

- Assume React >=17 with TypeScript and ability to use `idb` wrapper or `indexedDB` directly. (Tech stack lists React + TypeScript and suggests `idb`.)
- For caching, recommend React Query but design hooks to be agnostic.
- Undo window defaults to 8s (schema suggests 8s example); expose setting in `settings` to tune.
