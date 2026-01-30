import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import {
  usePlan,
  useCreatePlan,
  useUpdatePlan,
  useInstantiateSessionFromPlan,
} from "../../hooks/usePlans";
import {
  usePlanFormReducer,
  validatePlanForm,
  type PlanFormErrors,
} from "../../hooks/usePlanFormReducer";
import { PlanExercisesList } from "./PlanExercisesList";
import type { PlanDTO, CreatePlanCmd, UpdatePlanCmd } from "../../types";

interface PlanEditorProps {
  planId?: string;
  initial?: PlanDTO;
  onClose: () => void;
  onSaved: (plan: PlanDTO) => void;
}

export function PlanEditor({ planId, onClose, onSaved }: PlanEditorProps) {
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

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

  // Focus on name input when opened
  useEffect(() => {
    nameInputRef.current?.focus();
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
          planExercises: form.planExercises,
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
          planExercises: form.planExercises,
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

  const handleInstantiate = async () => {
    // Validate form first
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setSaveError("Please fix the errors above before starting a workout");
      return;
    }

    // Save first if not already saved
    if (!planId) {
      setSaveError("Please save the plan before starting a workout");
      return;
    }

    try {
      const sessionId = uuidv4();
      const result = await instantiateMutation.mutateAsync({
        id: sessionId,
        planId: planId,
        createdAt: Date.now(),
      });

      navigate(`/sessions/${result.id}`);
    } catch (error) {
      console.error("Failed to instantiate session:", error);
      setSaveError(
        error instanceof Error ? error.message : "Failed to start workout"
      );
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isInstantiating = instantiateMutation.isPending;

  if (isLoadingPlan && planId) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
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
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2
            id="plan-editor-title"
            className="text-2xl font-bold text-gray-900"
          >
            {planId ? "Edit Plan" : "Create New Plan"}
          </h2>
          <button
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
          </button>
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
            <input
              ref={nameInputRef}
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
              <button
                type="button"
                onClick={addExercise}
                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors text-sm font-medium"
              >
                + Add Exercise
              </button>
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
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isSaving || isInstantiating}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>

          <div className="flex gap-3">
            {planId && (
              <button
                onClick={handleInstantiate}
                disabled={isSaving || isInstantiating}
                className="px-4 py-2 text-teal-700 bg-teal-50 border border-teal-600 rounded-md hover:bg-teal-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isInstantiating ? "Starting..." : "Start Workout"}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || isInstantiating}
              className="px-6 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSaving ? "Saving..." : "Save Plan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
