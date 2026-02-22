import { CSVStreamer, type CsvColumn } from "../lib/csv/CSVStreamer";
import { getDB, STORE_NAMES } from "../lib/db";
import type {
  LoggedSetDTO,
  LoggedSetStatus,
  SessionDTO,
  SessionStatus,
  SetType,
  WeightUnit,
  WorkoutType,
} from "../types";

export interface SessionExportRow extends Record<string, unknown> {
  sessionId: string;
  sessionName: string;
  sessionDate: number;
  sessionCreatedAt: number;
  sessionUpdatedAt: number | "";
  sessionStatus: SessionStatus;
  sourcePlanId: string;
  setId: string;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  weightUnit: WeightUnit | undefined;
  reps: number;
  setType: SetType;
  timestamp: number;
  orderIndex: number | "";
  workoutType: WorkoutType | null | string;
  exerciseOrder: string;
  setStatus: LoggedSetStatus | string;
  setIndex: number | "";
  notes: string;
  alternativeExerciseId: string;
  alternativeExerciseName: string;
  alternativeWeight: number | "";
  alternativeReps: number | "";
  setCreatedAt: number;
  setUpdatedAt: number | "";
}

export interface ExportFilters {
  dateRange?: { from?: number; to?: number };
  includeAlternatives: boolean;
}

export const SESSION_EXPORT_COLUMNS: CsvColumn<SessionExportRow>[] = [
  { header: "Session ID", key: "sessionId" },
  { header: "Session name", key: "sessionName" },
  {
    header: "Session date",
    key: "sessionDate",
    formatter: (value) =>
      typeof value === "number" && !isNaN(value)
        ? new Date(value).toISOString()
        : "",
  },
  {
    header: "Session created",
    key: "sessionCreatedAt",
    formatter: (value) =>
      typeof value === "number" && !isNaN(value)
        ? new Date(value).toISOString()
        : "",
  },
  {
    header: "Session updated",
    key: "sessionUpdatedAt",
    formatter: (value) =>
      typeof value === "number" && !isNaN(value)
        ? new Date(value).toISOString()
        : "",
  },
  { header: "Session status", key: "sessionStatus" },
  { header: "Workout type", key: "workoutType" },
  {
    header: "Exercise order",
    key: "exerciseOrder",
    formatter: (value) => (typeof value === "string" ? value : ""),
  },
  { header: "Source plan ID", key: "sourcePlanId" },
  { header: "Set ID", key: "setId" },
  { header: "Exercise ID", key: "exerciseId" },
  { header: "Exercise name", key: "exerciseName" },
  { header: "Weight", key: "weight" },
  { header: "Unit", key: "weightUnit" },
  { header: "Reps", key: "reps" },
  { header: "Set type", key: "setType" },
  {
    header: "Set timestamp",
    key: "timestamp",
    formatter: (value) =>
      typeof value === "number" && !isNaN(value)
        ? new Date(value).toISOString()
        : "",
  },
  { header: "Order index", key: "orderIndex" },
  { header: "Set status", key: "setStatus" },
  { header: "Set index", key: "setIndex" },
  { header: "Notes", key: "notes" },
  { header: "Alternative exercise ID", key: "alternativeExerciseId" },
  { header: "Alternative name", key: "alternativeExerciseName" },
  { header: "Alternative weight", key: "alternativeWeight" },
  { header: "Alternative reps", key: "alternativeReps" },
  {
    header: "Set created",
    key: "setCreatedAt",
    formatter: (value) =>
      typeof value === "number" && !isNaN(value)
        ? new Date(value).toISOString()
        : "",
  },
  {
    header: "Set updated",
    key: "setUpdatedAt",
    formatter: (value) =>
      typeof value === "number" && !isNaN(value)
        ? new Date(value).toISOString()
        : "",
  },
];

async function* buildSessionExportRows({
  dateRange,
  includeAlternatives,
}: ExportFilters): AsyncGenerator<SessionExportRow> {
  const db = await getDB();
  const tx = db.transaction(
    [STORE_NAMES.sessions, STORE_NAMES.loggedSets],
    "readonly"
  );
  const sessionStore = tx.objectStore(STORE_NAMES.sessions);
  const loggedSetsStore = tx.objectStore(STORE_NAMES.loggedSets);
  const logIndex = loggedSetsStore.index("sessionId");
  let cursor = await sessionStore.openCursor();

  while (cursor) {
    const session = cursor.value;
    if (!isWithinDateRange(session.date, dateRange)) {
      cursor = await cursor.continue();
      continue;
    }

    const sets = await logIndex.getAll(session.id);

    for (const set of sets) {
      yield createRow(session, set, includeAlternatives);
    }

    cursor = await cursor.continue();
  }

  await tx.done;
}

async function exportToCsv({
  dateRange,
  includeAlternatives,
  filename,
  onRow,
}: {
  dateRange?: ExportFilters["dateRange"];
  includeAlternatives: boolean;
  filename: string;
  onRow?: (count: number) => void;
}) {
  return CSVStreamer.streamToFile(
    buildSessionExportRows({ dateRange, includeAlternatives }),
    filename,
    {
      columns: SESSION_EXPORT_COLUMNS,
      onRow,
    }
  );
}

function isWithinDateRange(
  sessionDate: number,
  range?: { from?: number; to?: number }
) {
  if (!range) {
    return true;
  }
  const meetsStart = range.from == null ? true : sessionDate >= range.from;
  const meetsEnd = range.to == null ? true : sessionDate <= range.to;
  return meetsStart && meetsEnd;
}

function createRow(
  session: SessionDTO,
  set: LoggedSetDTO,
  includeAlternatives: boolean
): SessionExportRow {
  const alternative = includeAlternatives ? set.alternative : null;
  return {
    sessionId: session.id,
    sessionName: session.name ?? "",
    sessionDate: session.date,
    sessionCreatedAt: session.createdAt,
    sessionUpdatedAt: session.updatedAt ?? "",
    sessionStatus: session.status,
    workoutType: session.workoutType ?? "",
    exerciseOrder: session.exerciseOrder?.length
      ? JSON.stringify(session.exerciseOrder)
      : "",
    sourcePlanId: session.sourcePlanId ?? "",
    setId: set.id,
    exerciseId: set.exerciseId,
    exerciseName: set.exerciseNameSnapshot ?? "",
    weight: set.weight,
    weightUnit: set.weightUnit,
    reps: set.reps,
    setType: set.setType,
    timestamp: set.timestamp,
    orderIndex: set.orderIndex ?? "",
    setStatus: set.status ?? "",
    setIndex: set.setIndex ?? "",
    notes: set.notes ?? "",
    alternativeExerciseId: alternative?.exerciseId ?? "",
    alternativeExerciseName: alternative?.nameSnapshot ?? "",
    alternativeWeight: alternative?.weight ?? "",
    alternativeReps: alternative?.reps ?? "",
    setCreatedAt: set.createdAt,
    setUpdatedAt: set.updatedAt ?? "",
  };
}

export { buildSessionExportRows, exportToCsv };
