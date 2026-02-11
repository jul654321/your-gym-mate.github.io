import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Modal } from "../shared/Modal";
import { useCreateExercise, useExercises } from "../../hooks";
import { v4 as uuidv4 } from "uuid";
import { cn } from "../../lib/utils/cn";
import { Label } from "../ui/label";

interface ExercisePickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (exerciseId: string) => void;
}

export function ExercisePickerModal({
  open,
  onClose,
  onSelect,
}: ExercisePickerModalProps) {
  const [query, setQuery] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null
  );
  const [newExerciseName, setNewExerciseName] = useState("");
  const { data: exercises = [], isFetching } = useExercises({
    q: query,
    sort: "name",
  });
  const createExerciseMutation = useCreateExercise();

  const trimmedNewExerciseName = newExerciseName.trim();
  const normalizedNewName = trimmedNewExerciseName.toLowerCase();

  const matchingExercise = useMemo(() => {
    if (!trimmedNewExerciseName) {
      return null;
    }
    return exercises.find(
      (exercise) => exercise.name.toLowerCase() === normalizedNewName
    );
  }, [exercises, normalizedNewName, trimmedNewExerciseName]);

  const canCreateExercise =
    Boolean(trimmedNewExerciseName) && !matchingExercise;

  const handleExerciseSelect = useCallback(
    (exerciseId: string) => {
      setSelectedExerciseId(exerciseId);
      onSelect(exerciseId);
    },
    [onSelect]
  );

  const handleExerciseKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, exerciseId: string) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleExerciseSelect(exerciseId);
      }
    },
    [handleExerciseSelect]
  );

  const handleCreateExercise = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canCreateExercise || createExerciseMutation.isPending) {
        return;
      }
      const id = uuidv4();
      try {
        await createExerciseMutation.mutateAsync({
          id,
          name: trimmedNewExerciseName,
          createdAt: Date.now(),
        });
        setNewExerciseName("");
        setQuery("");
        handleExerciseSelect(id);
      } catch (error) {
        console.error("Failed to create exercise", error);
      }
    },
    [
      canCreateExercise,
      createExerciseMutation,
      handleExerciseSelect,
      trimmedNewExerciseName,
    ]
  );

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setQuery("");
        setNewExerciseName("");
        setSelectedExerciseId(null);
      }, 0);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <Modal title="Log a set" onClose={onClose}>
      <form onSubmit={handleCreateExercise} className="space-y-5">
        <div className="space-y-2">
          <Label
            htmlFor="exercise-search"
            className="text-xs font-semibold text-muted-foreground"
          >
            Search exercises
          </Label>
          <Input
            id="exercise-search"
            value={query}
            onChange={(event) => {
              const nextValue = event.currentTarget.value;
              setQuery(nextValue);
              setNewExerciseName(nextValue);
            }}
            placeholder="Type to filter or add a new exercise"
            autoComplete="off"
            autoFocus
          />
        </div>

        <div>
          <p className="text-xs text-muted-foreground">
            Pick an exercise to log a set. Use the keyboard or tap an item.
          </p>
        </div>

        <div
          role="listbox"
          aria-label="Exercise suggestions"
          className="max-h-[260px] space-y-2 overflow-y-auto"
        >
          {isFetching ? (
            <p className="text-sm text-muted-foreground">Loading exercises…</p>
          ) : exercises.length > 0 ? (
            exercises.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                role="option"
                aria-selected={selectedExerciseId === exercise.id}
                className={cn(
                  "w-full rounded-xl border px-3 py-2 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  selectedExerciseId === exercise.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:border-primary/70 hover:bg-primary/5"
                )}
                onClick={() => handleExerciseSelect(exercise.id)}
                onKeyDown={(event) => handleExerciseKeyDown(event, exercise.id)}
                onFocus={() => setSelectedExerciseId(exercise.id)}
              >
                {exercise.name}
              </button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No exercises match your search yet.
            </p>
          )}
        </div>

        {trimmedNewExerciseName ? (
          matchingExercise ? (
            <p className="text-xs text-red-500">
              Exercise already exists. Tap the matching item to log it.
            </p>
          ) : (
            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center">
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Create a new exercise</p>
                <p className="text-xs text-muted-foreground">
                  A new exercise is saved locally so you can log this set right
                  away.
                </p>
              </div>
              <Button
                type="submit"
                variant="primary"
                className="w-full sm:w-auto"
                isLoading={createExerciseMutation.isPending}
                disabled={!canCreateExercise}
              >
                Create & log "{trimmedNewExerciseName}"
              </Button>
            </div>
          )
        ) : null}
      </form>
    </Modal>
  );
}
