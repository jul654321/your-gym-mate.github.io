import { useEffect, useRef, useState } from "react";
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
import type { PlanDTO, CreatePlanCmd, UpdatePlanCmd } from "../../types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface PlanEditorProps {
  planId?: string;
  initial?: PlanDTO;
  onClose: () => void;
  onSaved: (plan: PlanDTO) => void;
}

export function PlanEditor({ planId, onClose, onSaved }: PlanEditorProps) {
  const modalRef = useRef<HTMLDivElement>(null);

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
      });
    }
  }, [existingPlan, setForm]);

  // Disallow page scroll while modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
          })),
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
          })),
          exerciseIds: form.planExercises
            .map((pe) => pe.exerciseId!)
            .filter(Boolean),
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

  if (isLoadingPlan && planId) {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-current/80"
        role="dialog"
        aria-modal="true"
      >
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              <p className="mt-2 text-gray-600">Loading plan...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-current/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-editor-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
          <h2
            id="plan-editor-title"
            className="text-2xl font-bold text-gray-900"
          >
            {planId ? "Edit Plan" : "Create New Plan"}
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
          {/* Plan name */}
          <div>
            <label
              htmlFor="plan-name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Plan Name <span className="text-red-600">*</span>
            </label>
            <Input
              id="plan-name"
              type="text"
              value={form.name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Push Day, Leg Day, Full Body"
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                errors.name ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Plan notes */}
          <div>
            <label
              htmlFor="plan-notes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Notes (Optional)
            </label>
            <textarea
              id="plan-notes"
              value={form.notes || ""}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this plan..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          {/* Exercises list */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Exercises</h3>
              <Button
                onClick={addExercise}
                className="px-4 py-2 text-sm font-medium transition-colors"
              >
                + Add Exercise
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
            <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded">
              <p className="text-red-800">{saveError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
          <Button
            onClick={onClose}
            disabled={isSaving || isInstantiating}
            variant="ghost"
            className="!border-gray-300 text-gray-700 hover:bg-gray-50 disabled:current/80 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            disabled={isSaving || isInstantiating}
            className="px-6 py-2 font-medium"
          >
            {isSaving ? "Saving..." : "Save Plan"}
          </Button>
        </div>
      </div>
    </div>
  );
}
