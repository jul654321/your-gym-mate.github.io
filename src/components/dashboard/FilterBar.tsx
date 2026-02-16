import { ChevronDown, Filter, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { DashboardFilters, DatePreset, ExerciseDTO } from "../../types";
import { Modal } from "../shared/Modal";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export interface FilterBarProps {
  filters: DashboardFilters;
  exercises: ExerciseDTO[];
  onChange: (filtersForm: Partial<DashboardFilters>) => void;
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
  const [filtersForm, setFiltersForm] = useState(filters);
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
    if (filtersForm.exerciseIds.length === 0) return "All exercises";
    if (filtersForm.exerciseIds.length === 1) {
      const exercise = exercises.find(
        (ex) => ex.id === filtersForm.exerciseIds[0]
      );
      return exercise?.name || "1 selected";
    }
    return `${filtersForm.exerciseIds.length} exercises`;
  }, [filtersForm.exerciseIds, exercises]);

  const isCustomDate = filtersForm.preset === "custom";

  return (
    <>
      <Button
        variant="ghost"
        size="icon-small"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Filter className="h-5 w-5" />
      </Button>

      {/* Filters content */}
      {isExpanded && (
        <Modal
          title="Filters"
          onClose={() => setIsExpanded(false)}
          actionButtons={[
            <Button
              key="reset"
              variant="ghost"
              onClick={onReset}
              className="mr-2"
            >
              Reset
            </Button>,
            <Button
              key="apply"
              variant="primary"
              onClick={() => {
                setIsExpanded(false);
                onChange(filtersForm);
              }}
            >
              Apply
            </Button>,
          ]}
        >
          <div className="flex flex-col gap-4">
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
                        onChange={(e) => {
                          setExerciseSearchQuery(e.target.value);
                        }}
                        className="h-9"
                      />
                    </div>

                    {/* Exercise List */}
                    <div className="overflow-y-auto max-h-48">
                      {filteredExercises.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          No exercises found
                        </div>
                      ) : (
                        <>
                          <Label className="flex items-center gap-3 px-4 py-2 hover:bg-muted cursor-pointer">
                            <Checkbox
                              checked={
                                filtersForm.exerciseIds.length ===
                                filteredExercises.length
                              }
                              onChange={(
                                event: React.ChangeEvent<HTMLInputElement>
                              ) =>
                                event.target.checked
                                  ? setFiltersForm({
                                      ...filtersForm,
                                      exerciseIds: filteredExercises.map(
                                        (ex) => ex.id
                                      ),
                                    })
                                  : setFiltersForm({
                                      ...filtersForm,
                                      exerciseIds: [],
                                    })
                              }
                            />
                            <span className="text-sm text-bold flex-1 text-muted-foreground">
                              Select all
                            </span>
                          </Label>
                          {filteredExercises.map((exercise) => (
                            <label
                              key={exercise.id}
                              className="flex items-center gap-3 px-4 py-2 hover:bg-muted cursor-pointer"
                            >
                              <Checkbox
                                checked={filtersForm.exerciseIds.includes(
                                  exercise.id
                                )}
                                onChange={(event) =>
                                  event.target.checked
                                    ? setFiltersForm({
                                        ...filtersForm,
                                        exerciseIds: [
                                          ...filtersForm.exerciseIds,
                                          exercise.id,
                                        ],
                                      })
                                    : setFiltersForm({
                                        ...filtersForm,
                                        exerciseIds:
                                          filtersForm.exerciseIds.filter(
                                            (id) => id !== exercise.id
                                          ),
                                      })
                                }
                              />
                              <span className="text-sm flex-1 text-muted-foreground">
                                {exercise.name}
                              </span>
                            </label>
                          ))}
                        </>
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
                checked={filtersForm.includeAlternatives}
                onChange={(e) => {
                  setFiltersForm({
                    ...filtersForm,
                    includeAlternatives: e.target.checked,
                  });
                }}
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
                      filtersForm.preset === preset.value
                        ? "primary"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => {
                      setFiltersForm({
                        ...filtersForm,
                        preset: preset.value,
                      });
                    }}
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
                    value={filtersForm.dateFrom || ""}
                    onChange={(e) => {
                      setFiltersForm({
                        ...filtersForm,
                        dateFrom: e.target.value,
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date-to">To</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={filtersForm.dateTo || ""}
                    onChange={(e) => {
                      setFiltersForm({
                        ...filtersForm,
                        dateTo: e.target.value,
                      });
                    }}
                  />
                </div>
              </div>
            )}

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
        </Modal>
      )}

      {/* Click outside handler */}
      {isExerciseDropdownOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsExerciseDropdownOpen(false)}
        />
      )}
    </>
  );
}
