// FilterBar component for dashboard filters
// Provides exercise selection, date presets, and filter controls

import { useMemo, useState } from "react";
import { ChevronDown, X, Filter } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import type { DashboardFilters, ExerciseDTO, DatePreset } from "../../types";
import { cn } from "../../lib/utils/cn";

export interface FilterBarProps {
  filters: DashboardFilters;
  exercises: ExerciseDTO[];
  onChange: (filters: Partial<DashboardFilters>) => void;
  onReset: () => void;
  errors?: string[];
}

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom" },
];

export function FilterBar({
  filters,
  exercises,
  onChange,
  onReset,
  errors = [],
}: FilterBarProps) {
  const [isExerciseDropdownOpen, setIsExerciseDropdownOpen] = useState(false);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter exercises by search query
  const filteredExercises = useMemo(() => {
    if (!exerciseSearchQuery) return exercises;
    const query = exerciseSearchQuery.toLowerCase();
    return exercises.filter((ex) => ex.name.toLowerCase().includes(query));
  }, [exercises, exerciseSearchQuery]);

  // Selected exercises display
  const selectedExercisesText = useMemo(() => {
    if (filters.exerciseIds.length === 0) return "All exercises";
    if (filters.exerciseIds.length === 1) {
      const exercise = exercises.find((ex) => ex.id === filters.exerciseIds[0]);
      return exercise?.name || "1 selected";
    }
    return `${filters.exerciseIds.length} exercises`;
  }, [filters.exerciseIds, exercises]);

  const handleExerciseToggle = (exerciseId: string) => {
    const newIds = filters.exerciseIds.includes(exerciseId)
      ? filters.exerciseIds.filter((id) => id !== exerciseId)
      : [...filters.exerciseIds, exerciseId];
    onChange({ exerciseIds: newIds });
  };

  const handleSelectAllExercises = () => {
    onChange({ exerciseIds: [] });
  };

  const handleDeselectAllExercises = () => {
    onChange({ exerciseIds: exercises.map((ex) => ex.id) });
  };

  const isCustomDate = filters.preset === "custom";
  const hasActiveFilters =
    filters.exerciseIds.length > 0 ||
    filters.minWeight !== undefined ||
    filters.maxWeight !== undefined ||
    filters.minReps !== undefined ||
    filters.maxReps !== undefined;

  return (
    <div className="bg-card rounded-lg p-4 shadow-sm space-y-4">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Filters</h2>
          {hasActiveFilters && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={!hasActiveFilters}
          >
            Reset
          </Button>
          <Button
            variant="ghost"
            size="icon-small"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? "Collapse filters" : "Expand filters"}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                isExpanded && "rotate-180"
              )}
            />
          </Button>
        </div>
      </div>

      {/* Filters content */}
      {isExpanded && (
        <div className="space-y-4 pt-2 border-t">
          {/* Exercise Multi-Select */}
          <div className="space-y-2">
            <Label htmlFor="exercise-select">Exercises</Label>
            <div className="relative">
              <Button
                id="exercise-select"
                variant="outline"
                className="w-full justify-between h-11"
                onClick={() =>
                  setIsExerciseDropdownOpen(!isExerciseDropdownOpen)
                }
              >
                <span className="truncate">{selectedExercisesText}</span>
                <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
              </Button>

              {/* Dropdown */}
              {isExerciseDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-72 overflow-hidden flex flex-col">
                  {/* Search */}
                  <div className="p-2 border-b">
                    <Input
                      placeholder="Search exercises..."
                      value={exerciseSearchQuery}
                      onChange={(e) => setExerciseSearchQuery(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  {/* Select/Deselect All */}
                  <div className="p-2 border-b flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAllExercises}
                      className="flex-1"
                    >
                      All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeselectAllExercises}
                      className="flex-1"
                    >
                      None
                    </Button>
                  </div>

                  {/* Exercise List */}
                  <div className="overflow-y-auto max-h-48">
                    {filteredExercises.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        No exercises found
                      </div>
                    ) : (
                      filteredExercises.map((exercise) => (
                        <label
                          key={exercise.id}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={filters.exerciseIds.includes(exercise.id)}
                            onChange={() => handleExerciseToggle(exercise.id)}
                          />
                          <span className="text-sm flex-1">{exercise.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Include Alternatives Toggle */}
          <div className="flex items-center gap-3">
            <Checkbox
              id="include-alternatives"
              checked={filters.includeAlternatives}
              onChange={(e) =>
                onChange({
                  includeAlternatives: (e.target as HTMLInputElement).checked,
                })
              }
            />
            <Label htmlFor="include-alternatives" className="cursor-pointer">
              Include alternative exercises
            </Label>
          </div>

          {/* Date Presets */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant={
                    filters.preset === preset.value ? "primary" : "outline"
                  }
                  size="sm"
                  onClick={() => onChange({ preset: preset.value })}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Date Range */}
          {isCustomDate && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="date-from">From</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={filters.dateFrom || ""}
                  onChange={(e) => onChange({ dateFrom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-to">To</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={filters.dateTo || ""}
                  onChange={(e) => onChange({ dateTo: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Weight Range */}
          <div className="space-y-2">
            <Label>Weight Range (kg)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.minWeight ?? ""}
                  onChange={(e) =>
                    onChange({
                      minWeight: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  min="0"
                  step="0.5"
                />
              </div>
              <div className="space-y-1">
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.maxWeight ?? ""}
                  onChange={(e) =>
                    onChange({
                      maxWeight: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  min="0"
                  step="0.5"
                />
              </div>
            </div>
          </div>

          {/* Reps Range */}
          <div className="space-y-2">
            <Label>Reps Range</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.minReps ?? ""}
                  onChange={(e) =>
                    onChange({
                      minReps: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  min="0"
                  step="1"
                />
              </div>
              <div className="space-y-1">
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.maxReps ?? ""}
                  onChange={(e) =>
                    onChange({
                      maxReps: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  min="0"
                  step="1"
                />
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex items-start gap-2">
                <X className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  {errors.map((error, index) => (
                    <p key={index} className="text-xs text-red-600">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Click outside handler */}
      {isExerciseDropdownOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsExerciseDropdownOpen(false)}
        />
      )}
    </div>
  );
}
