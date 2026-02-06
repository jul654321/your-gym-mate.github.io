import { Button } from "../ui/button";
import { LoggedSetRow } from "./LoggedSetRow";
import type { GroupedExerciseVM } from "../../hooks/useSessionViewModel";
import { Plus } from "lucide-react";
import type { LoggedSetDTO } from "../../types";
import { Fragment } from "react";
import { Card } from "../ui/card";

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
    <header>
      <div className="flex-grow flex justify-between gap-4 items-start">
        <div>
          <p className="text-md font-semibold text-muted-foreground whitespace-nowrap text-ellipsis overflow-hidden">
            {exerciseName}
          </p>
          <p className="text-xs text-muted-foreground">
            {setCount} Set{setCount === 1 ? "" : "s"}
          </p>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={onAdd}
          disabled={isBusy}
          aria-label={`Quick add set for ${exerciseName}`}
        >
          <Plus className="mr-1 h-4 w-4" aria-hidden />
          Add Set
        </Button>
      </div>
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
    <>
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
    </>
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
