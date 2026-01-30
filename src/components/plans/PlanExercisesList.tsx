import { PlanExerciseRow } from "./PlanExerciseRow";
import type { PlanExerciseFormModel } from "../../hooks/usePlanFormReducer";

interface PlanExercisesListProps {
  exercises: PlanExerciseFormModel[];
  onUpdateExercise: (
    index: number,
    exercise: Partial<PlanExerciseFormModel>
  ) => void;
  onRemoveExercise: (index: number) => void;
  onMoveExercise: (fromIndex: number, toIndex: number) => void;
  errors?: Record<
    string,
    {
      exerciseId?: string;
      defaultSets?: string;
      defaultReps?: string;
      defaultWeight?: string;
      optionalAlternativeExerciseId?: string;
    }
  >;
}

export function PlanExercisesList({
  exercises,
  onUpdateExercise,
  onRemoveExercise,
  onMoveExercise,
  errors = {},
}: PlanExercisesListProps) {
  if (exercises.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-4xl mb-2">🏋️</div>
        <p>No exercises added yet</p>
        <p className="text-sm">Click "Add Exercise" below to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {exercises.map((exercise, index) => (
        <PlanExerciseRow
          key={exercise.id}
          value={exercise}
          onChange={(updated) => onUpdateExercise(index, updated)}
          onRemove={() => onRemoveExercise(index)}
          index={index}
          onMoveUp={() => onMoveExercise(index, index - 1)}
          onMoveDown={() => onMoveExercise(index, index + 1)}
          canMoveUp={index > 0}
          canMoveDown={index < exercises.length - 1}
          errors={errors[index]}
        />
      ))}
    </div>
  );
}
