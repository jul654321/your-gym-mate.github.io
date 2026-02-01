import { Button } from "../ui/button";
import { LoggedSetRow } from "./LoggedSetRow";
import type { GroupedExerciseVM } from "../../hooks/useSessionViewModel";
import { Plus } from "lucide-react";
import type { LoggedSetDTO } from "../../types";
import { Fragment } from "react";

interface LoggedSetsListProps {
  groupedSets: GroupedExerciseVM[];
  onAddSet: (exerciseId: string) => void;
  onEditSet: (setId: string, set: LoggedSetDTO) => void;
  onDeleteSet: (setId: string) => void;
  isLoading?: boolean;
  isMutating?: boolean;
}

function ExerciseHeader({
  exerciseName,
  setCount,
  onAdd,
  isBusy,
}: {
  exerciseName: string;
  setCount: number;
  onAdd: () => void;
  isBusy?: boolean;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">{exerciseName}</p>
        <p className="text-xs uppercase tracking-wide text-slate-400">
          {setCount} set{setCount === 1 ? "" : "s"}
        </p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={onAdd}
        disabled={isBusy}
        aria-label={`Quick add set for ${exerciseName}`}
      >
        <Plus className="mr-2 h-4 w-4" aria-hidden />
        Quick Add
      </Button>
    </header>
  );
}

function ExerciseGroup({
  group,
  onAddSet,
  onEditSet,
  onDeleteSet,
  isMutating,
}: {
  group: GroupedExerciseVM;
  onAddSet: (exerciseId: string) => void;
  onEditSet: (setId: string, set: LoggedSetDTO) => void;
  onDeleteSet: (setId: string) => void;
  isMutating?: boolean;
}) {
  if (!group.sets.length) {
    return null;
  }

  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <ExerciseHeader
        exerciseName={group.exerciseName}
        setCount={group.sets.length}
        onAdd={() => onAddSet(group.exerciseId)}
        isBusy={isMutating}
      />
      <div className="mt-4 space-y-3">
        {group.sets.map((set) => (
          <LoggedSetRow
            key={set.id}
            set={set}
            onEdit={(setId) => onEditSet(setId, set)}
            onDelete={onDeleteSet}
            isBusy={isMutating}
          />
        ))}
      </div>
    </article>
  );
}

export function LoggedSetsList({
  groupedSets,
  onAddSet,
  onEditSet,
  onDeleteSet,
  isLoading = false,
  isMutating = false,
}: LoggedSetsListProps) {
  if (isLoading && !groupedSets.length) {
    return <p className="text-sm text-slate-500">Loading logged sets…</p>;
  }

  if (!groupedSets.length && !isLoading) {
    return (
      <p className="text-sm text-slate-500">
        No sets logged yet. Tap Quick Add to capture your first set.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {groupedSets.map((group) => (
        <Fragment key={group.exerciseId}>
          <ExerciseGroup
            group={group}
            onAddSet={onAddSet}
            onEditSet={onEditSet}
            onDeleteSet={onDeleteSet}
            isMutating={isMutating}
          />
        </Fragment>
      ))}
    </div>
  );
}
