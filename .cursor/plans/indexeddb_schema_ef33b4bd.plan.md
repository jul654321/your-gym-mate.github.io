---
name: IndexedDB Schema
overview: IndexedDB schema for Your Gym Mate PWA (local-only), optimized for fast logging, read-heavy dashboard queries, and easy migrations.
todos:
  - id: draft-schema
    content: Create the IndexedDB schema plan (draft) [in_progress]
    status: pending
  - id: review-with-dev
    content: Review schema with developer; confirm fields and migration windows [pending]
    status: pending
isProject: false
---

# IndexedDB Schema — Your Gym Mate

1. List of object stores

- `exercises`
  - keyPath: `id` (string UUID)
  - autoIncrement: false
  - TypeScript interface:

```typescript
interface Exercise {
  id: string; // uuid
  name: string;
  category?: string; // e.g., "Push", "Pull", "Legs"
  equipment?: string[]; // e.g., ["Barbell", "Machine"]
  notes?: string;
  createdAt: number; // epoch ms
  updatedAt?: number;
}
```

- Indexes:
  - `{ name: "name", keyPath: "name", unique: false, multiEntry: false }`
  - `{ name: "category", keyPath: "category", unique: false, multiEntry: false }`
  - `{ name: "equipment", keyPath: "equipment", unique: false, multiEntry: true }` (multiEntry for array)
- `plans`
  - keyPath: `id` (string UUID)
  - autoIncrement: false
  - Data structure: plan embeds ordered planExercises and keeps denormalized list of exerciseIds for fast lookup.

```typescript
interface PlanExercise {
  id: string; // uuid for planExercise row
  exerciseId: string;
  nameSnapshot?: string; // denormalized exercise name to render quickly
  defaultSets?: number;
  defaultReps?: number;
  defaultWeight?: number; // numeric
  optionalAlternativeExerciseId?: string | null;
  notes?: string;
}

interface Plan {
  id: string;
  name: string;
  createdAt: number;
  updatedAt?: number;
  planExercises: PlanExercise[]; // ordered
  exerciseIds: string[]; // denormalized from planExercises for multiEntry indexing
  weekday?: number | null; // optional scheduled weekday metadata (0=Sunday..6=Saturday)
  workoutType?: "Cardio" | "HighIntensity" | "Strength" | null; // optional classification for filtering/recommendations
  notes?: string;
}
```

- Indexes:
  - `{ name: "name", keyPath: "name", unique: false }`
  - `{ name: "exerciseIds", keyPath: "exerciseIds", unique: false, multiEntry: true }` (find plans that contain a given exercise)
- Migration notes:
  - `v2`: bump DB version and backfill `weekday = null` for existing plans so records remain compatible while giving the UI an optional day-of-week tag.
  - `v3`: add `workoutType` metadata (Cardio | HighIntensity | Strength) and backfill existing plans with `workoutType = null` so the field can be used without breaking older records.
- `sessions`
  - keyPath: `id` (string UUID)
  - autoIncrement: false
  - Stores meta about a session; logged sets are stored in `loggedSets` store.

```typescript
type SessionStatus = "active" | "completed";

interface Session {
  id: string;
  name?: string;
  date: number; // session start epoch ms
  sourcePlanId?: string | null; // plan instantiated from, if any
  exerciseOrder?: string[]; // ordered exerciseIds for UI
  status: SessionStatus;
  createdAt: number;
  updatedAt?: number;
}
```

- Indexes:
  - `{ name: "date", keyPath: "date", unique: false }`
  - `{ name: "status", keyPath: "status", unique: false }`
  - `{ name: "sourcePlanId", keyPath: "sourcePlanId", unique: false }`
  - `{ name: "status_date", keyPath: ["status","date"], unique: false }` (compound for filtered lists)
- `loggedSets`
  - keyPath: `id` (string UUID)
  - autoIncrement: false
  - This is the central, query-heavy store. Each logged set stores a small denormalized snapshot of its exercise and includes an `exerciseIds` array that contains the primary exerciseId and (if present) alternative.exerciseId — enabling inclusion/exclusion queries.

```typescript
interface AlternativeSnapshot {
  exerciseId: string;
  nameSnapshot?: string;
  weight?: number;
  reps?: number;
}

interface LoggedSet {
  id: string;
  sessionId: string; // FK to sessions.id
  exerciseId: string; // primary exercise
  exerciseNameSnapshot?: string; // denormalized name for fast UI
  timestamp: number; // epoch ms
  weight: number; // numeric weight value
  weightUnit?: "kg" | "lb";
  reps: number;
  setIndex?: number; // order within session/exercise
  alternative?: AlternativeSnapshot | null; // optional embedded object
  notes?: string;
  createdAt: number;
  updatedAt?: number;
  // helper denormalized array to make queries that include/exclude alternatives simple
  exerciseIds: string[]; // [exerciseId, alternative?.exerciseId?]
}
```

- Indexes:
  - `{ name: "sessionId", keyPath: "sessionId", unique: false }` (quickly fetch all sets for a session)
  - `{ name: "exerciseId", keyPath: "exerciseId", unique: false }` (primary exercise queries)
  - `{ name: "exerciseIds", keyPath: "exerciseIds", unique: false, multiEntry: true }` (multiEntry so queries for an exercise return sets where that exercise is primary or alternative)
  - `{ name: "timestamp", keyPath: "timestamp", unique: false }` (time-range queries)
  - `{ name: "exerciseId_timestamp", keyPath: ["exerciseId","timestamp"], unique: false }` (compound for exercise time-range scans)
  - `{ name: "exerciseId_weight", keyPath: ["exerciseId","weight"], unique: false }` (compound to scan weights per exercise for PR via reverse cursor)
- `settings` (key-value store)
  - keyPath: `key` (string)
  - autoIncrement: false

```typescript
interface SettingEntry {
  key: string; // e.g., 'units', 'lastOpenedSessionId'
  value: any;
  updatedAt: number;
}
```

- Indexes:
  - `{ name: "key", keyPath: "key", unique: true }`
- `events` (local usage telemetry / minimal)
  - keyPath: `id` (string UUID)
  - autoIncrement: false

```typescript
interface EventRecord {
  id: string;
  type: string; // e.g., 'time-to-log', 'session-start'
  timestamp: number;
  payload?: Record<string, any>;
}
```

- Indexes:
  - `{ name: "type", keyPath: "type", unique: false }`
  - `{ name: "timestamp", keyPath: "timestamp", unique: false }`
- `undo_trash` (short-term deletions for undo)
  - keyPath: `id` (string UUID)
  - autoIncrement: false

```typescript
interface TrashRecord {
  id: string; // matches deleted object's id + storeName for uniqueness or generated uuid
  storeName: string; // e.g., 'loggedSets', 'sessions'
  deletedAt: number;
  expiresAt: number; // deletedAt + undoWindowMs
  payload: any; // full original object for restore
}
```

- Indexes:
  - `{ name: "expiresAt", keyPath: "expiresAt", unique: false }`

1. Relationships between object stores

- Exercises → Plans: Plans embed `planExercises` (ordered) which reference `exerciseId`. Plans also keep `exerciseIds` (array) for fast lookups.
- Plans → Sessions: `sessions.sourcePlanId` is a nullable FK to `plans.id`. Deleting a plan DOES NOT delete sessions (PRD US-003 requirement). Sessions remain referencing historical `sourcePlanId`.
- Sessions → LoggedSets: `loggedSets.sessionId` points to a session. Logged sets are stored separately so queries/aggregations across sessions/exercises are efficient.
- LoggedSet → Exercise: `loggedSets.exerciseId` points to `exercises.id`. Each logged set also stores `exerciseNameSnapshot` and `exerciseIds` (including alternative) to avoid additional lookups when rendering and to support aggregates that optionally include alternatives.
- Alternatives: Embedded in `loggedSets.alternative` with its own `exerciseId`. For inclusion in exercise-level aggregates, `loggedSets.exerciseIds` contains both primary and alternative IDs; use multiEntry index to include/exclude alternative sets.

1. Data access patterns and query strategies

- Open or create DB with versioned upgrade callback.
- Common queries and recommended indexes:
  - List all plans: open a cursor on `plans` store; use `name` index for search/filtering.
  - Create session from plan: read plan by `id`, copy `planExercises` into session `exerciseOrder` and create session record.
  - Fetch session + sets (session view):
    1. Get `sessions` by `id` (primary key).
    2. Query `loggedSets` by `sessionId` index to fetch all sets for the session (ordered client-side by `setIndex` or `timestamp`).
  - Quick add set for active session: write new `LoggedSet` to `loggedSets` store. Pre-fill weight/reps from last set for that exercise:
    - Query `loggedSets` by `exerciseId` index with descending `timestamp` (or compound `exerciseId_timestamp` cursor reverse) and pick first result.
  - Dashboard: Exercise-level aggregates and PRs:
    - To compute PR (max weight) for a given exercise: open `exerciseId_weight` index and iterate cursor in reverse (descending weight) until hitting a set that satisfies inclusion filters (date range, reps filter). The first match is the PR.
    - To compute volume in a date range: query `exerciseId_timestamp` compound index with range for [exerciseId, fromTimestamp] to [exerciseId, toTimestamp] or query `timestamp` index and filter `exerciseId` via `exerciseIds` multiEntry index for inclusion of alternatives.
    - Multi-exercise filters: use `exerciseIds` multiEntry index with a filter for each selected exercise, union results client-side.
  - Undo delete: move deleted object into `undo_trash` with expiresAt = now + undoWindowMs (e.g., 8s). If user taps Undo, restore payload into its store and remove trash record. Otherwise, scheduled cleanup removes expired trash items.

1. Migration/versioning strategy

- Versioning approach:
  - Use a numeric DB version (start at 1). Each schema change increments the version and implements an `onupgradeneeded` migration that:
    1. Creates new object stores and indexes if missing.
    2. For small/compatible changes, migrates existing objects in-place (e.g., add `exerciseIds` arrays to existing plans/loggedSets by scanning and populating) within a limited time-sliced loop to avoid blocking the UI.
    3. For complex changes, write a background migration that copies data to new store keys and replaces older store after migration completes; show migration progress in UI if the operation is expected to take > 1s.
  - Migration metadata: store a lightweight `meta` entry in `settings` or a dedicated `meta` store with `dbVersionAppliedAt` timestamp and migration notes.
- Practical migration examples:
  - V1 → V2: Add `exerciseIds` multiEntry arrays to existing `plans` and `loggedSets` — iterate records and set `exerciseIds = [exerciseId, alternative?.exerciseId]
  - V2 → V3: Add `events` store — create store and add indexes; no per-record migration needed.
- Best practices:
  - Keep migrations idempotent and resumable.
  - Avoid blocking long migrations on main thread: break large scans into batches (e.g., 100–500 records) using requestIdleCallback or setTimeout slices.
  - Provide a safe rollback / backup export option before big migrations (prompt the user if migration expected to run long).

1. Additional notes and design decisions

- Keys & IDs: use client-generated UUIDv4 strings for all primary keys. Avoid relying on autoIncrement to make imports/exports predictable and easier to merge during future sync features.
- Denormalization tradeoffs: store minimal snapshots (e.g., `exerciseNameSnapshot`, `exerciseIds` arrays) in `loggedSets` to make reads fast and reduce cross-store lookups required for rendering and aggregation. Keep authoritative data in `exercises` and `plans` for edits; edits to `exercises` do not retroactively change historical `exerciseNameSnapshot` (preserve historical accuracy).
- MultiEntry indexes: `exerciseIds` multiEntry on `loggedSets` is the primary mechanism to implement the PRD requirement that alternatives can be optionally included in aggregates. The UI toggles which sets to include by querying `exerciseIds` (includes alt) or `exerciseId` (primary only).
- PR calculation: defined in PRD as max weight for a given exercise. Use `exerciseId_weight` index and reverse cursor for efficient PR lookup. If later adding rep-adjusted PRs, add additional indexes or keep computed values in a derived store for performance.
- Storage limits: IndexedDB provides generous local capacity; avoid storing large binary blobs. Keep notes as short strings. For CSV export/import, transform data from objects and rely on client file APIs.
- Libraries: recommended to use `idb` (a minimal promise wrapper) for developer ergonomics, but schema design is API-agnostic and works with native IndexedDB.
- Testing & verification: include smoke tests for create/read/update/delete across `plans`, `sessions`, and `loggedSets`. Verify aggregates computed from raw `loggedSets` match expected values.

---

If you want this saved as `.ai/db-plan.md` now, confirm and I will write it to that file.
