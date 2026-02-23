import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { ConfirmDeleteDialog } from "../../components/settings/exercises/ConfirmDeleteDialog";
import { ExerciseEditorModal } from "../../components/settings/exercises/ExerciseEditorModal";
import { ExerciseReferenceModal } from "../../components/settings/exercises/ExerciseReferenceModal";
import { useExerciseReferenceCheck } from "../../hooks/useExerciseReferenceCheck";
import {
  useCreateExercise,
  useDeleteExercise,
  useExercises,
  useUpdateExercise,
} from "../../hooks/useExercises";
import type {
  ExerciseReferenceCheckResult,
  ExerciseViewModel,
} from "../../types";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

export function ExercisesListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [editorExercise, setEditorExercise] =
    useState<ExerciseViewModel | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [pendingDeleteExercise, setPendingDeleteExercise] =
    useState<ExerciseViewModel | null>(null);
  const [referenceDetails, setReferenceDetails] =
    useState<ExerciseReferenceCheckResult | null>(null);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const {
    data: exercises = [],
    isLoading,
    isFetching,
  } = useExercises({
    q: debouncedQuery,
    sort: "name",
  });

  const referenceCheck = useExerciseReferenceCheck(pendingDeleteExercise?.id);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchTerm);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!pendingDeleteExercise) {
      return;
    }

    if (referenceCheck.isLoading) {
      return;
    }

    if (referenceCheck.isError) {
      const errorMessage =
        referenceCheck.error instanceof Error
          ? referenceCheck.error.message
          : "Unable to validate references";
      setTimeout(() => {
        setDeleteError(errorMessage);
      }, 0);
      return;
    }

    const refs = referenceCheck.data;
    if (!refs || refs.exerciseId !== pendingDeleteExercise.id) {
      return;
    }

    setTimeout(() => {
      setReferenceDetails(refs);
    }, 0);

    if (isReferenceModalOpen || isConfirmDeleteOpen) {
      return;
    }

    const hasReferences =
      refs.loggedSetsCount > 0 ||
      refs.plans.length > 0 ||
      refs.sessions.length > 0;

    if (hasReferences) {
      setTimeout(() => {
        setIsReferenceModalOpen(true);
      }, 0);
    } else {
      setTimeout(() => {
        setIsConfirmDeleteOpen(true);
      }, 0);
    }
  }, [
    pendingDeleteExercise,
    referenceCheck.data,
    referenceCheck.error,
    referenceCheck.isError,
    referenceCheck.isLoading,
    isConfirmDeleteOpen,
    isReferenceModalOpen,
  ]);

  const createMutation = useCreateExercise();
  const updateMutation = useUpdateExercise();
  const deleteMutation = useDeleteExercise();

  const hasResults = exercises.length > 0;

  const summaryText = useMemo(() => {
    if (isLoading || isFetching) {
      return "Loading exercises…";
    }
    if (!hasResults) {
      return "No exercises match your search.";
    }
    return `${exercises.length} exercise${
      exercises.length === 1 ? "" : "s"
    } listed`;
  }, [exercises.length, hasResults, isFetching, isLoading]);

  const openEditor = (exercise?: ExerciseViewModel) => {
    setEditorExercise(exercise ?? null);
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditorExercise(null);
  };

  const handleSaveExercise = (payload: {
    name: string;
    category?: string;
    equipment?: string[];
    notes?: string;
  }) => {
    if (editorExercise) {
      updateMutation.mutate(
        {
          id: editorExercise.id,
          name: payload.name,
          category: payload.category,
          equipment: payload.equipment,
          notes: payload.notes,
        },
        {
          onSuccess: (updated) => {
            setStatusMessage(`Updated ${updated.name}`);
            closeEditor();
          },
        }
      );
      return;
    }

    createMutation.mutate(
      {
        name: payload.name,
        category: payload.category,
        equipment: payload.equipment,
        notes: payload.notes,
        createdAt: Date.now(),
      },
      {
        onSuccess: (created) => {
          setStatusMessage(`Added ${created.name}`);
          closeEditor();
        },
      }
    );
  };

  const resetDeleteFlow = () => {
    setPendingDeleteExercise(null);
    setIsReferenceModalOpen(false);
    setIsConfirmDeleteOpen(false);
    setDeleteError(null);
    setReferenceDetails(null);
  };

  const handleDeleteRequest = (exercise: ExerciseViewModel) => {
    resetDeleteFlow();
    setPendingDeleteExercise(exercise);
  };

  const handleDeleteConfirm = () => {
    if (!pendingDeleteExercise) {
      return;
    }

    deleteMutation.mutate(
      { id: pendingDeleteExercise.id },
      {
        onSuccess: () => {
          setStatusMessage(`${pendingDeleteExercise.name} deleted`);
          resetDeleteFlow();
        },
        onError: (error) => {
          const conflict =
            error && typeof error === "object"
              ? (error as {
                  code?: string;
                  details?: ExerciseReferenceCheckResult;
                })
              : undefined;

          if (conflict?.code === "conflict" && conflict.details) {
            setReferenceDetails(conflict.details);
            setIsReferenceModalOpen(true);
            setDeleteError("Exercise still referenced");
            return;
          }

          setDeleteError(
            error instanceof Error ? error.message : "Unable to delete exercise"
          );
        },
      }
    );
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-md font-semibold text-foreground">Exercises</h2>
        <Button variant="primary" size="sm" onClick={() => openEditor()}>
          <Plus className="h-4 w-4" aria-hidden />
          Add exercise
        </Button>
      </div>
      {statusMessage && (
        <p className="rounded-full border border-primary/50 bg-primary/10 px-4 py-2 text-xs text-primary">
          {statusMessage}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Label htmlFor="exercise-search">Search exercises</Label>
        <Input
          id="exercise-search"
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search by name"
        />
        <p className="text-xs text-muted-foreground">{summaryText}</p>
      </div>

      <ul className="flex flex-col gap-3">
        {(isLoading || isFetching) && <Card>Loading exercises…</Card>}
        {!isLoading && !hasResults && (
          <Card>
            No exercises yet. Use <strong>Add exercise</strong> to get started.
          </Card>
        )}
        {!isLoading &&
          exercises.map((exercise) => (
            <Card
              key={exercise.id}
              cardHeader={
                <div className="w-full flex items-center justify-between">
                  <div>
                    <p className="text-md">{exercise.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {exercise.category ?? "Uncategorized"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openEditor(exercise)}
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteRequest(exercise)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              }
            >
              <div className="flex flex-1 items-end gap-1 text-xs text-muted-foreground sm:flex-row sm:text-right">
                <span>
                  {exercise.refCounts?.plans ?? 0} plan
                  {(exercise.refCounts?.plans ?? 0) === 1 ? "" : "s"}
                </span>
                <span>
                  {exercise.refCounts?.sessions ?? 0} session
                  {(exercise.refCounts?.sessions ?? 0) === 1 ? "" : "s"}
                </span>
                <span>
                  {exercise.refCounts?.loggedSets ?? 0} logged set
                  {(exercise.refCounts?.loggedSets ?? 0) === 1 ? "" : "s"}
                </span>
              </div>
            </Card>
          ))}
      </ul>

      <ExerciseEditorModal
        open={isEditorOpen}
        exercise={editorExercise ?? undefined}
        isSaving={createMutation.isPending || updateMutation.isPending}
        onClose={closeEditor}
        onSave={handleSaveExercise}
      />

      <ExerciseReferenceModal
        open={isReferenceModalOpen}
        exerciseName={pendingDeleteExercise?.name ?? "Exercise"}
        referenceResult={referenceDetails}
        onClose={() => {
          setIsReferenceModalOpen(false);
          resetDeleteFlow();
        }}
      />

      <ConfirmDeleteDialog
        open={isConfirmDeleteOpen}
        exerciseName={pendingDeleteExercise?.name ?? "Exercise"}
        isDeleting={deleteMutation.isPending}
        error={deleteError}
        onConfirm={handleDeleteConfirm}
        onCancel={resetDeleteFlow}
      />
    </>
  );
}
