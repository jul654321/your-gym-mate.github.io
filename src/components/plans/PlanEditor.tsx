import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  usePlan,
  useCreatePlan,
  useUpdatePlan,
  useInstantiateSessionFromPlan,
} from "../../hooks/usePlans";
import {
  usePlanFormReducer,
  type PlanFormErrors,
} from "../../hooks/usePlanFormReducer";
import { PlanExercisesList } from "./PlanExercisesList";
import type {
  PlanDTO,
  CreatePlanCmd,
  UpdatePlanCmd,
  WorkoutType,
} from "../../types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Modal } from "../shared/Modal";
import { Textarea } from "../ui/textarea";
import { Plus } from "lucide-react";
import { Label } from "../ui/label";
import { Select } from "../ui/select";
import { WEEKDAY_SELECT_OPTIONS } from "../../lib/utils/weekdays";
import { WORKOUT_TYPE_SELECT_OPTIONS } from "../../lib/utils/workoutTypes";

interface PlanEditorProps {
  planId?: string;
  initial?: PlanDTO;
  onClose: () => void;
  onSaved: (plan: PlanDTO) => void;
}

export function PlanEditor({ planId, onClose, onSaved }: PlanEditorProps) {
  const [errors, setErrors] = useState<PlanFormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch existing plan if editing
  const { data: existingPlan, isLoading: isLoadingPlan } = usePlan(
    planId || ""
  );

  // Form state management
  const {
    form,
    setName,
    setNotes,
    addExercise,
    removeExercise,
    updateExercise,
    moveExercise,
    setForm,
    setWeekday,
    setWorkoutType,
    validate,
  } = usePlanFormReducer();

  // Mutations
  const createMutation = useCreatePlan();
  const updateMutation = useUpdatePlan();
  const instantiateMutation = useInstantiateSessionFromPlan();

  // Load existing plan data when editing
  useEffect(() => {
    if (existingPlan) {
      setForm({
        id: existingPlan.id,
        name: existingPlan.name,
        notes: existingPlan.notes,
        planExercises: existingPlan.planExercises,
        weekday: existingPlan.weekday ?? null,
        workoutType: existingPlan.workoutType ?? null,
      });
    }
  }, [existingPlan, setForm]);

  const handleSave = async () => {
    // Validate form
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setSaveError("Please fix the errors above before saving");
      return;
    }

    setSaveError(null);

    try {
      if (planId) {
        debugger;
        // Update existing plan
        const cmd: UpdatePlanCmd = {
          id: planId,
          name: form.name.trim(),
          notes: form.notes,
          planExercises: form.planExercises.map((pe) => ({
            id: pe.id,
            exerciseId: pe.exerciseId!,
            defaultSets: pe.defaultSets,
            defaultReps: pe.defaultReps,
            defaultWeight: pe.defaultWeight,
            optionalAlternativeExerciseId: pe.optionalAlternativeExerciseId,
            alternativeDefaults: pe.alternativeDefaults,
            guideLinks: pe.guideLinks ?? [],
          })),
          weekday: form.weekday ?? null,
          workoutType: form.workoutType ?? null,
          updatedAt: Date.now(),
        };

        const result = await updateMutation.mutateAsync(cmd);
        onSaved(result);
      } else {
        // Create new plan
        const cmd: CreatePlanCmd = {
          id: uuidv4(),
          name: form.name.trim(),
          notes: form.notes,
          planExercises: form.planExercises.map((pe) => ({
            id: pe.id,
            exerciseId: pe.exerciseId!,
            defaultSets: pe.defaultSets,
            defaultReps: pe.defaultReps,
            defaultWeight: pe.defaultWeight,
            optionalAlternativeExerciseId: pe.optionalAlternativeExerciseId,
            alternativeDefaults: pe.alternativeDefaults,
            guideLinks: pe.guideLinks ?? [],
          })),
          exerciseIds: form.planExercises
            .map((pe) => pe.exerciseId!)
            .filter(Boolean),
          weekday: form.weekday ?? null,
          workoutType: form.workoutType ?? null,
          createdAt: Date.now(),
        };

        const result = await createMutation.mutateAsync(cmd);
        onSaved(result);
      }
    } catch (error) {
      console.error("Failed to save plan:", error);
      setSaveError(
        error instanceof Error ? error.message : "Failed to save plan"
      );
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isInstantiating = instantiateMutation.isPending;

  return (
    <Modal
      title={planId ? "Edit Plan" : "Create New Plan"}
      onClose={onClose}
      actionButtons={[
        <Button
          key="save"
          onClick={handleSave}
          disabled={isSaving || isInstantiating}
          variant="primary"
        >
          {isSaving ? "Saving..." : "Save Plan"}
        </Button>,
      ]}
    >
      <>
        {isLoadingPlan && planId ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              <p className="mt-2 text-gray-600">Loading plan...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Plan name */}
            <div>
              <Label htmlFor="plan-name">
                Plan Name <span className="text-red-600">*</span>
              </Label>
              <Input
                id="plan-name"
                type="text"
                value={form.name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Push Day, Leg Day, Full Body"
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                  errors.name ? "border-red-500" : "border-border"
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Plan notes */}
            <div>
              <Label htmlFor="plan-notes">Notes (Optional)</Label>
              <Textarea
                id="plan-notes"
                name="notes"
                value={form.notes || ""}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this plan..."
              />
            </div>

            {/* Weekday selector */}
            <div>
              <Label htmlFor="plan-weekday">Scheduled Weekday</Label>
              <Select
                id="plan-weekday"
                value={form.weekday ?? ""}
                onChange={(e) =>
                  setWeekday(
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
              >
                {WEEKDAY_SELECT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                Pick a weekday tag to help organize and filter plans.
              </p>
            </div>

            <div>
              <Label htmlFor="plan-workout-type">Workout type</Label>
              <Select
                id="plan-workout-type"
                value={form.workoutType ?? ""}
                onChange={(e) =>
                  setWorkoutType(
                    (e.target.value === ""
                      ? null
                      : (e.target.value as WorkoutType)) ?? null
                  )
                }
              >
                {WORKOUT_TYPE_SELECT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                Categorize the plan to help surface it alongside similar
                workouts.
              </p>
            </div>

            {/* Exercises list */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-muted-foreground">
                  Exercises
                </h3>
                <Button variant="primary" size="sm" onClick={addExercise}>
                  <Plus className="h-3 w-3 mr-1" aria-hidden />
                  Add Exercise
                </Button>
              </div>

              <PlanExercisesList
                exercises={form.planExercises}
                onUpdateExercise={updateExercise}
                onRemoveExercise={removeExercise}
                onMoveExercise={moveExercise}
                errors={errors.planExercises}
              />
            </div>

            {/* Save error */}
            {saveError && (
              <div className="bg-destructive/10 border-l-4 border-destructive p-4 rounded">
                <p className="text-destructive">{saveError}</p>
              </div>
            )}
          </div>
        )}
      </>
    </Modal>
  );
}
