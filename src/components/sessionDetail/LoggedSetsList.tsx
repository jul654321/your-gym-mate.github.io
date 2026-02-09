import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { LoggedSetRow } from "./LoggedSetRow";
import { ExercisePickerModal } from "./ExercisePickerModal";
import type { GroupedExerciseVM } from "../../hooks/useSessionViewModel";
import { Plus } from "lucide-react";
import type { LoggedSetDTO } from "../../types";

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
        <div className="flex-1 overflow-hidden">
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
          className="whitespace-nowrap"
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
  setRefs,
}: {
  group: GroupedExerciseVM;
  onAddSet: (exerciseId: string) => void;
  onEditSet: (setId: string, set: LoggedSetDTO) => void;
  onDeleteSet: (setId: string) => void;
  isMutating?: boolean;
  setRefs: MutableRefObject<Map<string, HTMLDivElement>>;
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
            ref={(node) => {
              if (node) {
                setRefs.current.set(set.id, node);
              } else {
                setRefs.current.delete(set.id);
              }
            }}
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const setRefs = useRef(new Map<string, HTMLDivElement>());
  const prevSetIdsRef = useRef<string[]>([]);

  const handleSelectExercise = useCallback(
    (exerciseId: string) => {
      setPickerOpen(false);
      onAddSet(exerciseId);
    },
    [onAddSet]
  );

  const handleOpenPicker = useCallback(() => {
    setPickerOpen(true);
  }, []);

  const currentSetIds = useMemo(
    () => groupedSets.flatMap((group) => group.sets.map((set) => set.id)),
    [groupedSets]
  );

  useEffect(() => {
    const previousIds = prevSetIdsRef.current;
    prevSetIdsRef.current = currentSetIds;

    if (previousIds.length === 0) {
      return;
    }

    if (currentSetIds.length <= previousIds.length) {
      return;
    }

    const previousIdSet = new Set(previousIds);
    const newSetIds = currentSetIds.filter((id) => !previousIdSet.has(id));
    const newSetId = newSetIds[newSetIds.length - 1];

    if (!newSetId) {
      return;
    }

    let rafId: number | null = null;
    const tryScroll = () => {
      const node = setRefs.current.get(newSetId);
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      rafId = requestAnimationFrame(tryScroll);
    };

    tryScroll();

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [currentSetIds]);

  if (isLoading && !groupedSets.length) {
    return <p className="text-sm text-slate-500">Loading logged sets…</p>;
  }

  if (!groupedSets.length && !isLoading) {
    return (
      <>
        <Card theme="secondary" className="text-center mt-4 space-y-3">
          <div className="text-6xl">🏋️</div>
          <h2 className="text-lg font-semibold text-muted-foreground">
            No sets logged yet
          </h2>
          <p className="text-muted-foreground">
            Start your first workout set to track progress.
          </p>
          <Button
            variant="primary"
            onClick={handleOpenPicker}
            className="mt-4 w-full"
          >
            Log a set
          </Button>
        </Card>
        <ExercisePickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={handleSelectExercise}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {groupedSets.map((group) => (
          <Fragment key={group.exerciseId}>
            <ExerciseGroup
              group={group}
              onAddSet={onAddSet}
              onEditSet={onEditSet}
              onDeleteSet={onDeleteSet}
              isMutating={isMutating}
              setRefs={setRefs}
            />
          </Fragment>
        ))}
        <Button
          variant="primary"
          onClick={handleOpenPicker}
          className="mt-4 w-full"
        >
          <Plus className="mr-1 h-4 w-4" aria-hidden />
          Add Set
        </Button>
      </div>
      <ExercisePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelectExercise}
      />
    </>
  );
}
