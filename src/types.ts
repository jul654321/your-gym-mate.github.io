// src/types.ts
// Type definitions for Your Gym Mate - DTOs and Command Models
// These types mirror the IndexedDB object store schemas described in
// .cursor/plans/indexeddb_schema_ef33b4bd.plan.md and the hook contracts
// in .cursor/plans/indexeddb_react_hooks_plan_80ebb75f.plan.md

// --- Core aliases ---
export type UUID = string; // client-generated UUIDv4
export type EpochMs = number;

// Shared utility types
export type Pagination = {
  page?: number;
  pageSize?: number;
  // cursor-based pagination token (store primary key or index key)
  cursor?: string | null;
};

// === Exercises ===
// Mirrors `exercises` object store schema.
export interface ExerciseDTO {
  id: UUID; // primary key (uuid)
  name: string;
  category?: string; // e.g., "Push", "Pull", "Legs"
  equipment?: string[]; // multiEntry index target
  notes?: string;
  guideLinks?: PlanExerciseGuideLinkDTO[];
  createdAt: EpochMs;
  updatedAt?: EpochMs;
}

// Commands / payloads for exercise hooks
// Create requires client-generated id per schema validation.
export type CreateExerciseCmd = ExerciseDTO;
export type UpdateExerciseCmd = { id: UUID } & Partial<
  Omit<ExerciseDTO, "id" | "createdAt">
>;
export type DeleteExerciseCmd = { id: UUID };

// === Plans & PlanExercises ===
// Mirrors `plans` store schema and embedded `planExercises`.
export interface PlanExerciseGuideLinkDTO {
  id: UUID; // uuid for the link
  title: string; // short human-friendly title
  url: string; // validated http(s) URL
}

export interface PlanExerciseDTO {
  id: UUID; // uuid for planExercise row
  exerciseId: UUID;
  nameSnapshot?: string; // denormalized snapshot for rendering
  defaultSets?: number;
  defaultReps?: number;
  defaultWeight?: number;
  optionalAlternativeExerciseId?: UUID | null;
  alternativeDefaults?: PlanExerciseAlternativeDefaultsDTO;
  notes?: string;
  guideLinks?: PlanExerciseGuideLinkDTO[];
}

export interface PlanExerciseAlternativeDefaultsDTO {
  sets?: number;
  reps?: number;
  weight?: number;
  notes?: string;
}

export type WorkoutType = "Cardio" | "HighIntensity" | "Strength" | "Mobility";

export interface PlanDTO {
  id: UUID;
  name: string;
  createdAt: EpochMs;
  updatedAt?: EpochMs;
  // ordered list of PlanExercise rows (UI order must be preserved)
  planExercises: PlanExerciseDTO[];
  // denormalized array used for multiEntry index (always derived from planExercises)
  exerciseIds: UUID[];
  weekday?: number | null;
  workoutType?: WorkoutType | null;
  notes?: string;
}

// Plan commands: creation must ensure exerciseIds = planExercises.map(pe => pe.exerciseId)
export type CreatePlanCmd = PlanDTO;
export type UpdatePlanCmd = { id: UUID } & Partial<
  Omit<PlanDTO, "id" | "createdAt">
>;
export type DeletePlanCmd = { id: UUID };

// Instantiate session from plan
export type InstantiateSessionFromPlanCmd = {
  id: UUID; // session id to create
  planId: UUID; // source plan
  overrides?: {
    name?: string;
    date?: EpochMs;
  };
  // createdAt timestamp for the created session
  createdAt?: EpochMs;
};

// === Sessions ===
// Mirrors `sessions` store schema.
export type SessionStatus = "active" | "completed";

export interface SessionDTO {
  id: UUID;
  name?: string;
  date: EpochMs; // session start epoch ms
  sourcePlanId?: UUID | null;
  workoutType?: WorkoutType | null;
  // ordered exerciseIds for UI
  exerciseOrder?: UUID[];
  status: SessionStatus;
  createdAt: EpochMs;
  updatedAt?: EpochMs;
}

export type SessionListStatus = "all" | SessionStatus;

export interface SessionListQueryParams {
  status?: SessionListStatus;
  from?: string;
  to?: string;
  q?: string;
  pageSize?: number;
  cursor?: string;
}

export interface SessionSummaryVM {
  id: UUID;
  name?: string;
  date: EpochMs;
  status: SessionStatus;
  setCount: number;
  volume: number;
  sourcePlanId?: UUID | null;
}

// Session commands
export type CreateSessionCmd = SessionDTO;
export type UpdateSessionCmd = { id: UUID } & Partial<
  Omit<SessionDTO, "id" | "createdAt">
>;
export type DeleteSessionCmd = { id: UUID };
// Set session status command used by useSetSessionStatus
export type SetSessionStatusCmd = { sessionId: UUID; status: SessionStatus };

// === Logged Sets ===
// Mirrors `loggedSets` store schema and its denormalized fields.
export interface AlternativeSnapshotDTO {
  exerciseId: UUID;
  nameSnapshot?: string;
  weight?: number;
  reps?: number;
}

export type WeightUnit = "kg" | "lb";

export type LoggedSetStatus = "pending" | "completed" | "skipped";

export interface LoggedSetDTO {
  id: UUID;
  sessionId: UUID; // FK to sessions.id
  exerciseId: UUID; // primary exercise id
  exerciseNameSnapshot?: string; // denormalized name for fast UI
  status?: LoggedSetStatus;
  timestamp: EpochMs; // epoch ms
  weight: number;
  weightUnit?: WeightUnit;
  reps: number;
  setType: SetType;
  setIndex?: number; // order within session/exercise
  orderIndex?: number;
  alternative?: AlternativeSnapshotDTO | null;
  notes?: string;
  createdAt: EpochMs;
  updatedAt?: EpochMs;
  // helper denormalized array for multiEntry queries: [exerciseId, alternative?.exerciseId?]
  exerciseIds: UUID[];
}

// LoggedSet commands: creation must include required fields and populate exerciseIds
export type CreateLoggedSetCmd = LoggedSetDTO & {
  status: Exclude<LoggedSetStatus, "skipped">;
};
export type UpdateLoggedSetCmd = { id: UUID } & Partial<
  Omit<LoggedSetDTO, "id" | "createdAt">
>;
export type DeleteLoggedSetCmd = { id: UUID };

export type SetType = "warmup" | "main" | "drop" | "drop set" | "accessory";

// Quick add command (optimistic quick-add flow). Caller typically pre-fills id, createdAt,
// timestamp, and weight/reps; hooks may use useGetLastSetForExercise to prepopulate.
export type QuickAddSetCmd = {
  id: UUID;
  setType: SetType;
  sessionId: UUID;
  exerciseId: UUID;
  timestamp: EpochMs;
  weight: number;
  weightUnit?: WeightUnit;
  reps: number;
  setIndex?: number;
  alternative?: AlternativeSnapshotDTO | null;
  notes?: string;
  createdAt: EpochMs;
  // If optimistic, UI may show before DB write completes
  optimistic?: boolean;
  // denormalized array must be set before write
  exerciseIds: UUID[];
};

// === Query / Hook parameter types ===
export type ExercisesQueryParams = {
  q?: string; // text search on name (prefix)
  category?: string;
  equipment?: string[]; // filters using equipment multiEntry index
  pagination?: Pagination;
  sort?: "name" | "createdAt";
};

export type PlansQueryParams = {
  q?: string;
  exerciseId?: UUID; // filter using plans.exerciseIds multiEntry
  weekday?: number;
  workoutType?: WorkoutType | null;
  pagination?: Pagination;
  sort?: "name" | "createdAt";
};

export type SessionsQueryParams = {
  status?: SessionStatus;
  dateRange?: { from?: EpochMs; to?: EpochMs };
  sourcePlanId?: UUID;
  pagination?: Pagination;
  sort?: "date" | "createdAt";
};

export type LoggedSetsQueryParams = {
  sessionId?: UUID;
  exerciseId?: UUID;
  includeAlternatives?: boolean; // controls whether to use exerciseIds multiEntry or exerciseId index
  dateRange?: { from?: EpochMs; to?: EpochMs };
  pagination?: Pagination;
  sort?: "timestamp" | "createdAt" | "weight";
};

// === Aggregation / Compute hooks params & results ===
export type ComputePRParams = {
  exerciseId: UUID;
  from?: EpochMs;
  to?: EpochMs;
  includeAlternatives?: boolean;
};

export type ComputePRResult = {
  value: number | null; // PR (max weight) or null if none
  date?: EpochMs;
  setId?: UUID;
};

export type ComputeVolumeParams = {
  exerciseIds: UUID[]; // list of exercises to include in volume
  from?: EpochMs;
  to?: EpochMs;
  includeAlternatives?: boolean;
  // streaming flag indicates the aggregator can yield partial results over time
  streaming?: boolean;
};

export type ComputeVolumeResult = {
  totalWeightReps: number; // commonly weight * reps sum (adjust as desired)
};

// === Settings ===
// Mirrors `settings` store schema (key-value)
export interface SettingEntryDTO {
  key: string;
  value: unknown;
  updatedAt: EpochMs;
}

export type UpdateSettingCmd = {
  key: string;
  value: unknown;
  updatedAt?: EpochMs;
};

export interface ExerciseDefaultDTO {
  weight: number;
  reps: number;
  weightUnit?: WeightUnit;
  alternative?: AlternativeSnapshotDTO | null;
}

export type ExerciseDefaultsDTO = Record<UUID, ExerciseDefaultDTO>;

// === Events ===
// Mirrors `events` store schema
export interface EventRecordDTO {
  id: UUID;
  type: string; // e.g., 'time-to-log', 'session-start'
  timestamp: EpochMs;
  payload?: Record<string, unknown>;
}
export type LogEventCmd = EventRecordDTO;

// === Undo / Trash ===
// Mirrors `undo_trash` store schema; payload is the original object taken from other stores.
// When restoring, hooks should perform a transaction that writes payload back to its store and deletes the trash row.
export interface TrashRecordDTO {
  id: UUID; // unique id for trash entry (can be originalId + storeName or new uuid)
  storeName: string; // e.g., 'loggedSets', 'sessions'
  deletedAt: EpochMs;
  expiresAt: EpochMs; // deletedAt + undoWindowMs
  payload: unknown; // original object to restore
}
export type RestoreFromTrashCmd = { trashId: UUID };

// === Dashboard Analytics Types ===
// Dashboard filter and view model types for US-013, US-014, US-015, US-016

export type DatePreset = "7d" | "30d" | "90d" | "all" | "custom";

export interface DashboardFilters {
  exerciseIds: UUID[]; // selected exercise ids (empty = all)
  includeAlternatives: boolean; // default true
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
  preset?: DatePreset;
  minWeight?: number;
  maxWeight?: number;
  minReps?: number;
  maxReps?: number;
}

export interface TrendPoint {
  date: string; // ISO date
  weight?: number; // aggregated (max or avg)
  volume?: number; // aggregated sum(weight*reps)
  reps?: number; // aggregated sum(reps)
}

export interface VolumePoint {
  sessionId: UUID;
  date: string; // ISO date
  volume: number;
}

export interface PRItem {
  exerciseId: UUID;
  exerciseName: string;
  weight: number;
  dateAchieved: string; // ISO date
  setId: UUID;
  isAlternative?: boolean;
}

export interface TotalsViewModel {
  totalVolume: number;
  totalSessions: number;
  avgSessionVolume: number;
}

export interface DashboardViewModel {
  trendPoints: TrendPoint[];
  volumePoints: VolumePoint[];
  prItems: PRItem[];
  totals: TotalsViewModel;
}

// === Validation / Utility Notes ===
// - All Create*Cmd types expect client-generated `id: UUID` and `createdAt: EpochMs` per schema validation rules.
// - Writes must ensure denormalized arrays are populated:
//     - Plan.create/update: plan.exerciseIds = plan.planExercises.map(p => p.exerciseId)
//     - LoggedSet.create: loggedSet.exerciseIds = [loggedSet.exerciseId, loggedSet.alternative?.exerciseId].filter(Boolean)
// - Hooks should validate numeric constraints before writing (weight numeric, reps >= 0, timestamps present).
// - Query parameter types align with IndexedDB indexes so hooks can map params -> index queries efficiently.
