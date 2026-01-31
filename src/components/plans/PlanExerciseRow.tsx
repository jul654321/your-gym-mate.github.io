import { useId, useState } from "react";
import { ExerciseAutocomplete } from "./ExerciseAutocomplete";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import type {
  PlanExerciseFormModel,
  PlanExerciseAlternativeDefaultsFormModel,
} from "../../hooks/usePlanFormReducer";
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
    alternativeDefaults?: {
      sets?: string;
      reps?: string;
      weight?: string;
    };
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
  const [isExpanded, setIsExpanded] = useState(true);
  const idPrefix = useId().replace(/:/g, "-");
  const toggleId = `plan-exercise-toggle-${idPrefix}`;
  const detailsId = `plan-exercise-details-${idPrefix}`;
  const exerciseLabel = value.nameSnapshot ?? "Select an exercise";

  const handleExerciseSelect = (exerciseId: string, exercise: ExerciseDTO) => {
    onChange({
      exerciseId,
      nameSnapshot: exercise.name,
    });
  };

  const handleAlternativeSelect = (exerciseId: string) => {
    onChange({
      optionalAlternativeExerciseId: exerciseId,
      alternativeDefaults:
        value.alternativeDefaults ??
        ({
          sets: undefined,
          reps: undefined,
          weight: undefined,
          notes: "",
        } as PlanExerciseAlternativeDefaultsFormModel),
    });
  };

  const handleAlternativeClear = () => {
    onChange({
      optionalAlternativeExerciseId: null,
      alternativeDefaults: undefined,
    });
  };

  const updateAlternativeDefaults = (
    changes: Partial<PlanExerciseAlternativeDefaultsFormModel>
  ) => {
    onChange({
      alternativeDefaults: {
        ...(value.alternativeDefaults ?? {}),
        ...changes,
      },
    });
  };

  return (
    <div className="flex flex-col bg-gray-50 border border-gray-200 rounded-lg p-4 gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="w-4 h-4 max-w-4 max-h-4"
            id={toggleId}
            aria-expanded={isExpanded}
            aria-controls={detailsId}
            onClick={() => setIsExpanded((prev) => !prev)}
          >
            <span className="sr-only">
              {isExpanded ? "Collapse" : "Expand"} exercise details for{" "}
              {exerciseLabel}
            </span>
            <svg
              className={`h-4 w-4 transition-transform ${
                isExpanded ? "rotate-90" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Button>
          <div>
            <p className="text-sm font-medium text-gray-600">
              Exercise {index + 1}
            </p>
            <p className="text-xs text-gray-500">{exerciseLabel}</p>
          </div>
        </div>

        <div className="flex gap-1">
          <Button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-slate-600 disabled:text-slate-400"
            aria-label="Move up"
            title="Move up"
          >
            <svg
              className="h-4 w-4"
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
          </Button>
          <Button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-slate-600 disabled:text-slate-400"
            aria-label="Move down"
            title="Move down"
          >
            <svg
              className="h-4 w-4"
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
          </Button>
          <Button
            type="button"
            onClick={onRemove}
            variant="ghost"
            size="icon"
            className="text-red-600 hover:text-red-800"
            aria-label="Remove exercise"
            title="Remove exercise"
          >
            <svg
              className="h-5 w-5"
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
          </Button>
        </div>
      </div>

      <div
        id={detailsId}
        aria-labelledby={toggleId}
        aria-hidden={!isExpanded}
        className={`space-y-4 ${isExpanded ? "" : "hidden"}`}
      >
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
            <Input
              id={`sets-${value.id}`}
              type="number"
              min={1}
              value={value.defaultSets ?? ""}
              onChange={(e) =>
                onChange({
                  defaultSets: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                })
              }
              placeholder="e.g. 3"
              hasError={Boolean(errors?.defaultSets)}
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
            <Input
              id={`reps-${value.id}`}
              type="number"
              min={0}
              value={value.defaultReps ?? ""}
              onChange={(e) =>
                onChange({
                  defaultReps: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                })
              }
              placeholder="e.g. 10"
              hasError={Boolean(errors?.defaultReps)}
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
            <Input
              id={`weight-${value.id}`}
              type="number"
              min={0}
              step={0.5}
              value={value.defaultWeight ?? ""}
              onChange={(e) =>
                onChange({
                  defaultWeight: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                })
              }
              placeholder="e.g. 20"
              hasError={Boolean(errors?.defaultWeight)}
            />
            {errors?.defaultWeight && (
              <p className="mt-1 text-xs text-red-600">
                {errors.defaultWeight}
              </p>
            )}
          </div>
        </div>

        {/* Alternative exercise */}
        <div>
          <ExerciseAutocomplete
            value={value.optionalAlternativeExerciseId || undefined}
            onChange={handleAlternativeSelect}
            onClear={handleAlternativeClear}
            label="Alternative Exercise (Optional)"
            error={errors?.optionalAlternativeExerciseId}
            placeholder="Search for an alternative..."
            excludeIds={value.exerciseId ? [value.exerciseId] : []}
          />
        </div>

        {/* Alternative default values */}
        {value.optionalAlternativeExerciseId && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              Alternative defaults
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor={`alt-sets-${value.id}`}
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Sets
                </label>
                <Input
                  id={`alt-sets-${value.id}`}
                  type="number"
                  min={1}
                  value={value.alternativeDefaults?.sets ?? ""}
                  onChange={(e) =>
                    updateAlternativeDefaults({
                      sets: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="e.g. 3"
                  hasError={Boolean(errors?.alternativeDefaults?.sets)}
                />
                {errors?.alternativeDefaults?.sets && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.alternativeDefaults.sets}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor={`alt-reps-${value.id}`}
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Reps
                </label>
                <Input
                  id={`alt-reps-${value.id}`}
                  type="number"
                  min={0}
                  value={value.alternativeDefaults?.reps ?? ""}
                  onChange={(e) =>
                    updateAlternativeDefaults({
                      reps: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="e.g. 10"
                  hasError={Boolean(errors?.alternativeDefaults?.reps)}
                />
                {errors?.alternativeDefaults?.reps && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.alternativeDefaults.reps}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor={`alt-weight-${value.id}`}
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Weight (kg)
                </label>
                <Input
                  id={`alt-weight-${value.id}`}
                  type="number"
                  min={0}
                  step={0.5}
                  value={value.alternativeDefaults?.weight ?? ""}
                  onChange={(e) =>
                    updateAlternativeDefaults({
                      weight: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="e.g. 20"
                  hasError={Boolean(errors?.alternativeDefaults?.weight)}
                />
                {errors?.alternativeDefaults?.weight && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.alternativeDefaults.weight}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor={`alt-notes-${value.id}`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Notes (Alternative)
              </label>
              <Input
                id={`alt-notes-${value.id}`}
                type="text"
                value={value.alternativeDefaults?.notes ?? ""}
                onChange={(e) =>
                  updateAlternativeDefaults({ notes: e.target.value })
                }
                placeholder="e.g. Use lighter weight"
              />
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label
            htmlFor={`notes-${value.id}`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Notes (Optional)
          </label>
          <Input
            id={`notes-${value.id}`}
            type="text"
            value={value.notes ?? ""}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="e.g. Focus on form"
          />
        </div>
      </div>
    </div>
  );
}
