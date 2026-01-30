import { ExerciseAutocomplete } from "./ExerciseAutocomplete";
import type { PlanExerciseFormModel } from "../../hooks/usePlanFormReducer";
import type { ExerciseDTO } from "../../types";

interface PlanExerciseRowProps {
  value: PlanExerciseFormModel;
  onChange: (updated: Partial<PlanExerciseFormModel>) => void;
  onRemove: () => void;
  index: number;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  errors?: {
    exerciseId?: string;
    defaultSets?: string;
    defaultReps?: string;
    defaultWeight?: string;
    optionalAlternativeExerciseId?: string;
  };
}

export function PlanExerciseRow({
  value,
  onChange,
  onRemove,
  index,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  errors,
}: PlanExerciseRowProps) {
  const handleExerciseSelect = (exerciseId: string, exercise: ExerciseDTO) => {
    onChange({
      exerciseId,
      nameSnapshot: exercise.name,
    });
  };

  const handleAlternativeSelect = (exerciseId: string) => {
    onChange({
      optionalAlternativeExerciseId: exerciseId,
    });
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
      {/* Header with drag handle and remove button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">
            Exercise {index + 1}
          </span>

          {/* Move buttons */}
          <div className="flex gap-1">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Move up"
              title="Move up"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Move down"
              title="Move down"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-red-600 hover:text-red-800"
          aria-label="Remove exercise"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      {/* Exercise selection */}
      <ExerciseAutocomplete
        value={value.exerciseId}
        onChange={handleExerciseSelect}
        label="Exercise"
        error={errors?.exerciseId}
        placeholder="Search for an exercise..."
      />

      {/* Default values grid */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label
            htmlFor={`sets-${value.id}`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Sets
          </label>
          <input
            id={`sets-${value.id}`}
            type="number"
            min="1"
            value={value.defaultSets ?? ""}
            onChange={(e) =>
              onChange({
                defaultSets: e.target.value
                  ? parseInt(e.target.value)
                  : undefined,
              })
            }
            placeholder="e.g. 3"
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
              errors?.defaultSets ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors?.defaultSets && (
            <p className="mt-1 text-xs text-red-600">{errors.defaultSets}</p>
          )}
        </div>

        <div>
          <label
            htmlFor={`reps-${value.id}`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Reps
          </label>
          <input
            id={`reps-${value.id}`}
            type="number"
            min="0"
            value={value.defaultReps ?? ""}
            onChange={(e) =>
              onChange({
                defaultReps: e.target.value
                  ? parseInt(e.target.value)
                  : undefined,
              })
            }
            placeholder="e.g. 10"
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
              errors?.defaultReps ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors?.defaultReps && (
            <p className="mt-1 text-xs text-red-600">{errors.defaultReps}</p>
          )}
        </div>

        <div>
          <label
            htmlFor={`weight-${value.id}`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Weight (kg)
          </label>
          <input
            id={`weight-${value.id}`}
            type="number"
            min="0"
            step="0.5"
            value={value.defaultWeight ?? ""}
            onChange={(e) =>
              onChange({
                defaultWeight: e.target.value
                  ? parseFloat(e.target.value)
                  : undefined,
              })
            }
            placeholder="e.g. 20"
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
              errors?.defaultWeight ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors?.defaultWeight && (
            <p className="mt-1 text-xs text-red-600">{errors.defaultWeight}</p>
          )}
        </div>
      </div>

      {/* Alternative exercise */}
      <div>
        <ExerciseAutocomplete
          value={value.optionalAlternativeExerciseId || undefined}
          onChange={handleAlternativeSelect}
          label="Alternative Exercise (Optional)"
          error={errors?.optionalAlternativeExerciseId}
          placeholder="Search for an alternative..."
          excludeIds={value.exerciseId ? [value.exerciseId] : []}
        />
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor={`notes-${value.id}`}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Notes (Optional)
        </label>
        <input
          id={`notes-${value.id}`}
          type="text"
          value={value.notes ?? ""}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="e.g. Focus on form"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>
    </div>
  );
}
