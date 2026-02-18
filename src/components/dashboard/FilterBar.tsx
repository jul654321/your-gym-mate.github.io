import { Filter, X } from "lucide-react";
import { useMemo, useState } from "react";
import type {
  DashboardFilters,
  DatePreset,
  ExerciseDTO,
  PlanDTO,
} from "../../types";
import { Modal } from "../shared/Modal";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export interface FilterBarProps {
  filters: DashboardFilters;
  exercises: ExerciseDTO[];
  plans: PlanDTO[];
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
  plans,
  onChange,
  onReset,
  errors = [],
}: FilterBarProps) {
  const [filtersForm, setFiltersForm] = useState(filters);
  const [isExerciseDropdownOpen, setIsExerciseDropdownOpen] = useState(false);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  const [planSearchQuery, setPlanSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter exercises by search query
  const filteredExercises = useMemo(() => {
    if (!exerciseSearchQuery) return exercises;
    const query = exerciseSearchQuery.toLowerCase();
    return exercises.filter((ex) => ex.name.toLowerCase().includes(query));
  }, [exercises, exerciseSearchQuery]);

  const filteredPlans = useMemo(() => {
    if (!planSearchQuery) return plans;
    const query = planSearchQuery.toLowerCase();
    return plans.filter((plan) => plan.name.toLowerCase().includes(query));
  }, [plans, planSearchQuery]);

  // Selected exercises display
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
              onClick={() => {
                onReset();
                setIsExpanded(false);
              }}
              className="mr-2"
            >
              Reset
            </Button>,
            <Button
              key="apply"
              variant="primary"
              onClick={() => {
                onChange(filtersForm);
                setIsExpanded(false);
              }}
            >
              Apply
            </Button>,
          ]}
        >
          <div className="flex flex-col gap-4">
            {/* Workout Plan Multi-Select */}
            <div className="space-y-2">
              <Label htmlFor="plan-search">Workout Plans</Label>
              <Input
                id="plan-search"
                placeholder="Search plans..."
                value={planSearchQuery}
                onChange={(event) => setPlanSearchQuery(event.target.value)}
                className="h-9"
              />
              <div className="overflow-y-auto max-h-48">
                {filteredPlans.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No plans available
                  </div>
                ) : (
                  <>
                    <Label className="flex items-center gap-3 px-4 py-2 hover:bg-muted cursor-pointer">
                      <Checkbox
                        checked={
                          filteredPlans.length > 0 &&
                          filteredPlans.every((plan) =>
                            filtersForm.planIds.includes(plan.id)
                          )
                        }
                        onChange={(
                          event: React.ChangeEvent<HTMLInputElement>
                        ) =>
                          event.target.checked
                            ? setFiltersForm({
                                ...filtersForm,
                                planIds: filteredPlans.map((plan) => plan.id),
                              })
                            : setFiltersForm({
                                ...filtersForm,
                                planIds: [],
                              })
                        }
                      />
                      <span className="text-sm text-bold flex-1 text-muted-foreground">
                        Select all
                      </span>
                    </Label>
                    {filteredPlans.map((plan) => (
                      <label
                        key={plan.id}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={filtersForm.planIds.includes(plan.id)}
                          onChange={(event) =>
                            event.target.checked
                              ? setFiltersForm({
                                  ...filtersForm,
                                  planIds: [...filtersForm.planIds, plan.id],
                                })
                              : setFiltersForm({
                                  ...filtersForm,
                                  planIds: filtersForm.planIds.filter(
                                    (id) => id !== plan.id
                                  ),
                                })
                          }
                        />
                        <span className="text-sm flex-1 text-muted-foreground">
                          {plan.name}
                        </span>
                      </label>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Exercise Multi-Select */}
            <div className="space-y-2">
              <Label htmlFor="exercise-select">Exercises</Label>
              <div className="relative">
                {/* Dropdown */}
                <div className="z-10 w-full mt-1 max-h-72 overflow-hidden flex flex-col">
                  {/* Search */}
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
                                    exerciseIds: filtersForm.exerciseIds.filter(
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
