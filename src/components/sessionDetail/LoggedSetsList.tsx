import { Plus } from "lucide-react";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import type { GroupedExerciseVM } from "../../hooks/useSessionViewModel";
import type { LoggedSetDTO } from "../../types";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { ExercisePickerModal } from "./ExercisePickerModal";
import { LoggedSetRow } from "./LoggedSetRow";

interface LoggedSetsListProps {
  groupedSets: GroupedExerciseVM[];
  onAddSet: (exerciseId: string) => void;
  onCopySet: (setId: string) => void;
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
    <>
      <header className="flex flex-col gap-3">
        <div className="flex-grow flex justify-between gap-3 items-start">
          <div className="flex-1 overflow-hidden">
            <p className="text-md font-semibold text-foreground whitespace-nowrap text-ellipsis overflow-hidden">
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
    </>
  );
}

function ExerciseGroup({
  group,
  onAddSet,
  onCopySet,
  onEditSet,
  onDeleteSet,
  isMutating,
  setRefs,
}: {
  group: GroupedExerciseVM;
  onAddSet: (exerciseId: string) => void;
  onCopySet: (setId: string) => void;
  onEditSet: (setId: string, set: LoggedSetDTO) => void;
  onDeleteSet: (setId: string) => void;
  isMutating?: boolean;
  setRefs: MutableRefObject<Map<string, HTMLDivElement>>;
}) {
  if (!group.sets.length) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <ExerciseHeader
        exerciseName={group.exerciseName}
        setCount={group.sets.length}
        onAdd={() => onAddSet(group.exerciseId)}
        isBusy={isMutating}
      />
      <div className="flex flex-col gap-3">
        {group.sets.map((set) => (
          <LoggedSetRow
            key={set.id}
            onCopy={(setId) => onCopySet(setId)}
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
    </section>
  );
}

export function LoggedSetsList({
  groupedSets,
  onAddSet,
  onCopySet,
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
        <Card theme="secondary">
          <div className="flex flex-col gap-3 text-center">
            <div className="text-6xl">🏋️</div>
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold text-foreground">
                No sets logged yet
              </h2>
              <p className="text-muted-foreground">
                Start your first workout set.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={handleOpenPicker}
              className="w-full"
            >
              Log a set
            </Button>
          </div>
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
      <div>
        <div className="flex flex-col gap-8">
          {groupedSets.map((group) => (
            <Fragment key={group.exerciseId}>
              <ExerciseGroup
                group={group}
                onAddSet={onAddSet}
                onCopySet={onCopySet}
                onEditSet={onEditSet}
                onDeleteSet={onDeleteSet}
                isMutating={isMutating}
                setRefs={setRefs}
              />
            </Fragment>
          ))}
        </div>
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
