import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ConfirmDeleteModal } from "../shared/ConfirmDeleteModal";
import { ConfirmModal } from "../shared/ConfirmModal";
import {
  useBulkUpdateLoggedSets,
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
import { Modal } from "../shared/Modal";
import { Select } from "../ui/select";
import { Label } from "../ui/label";
import { Card } from "../ui/card";
import { InputError } from "../ui/input-error";
import { Checkbox } from "../ui/checkbox";

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
  switchToAlternative: boolean;
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
    switchToAlternative: false,
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
  const bulkUpdateMutation = useBulkUpdateLoggedSets();
  const deleteMutation = useDeleteLoggedSet();
  const updateSettingMutation = useUpdateSetting();
  const { data: exerciseDefaults } = useGetSetting<ExerciseDefaultsDTO>(
    "exerciseDefaults",
    { enabled: ready }
  );
  const { data: sessionSets = [] } = useLoggedSets({
    sessionId: set.sessionId,
  });

  const initialFormState = useMemo(() => buildFormState(set), [set]);
  const [formState, setFormState] = useState(initialFormState);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const primaryBackupRef = useRef({
    exerciseId: initialFormState.exerciseId,
    weight: initialFormState.weight,
    reps: initialFormState.reps,
  });
  const alternativeBackupRef = useRef({
    exerciseId: initialFormState.alternativeExerciseId,
    weight: initialFormState.alternativeWeight,
    reps: initialFormState.alternativeReps,
    enabled: initialFormState.alternativeEnabled,
  });

  useEffect(() => {
    primaryBackupRef.current = {
      exerciseId: initialFormState.exerciseId,
      weight: initialFormState.weight,
      reps: initialFormState.reps,
    };
    alternativeBackupRef.current = {
      exerciseId: initialFormState.alternativeExerciseId,
      weight: initialFormState.alternativeWeight,
      reps: initialFormState.alternativeReps,
      enabled: initialFormState.alternativeEnabled,
    };

    setTimeout(() => {
      setFormState(initialFormState);
    }, 0);
  }, [initialFormState]);

  const originalExerciseId = useMemo(() => set.exerciseId, [set.exerciseId]);

  const otherSetsForExercise = useMemo(() => {
    return sessionSets.filter(
      (loggedSet) =>
        loggedSet.exerciseId === originalExerciseId && loggedSet.id !== set.id
    );
  }, [sessionSets, originalExerciseId, set.id]);

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

  const originalExerciseLabel =
    labelLookup.get(originalExerciseId) ??
    set.exerciseNameSnapshot ??
    "Exercise";

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
    updateMutation.isPending ||
    bulkUpdateMutation.isPending ||
    deleteMutation.isPending ||
    updateSettingMutation.isPending;
  const switchDisabled =
    !ready ||
    isBusy ||
    !formState.alternativeEnabled ||
    !formState.alternativeExerciseId;

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(formState) !== JSON.stringify(initialFormState);
  }, [formState, initialFormState]);

  const closeModal = useCallback(() => {
    setShowDeleteConfirm(false);
    onClose();
  }, [onClose]);

  const handleAttemptClose = useCallback(() => {
    if (isBusy) {
      return;
    }
    if (hasUnsavedChanges) {
      setShowUnsavedConfirm(true);
      return;
    }
    closeModal();
  }, [hasUnsavedChanges, isBusy, closeModal]);

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

  const handleSwitchToggle = useCallback(() => {
    setFormState((prev) => {
      if (prev.switchToAlternative) {
        return {
          ...prev,
          switchToAlternative: false,
          exerciseId: primaryBackupRef.current.exerciseId,
          weight: primaryBackupRef.current.weight,
          reps: primaryBackupRef.current.reps,
          alternativeExerciseId: alternativeBackupRef.current.exerciseId,
          alternativeWeight: alternativeBackupRef.current.weight,
          alternativeReps: alternativeBackupRef.current.reps,
          alternativeEnabled: alternativeBackupRef.current.enabled,
        };
      }

      if (!prev.alternativeExerciseId) {
        return prev;
      }

      primaryBackupRef.current = {
        exerciseId: prev.exerciseId,
        weight: prev.weight,
        reps: prev.reps,
      };
      alternativeBackupRef.current = {
        exerciseId: prev.alternativeExerciseId,
        weight: prev.alternativeWeight,
        reps: prev.alternativeReps,
        enabled: prev.alternativeEnabled,
      };

      return {
        ...prev,
        switchToAlternative: true,
        alternativeEnabled: true,
        exerciseId: prev.alternativeExerciseId,
        weight: prev.alternativeWeight,
        reps: prev.alternativeReps,
        alternativeExerciseId: prev.exerciseId,
        alternativeWeight: prev.weight,
        alternativeReps: prev.reps,
      };
    });
  }, []);

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    const shouldConfirmBulkSwitch =
      formState.applyToSession &&
      formState.switchToAlternative &&
      otherSetsForExercise.length > 0;

    if (shouldConfirmBulkSwitch) {
      const confirmed = window.confirm(
        `Switching every ${originalExerciseLabel} set to ${mainExerciseLabel} will update this entire session. Continue?`
      );
      if (!confirmed) {
        return;
      }
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
        const targetExerciseIdForOthers = formState.switchToAlternative
          ? formState.exerciseId
          : originalExerciseId;

        const commands = otherSetsForExercise.map((loggedSet) => ({
          id: loggedSet.id,
          exerciseId: targetExerciseIdForOthers,
          weight: mainWeightValue,
          weightUnit: formState.weightUnit,
          reps: mainRepsValue,
          exerciseNameSnapshot: mainExerciseLabel,
          alternative: alternativePayload,
        }));

        if (commands.length > 0) {
          await bulkUpdateMutation.mutateAsync(commands);
        }
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

  const handleUnsavedConfirm = useCallback(() => {
    setShowUnsavedConfirm(false);
    closeModal();
  }, [closeModal]);

  const handleUnsavedCancel = useCallback(() => {
    setShowUnsavedConfirm(false);
  }, []);

  return (
    <Modal
      title="Edit Set"
      onClose={handleAttemptClose}
      actionButtons={[
        <Button key="save" onClick={handleSave} disabled={isBusy}>
          {isBusy ? "Saving..." : "Save"}
        </Button>,
      ]}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>
            <Checkbox
              checked={formState.switchToAlternative}
              onChange={handleSwitchToggle}
              disabled={switchDisabled}
            >
              Switch to alternative
            </Checkbox>
          </Label>

          <Label>
            <Checkbox
              checked={formState.applyToSession}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  applyToSession: event.target.checked,
                }))
              }
              disabled={!ready || isBusy}
            >
              Apply to all sets of this session
            </Checkbox>
          </Label>

          {formState.applyToSession && (
            <p className="text-xs text-muted-foreground">
              Updates every logged set with the new weight/reps when you save.
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="exercise">Exercise</Label>
          <Select
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
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="weight">Weight</Label>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={formState.weight}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  weight: event.target.value,
                }))
              }
              disabled={!ready}
            />
          </div>
          <div>
            <Label htmlFor="unit">Unit</Label>
            <Select
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
            </Select>
          </div>
          <div>
            <Label htmlFor="reps">Reps</Label>
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

        <Card
          theme="secondary"
          cardHeader={
            <div className="flex justify-between w-full gap-2">
              <div>
                <p>Alternative set</p>
                <p className="text-xs text-muted-foreground">
                  Optional alternative exercise/volume.
                </p>
              </div>
              <Button
                variant="primary"
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
          }
        >
          <>
            {formState.alternativeEnabled && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="alternative-exercise">
                    Alternative exercise
                  </Label>
                  <Select
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
                  </Select>
                  {!formState.alternativeExerciseId && (
                    <InputError message="Alternative exercise is required while toggled on.">
                      Alternative exercise is required while toggled on.
                    </InputError>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
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
                  <label className="text-sm font-medium text-muted-foreground">
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
          </>
        </Card>
      </div>

      {showDeleteConfirm && (
        <ConfirmDeleteModal
          itemName={set.setIndex != null ? `Set ${set.setIndex + 1}` : "set"}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
          isDeleting={deleteMutation.isPending}
        />
      )}
      {showUnsavedConfirm && (
        <ConfirmModal
          title="Discard changes?"
          description="Discard your changes? Unsaved progress will be lost."
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          onConfirm={handleUnsavedConfirm}
          onCancel={handleUnsavedCancel}
        />
      )}
    </Modal>
  );
}
