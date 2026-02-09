import type { WorkoutType } from "../../types";

export const WORKOUT_TYPE_SELECT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "None" },
  { value: "Cardio", label: "Cardio" },
  { value: "HighIntensity", label: "High-intensity training" },
  { value: "Strength", label: "Strength training" },
];

const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  Cardio: "Cardio",
  HighIntensity: "High-intensity",
  Strength: "Strength",
};

export function getWorkoutTypeLabel(
  type?: WorkoutType | null
): string | undefined {
  if (!type) return undefined;
  return WORKOUT_TYPE_LABELS[type];
}
