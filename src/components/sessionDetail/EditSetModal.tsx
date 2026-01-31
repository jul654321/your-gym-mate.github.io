import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type MouseEvent,
} from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ConfirmDeleteModal } from "../shared/ConfirmDeleteModal";
import {
  useDbInit,
  useDeleteLoggedSet,
  useExercises,
  useLoggedSets,
  useGetSetting,
  useUpdateLoggedSet,
  useUpdateSetting,
} from "../../hooks";
import type {
  ExerciseDefaultDTO,
  ExerciseDefaultsDTO,
  LoggedSetDTO,
  UpdateLoggedSetCmd,
  WeightUnit,
} from "../../types";

const WEIGHT_UNITS: WeightUnit[] = ["kg", "lb"];

interface EditSetModalProps {
  set: LoggedSetDTO;
  onClose: () => void;
}

interface EditSetFormState {
  exerciseId: string;
  weightUnit: WeightUnit;
  weight: string;
  reps: string;
  alternativeEnabled: boolean;
  alternativeExerciseId: string;
  alternativeWeight: string;
  alternativeReps: string;
  applyToSession: boolean;
  persistAsDefault: boolean;
}

function buildFormState(set: LoggedSetDTO): EditSetFormState {
  return {
    exerciseId: set.exerciseId,
    weightUnit: set.weightUnit ?? "kg",
    weight: String(set.weight ?? 0),
    reps: String(set.reps ?? 0),
    alternativeEnabled: Boolean(set.alternative),
    alternativeExerciseId: set.alternative?.exerciseId ?? "",
    alternativeWeight:
      set.alternative?.weight != null ? String(set.alternative.weight) : "",
    alternativeReps:
      set.alternative?.reps != null ? String(set.alternative.reps) : "",
    applyToSession: false,
    persistAsDefault: false,
  };
}

export function EditSetModal({ set, onClose }: EditSetModalProps) {
  const { ready } = useDbInit();
  const { data: exercises = [], isLoading: exercisesLoading } = useExercises({
    sort: "name",
  });
  const updateMutation = useUpdateLoggedSet();
  const deleteMutation = useDeleteLoggedSet();
  const updateSettingMutation = useUpdateSetting();
  const { data: exerciseDefaults } = useGetSetting<ExerciseDefaultsDTO>(
    "exerciseDefaults",
    { enabled: ready }
  );
  const { data: sessionSets = [] } = useLoggedSets({
    sessionId: set.sessionId,
  });
  const applyCheckboxId = useId();
  const persistCheckboxId = useId();

  const initialFormState = useMemo(() => buildFormState(set), [set]);
  const [formState, setFormState] = useState(initialFormState);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setFormState(initialFormState);
  }, [initialFormState]);

  const otherSetsForExercise = useMemo(() => {
    return sessionSets.filter(
      (loggedSet) =>
        loggedSet.exerciseId === formState.exerciseId && loggedSet.id !== set.id
    );
  }, [sessionSets, formState.exerciseId, set.id]);

  const exerciseOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const exercise of exercises) {
      map.set(exercise.id, exercise.name);
    }
    if (set.exerciseNameSnapshot && !map.has(set.exerciseId)) {
      map.set(set.exerciseId, set.exerciseNameSnapshot);
    }
    if (set.alternative?.exerciseId) {
      const altName = set.alternative.nameSnapshot ?? "Alternative exercise";
      if (!map.has(set.alternative.exerciseId)) {
        map.set(set.alternative.exerciseId, altName);
      }
    }
    return Array.from(map, ([value, label]) => ({ value, label }));
  }, [exercises, set.exerciseId, set.exerciseNameSnapshot, set.alternative]);

  const labelLookup = useMemo(() => {
    return new Map(
      exerciseOptions.map((option) => [option.value, option.label])
    );
  }, [exerciseOptions]);

  const altExerciseLabel =
    labelLookup.get(formState.alternativeExerciseId) ??
    set.alternative?.nameSnapshot ??
    "Alternative exercise";

  const mainExerciseLabel =
    labelLookup.get(formState.exerciseId) ??
    set.exerciseNameSnapshot ??
    "Exercise";

  const mainWeightValue = parseFloat(formState.weight);
  const mainRepsValue = parseInt(formState.reps, 10);
  const altWeightValue = parseFloat(formState.alternativeWeight);
  const altRepsValue = parseInt(formState.alternativeReps, 10);
  const alternativePayload =
    formState.alternativeEnabled && formState.alternativeExerciseId
      ? {
          exerciseId: formState.alternativeExerciseId,
          nameSnapshot: altExerciseLabel,
          weight: altWeightValue,
          reps: altRepsValue,
        }
      : null;

  const isMainValid =
    !!formState.exerciseId &&
    !Number.isNaN(mainWeightValue) &&
    mainWeightValue >= 0 &&
    !Number.isNaN(mainRepsValue) &&
    mainRepsValue >= 1;

  const isAltValid =
    !formState.alternativeEnabled ||
    (!!formState.alternativeExerciseId &&
      !Number.isNaN(altWeightValue) &&
      altWeightValue >= 0 &&
      !Number.isNaN(altRepsValue) &&
      altRepsValue >= 1);

  const canSave = ready && isMainValid && isAltValid;
  const isBusy =
    updateMutation.isLoading ||
    deleteMutation.isLoading ||
    updateSettingMutation.isLoading;

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(formState) !== JSON.stringify(initialFormState);
  }, [formState, initialFormState]);

  const handleAttemptClose = useCallback(() => {
    if (isBusy) {
      return;
    }
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        "Discard your changes? Unsaved progress will be lost."
      );
      if (!confirmed) {
        return;
      }
    }
    setShowDeleteConfirm(false);
    onClose();
  }, [hasUnsavedChanges, isBusy, onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleAttemptClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleAttemptClose]);

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    const payload: UpdateLoggedSetCmd = {
      id: set.id,
      exerciseId: formState.exerciseId,
      weight: mainWeightValue,
      weightUnit: formState.weightUnit,
      reps: mainRepsValue,
      exerciseNameSnapshot: mainExerciseLabel,
      alternative: alternativePayload,
    };

    try {
      await updateMutation.mutateAsync(payload);

      if (formState.applyToSession && otherSetsForExercise.length > 0) {
        await Promise.all(
          otherSetsForExercise.map((loggedSet) =>
            updateMutation.mutateAsync({
              id: loggedSet.id,
              exerciseId: formState.exerciseId,
              weight: mainWeightValue,
              weightUnit: formState.weightUnit,
              reps: mainRepsValue,
              exerciseNameSnapshot: mainExerciseLabel,
              alternative: alternativePayload,
            })
          )
        );
      }

      if (formState.persistAsDefault) {
        const defaultsForExercise: ExerciseDefaultDTO = {
          weight: mainWeightValue,
          reps: mainRepsValue,
          weightUnit: formState.weightUnit,
          alternative: alternativePayload,
        };

        await updateSettingMutation.mutateAsync({
          key: "exerciseDefaults",
          value: {
            ...(exerciseDefaults ?? {}),
            [formState.exerciseId]: defaultsForExercise,
          },
        });
      }

      onClose();
    } catch (error) {
      console.error("Failed to save set", error);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    deleteMutation.mutate(
      { id: set.id },
      {
        onSuccess: () => {
          setShowDeleteConfirm(false);
          onClose();
        },
      }
    );
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      handleAttemptClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-current/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-editor-title"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
          <h2
            id="plan-editor-title"
            className="text-2xl font-bold text-gray-900"
          >
            Edit Set
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Button>
        </div>

        {/* Body - scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="text-sm font-medium text-slate-600">
              Exercise
            </label>
            <select
              className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 disabled:cursor-not-allowed disabled:bg-slate-50"
              value={formState.exerciseId}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  exerciseId: event.target.value,
                }))
              }
              disabled={!ready || exercisesLoading}
            >
              {exercisesLoading && <option value="">Loading exercises…</option>}
              {!exercisesLoading &&
                exerciseOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-600">
                Weight
              </label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={formState.weight}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    weight: event.target.value,
                  }))
                }
                disabled={!ready}
                inputMode="decimal"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Unit</label>
              <select
                className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
                value={formState.weightUnit}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    weightUnit: event.target.value as WeightUnit,
                  }))
                }
                disabled={!ready}
              >
                {WEIGHT_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Reps</label>
              <Input
                type="number"
                min="1"
                step="1"
                value={formState.reps}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    reps: event.target.value,
                  }))
                }
                disabled={!ready}
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Alternative set
                </p>
                <p className="text-xs text-slate-500">
                  Optional alternative exercise/volume.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setFormState((prev) => ({
                    ...prev,
                    alternativeEnabled: !prev.alternativeEnabled,
                  }))
                }
                disabled={!ready}
              >
                {formState.alternativeEnabled ? "Hide" : "Add"}
              </Button>
            </div>

            {formState.alternativeEnabled && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    Alternative exercise
                  </label>
                  <select
                    className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
                    value={formState.alternativeExerciseId}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        alternativeExerciseId: event.target.value,
                      }))
                    }
                    disabled={!ready || exercisesLoading}
                  >
                    <option value="">
                      {exercisesLoading
                        ? "Loading exercises…"
                        : "Select alternative"}
                    </option>
                    {exerciseOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {!formState.alternativeExerciseId && (
                    <p className="mt-1 text-xs text-red-600">
                      Alternative exercise is required while toggled on.
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    Weight
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formState.alternativeWeight}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        alternativeWeight: event.target.value,
                      }))
                    }
                    disabled={!ready}
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    Reps
                  </label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={formState.alternativeReps}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        alternativeReps: event.target.value,
                      }))
                    }
                    disabled={!ready}
                    inputMode="numeric"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-b border-slate-200 bg-white">
          <div className="px-6 py-4 space-y-3">
            <label
              htmlFor={applyCheckboxId}
              className="flex cursor-pointer items-start gap-3 text-sm font-medium text-slate-900"
            >
              <input
                id={applyCheckboxId}
                type="checkbox"
                className="mt-1 h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                checked={formState.applyToSession}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    applyToSession: event.target.checked,
                  }))
                }
                disabled={!ready || isBusy}
              />
              <div>
                <span className="block font-semibold">
                  Apply to all sets for this exercise in this session
                </span>
                <p className="text-xs font-normal text-slate-500">
                  Updates every logged set with the new weight/reps when you
                  save.
                </p>
              </div>
            </label>

            {/* <label
              htmlFor={persistCheckboxId}
              className="flex cursor-pointer items-start gap-3 text-sm font-medium text-slate-900"
            >
              <input
                id={persistCheckboxId}
                type="checkbox"
                className="mt-1 h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                checked={formState.persistAsDefault}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    persistAsDefault: event.target.checked,
                  }))
                }
                disabled={!ready || isBusy}
              />
              <div>
                <span className="block font-semibold">
                  Save as default for future sessions
                </span>
                <p className="text-xs font-normal text-slate-500">
                  Stores this exercise&apos;s volume so new sessions can pre-fill it.
                </p>
              </div>
            </label> */}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
          <Button
            onClick={onClose}
            disabled={isBusy}
            variant="secondary"
            className="!border-gray-300 text-gray-700 hover:bg-gray-50 disabled:current/80 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            disabled={isBusy}
            className="px-6 py-2 font-medium"
          >
            {isBusy ? "Saving..." : "Save Set"}
          </Button>
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmDeleteModal
          itemName={set.setIndex != null ? `Set ${set.setIndex + 1}` : "set"}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
