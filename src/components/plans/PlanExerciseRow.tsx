import { useState } from "react";
import { ExerciseAutocomplete } from "./ExerciseAutocomplete";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import type {
  PlanExerciseFormModel,
  PlanExerciseAlternativeDefaultsFormModel,
} from "../../hooks/usePlanFormReducer";
import type { ExerciseDTO, PlanExerciseGuideLinkDTO } from "../../types";
import { Textarea } from "../ui/textarea";
import { Accordion } from "../ui/accordion";
import { Label } from "../ui/label";
import { v4 as uuidv4 } from "uuid";

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
  const exerciseLabel = value.nameSnapshot ?? "Select an exercise";
  const guideLinks = value.guideLinks ?? [];
  const [newGuideTitle, setNewGuideTitle] = useState("");
  const [newGuideUrl, setNewGuideUrl] = useState("");
  const [guideLinkError, setGuideLinkError] = useState<string | null>(null);

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

  const updateGuideLinks = (updated: PlanExerciseGuideLinkDTO[]) => {
    onChange({ guideLinks: updated });
  };

  const handleGuideLinkChange = (
    linkId: string,
    changes: Partial<PlanExerciseGuideLinkDTO>
  ) => {
    updateGuideLinks(
      guideLinks.map((link) =>
        link.id === linkId ? { ...link, ...changes } : link
      )
    );
  };

  const removeGuideLink = (linkId: string) => {
    updateGuideLinks(guideLinks.filter((link) => link.id !== linkId));
  };

  const resetNewLinkForm = () => {
    setNewGuideTitle("");
    setNewGuideUrl("");
    setGuideLinkError(null);
  };

  const handleAddGuideLink = () => {
    const title = newGuideTitle.trim();
    const url = newGuideUrl.trim();
    if (!title) {
      setGuideLinkError("Title is required");
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      setGuideLinkError("URL must start with http:// or https://");
      return;
    }

    updateGuideLinks([...guideLinks, { id: uuidv4(), title, url }]);

    resetNewLinkForm();
  };

  return (
    <Accordion
      headerContent={
        <div className="flex flex-grow items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              Exercise {index + 1}
            </p>
            <p className="text-xs text-muted-foreground">{exerciseLabel}</p>
          </div>

          <div className="flex gap-1">
            <Button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onMoveUp?.();
              }}
              disabled={!canMoveUp}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground disabled:text-muted-foreground"
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
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onMoveDown?.();
              }}
              disabled={!canMoveDown}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground disabled:text-muted-foreground"
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
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onRemove?.();
              }}
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
      }
    >
      <div className="space-y-4">
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
            <Label htmlFor={`sets-${value.id}`}>Sets</Label>
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
            <Label htmlFor={`reps-${value.id}`}>Reps</Label>
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
            <Label htmlFor={`weight-${value.id}`}>Weight (kg)</Label>
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
            <p className="text-sm font-medium text-muted-foreground">
              Alternative defaults
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor={`alt-sets-${value.id}`}>Sets</Label>
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
                <Label htmlFor={`alt-reps-${value.id}`}>Reps</Label>
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
                <Label htmlFor={`alt-weight-${value.id}`}>Weight (kg)</Label>
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
              <Label htmlFor={`alt-notes-${value.id}`}>
                Notes (Alternative)
              </Label>
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
          <Label htmlFor={`notes-${value.id}`}>Notes (Optional)</Label>
          <Textarea
            id={`notes-${value.id}`}
            value={value.notes ?? ""}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="e.g. Focus on form"
          />
        </div>

        {/* Guide links */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Guide Links</Label>
            <p className="text-xs text-muted-foreground">Optional</p>
          </div>

          {guideLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No links added yet.</p>
          ) : (
            <div className="space-y-3">
              {guideLinks.map((link) => (
                <div
                  key={link.id}
                  className="rounded border border-border/70 p-3 space-y-2"
                >
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <Label htmlFor={`guide-title-${link.id}`}>Title</Label>
                      <Input
                        id={`guide-title-${link.id}`}
                        value={link.title}
                        onChange={(e) =>
                          handleGuideLinkChange(link.id, {
                            title: e.target.value,
                          })
                        }
                        placeholder="e.g. Armbar breakdown"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`guide-url-${link.id}`}>URL</Label>
                      <Input
                        id={`guide-url-${link.id}`}
                        value={link.url}
                        onChange={(e) =>
                          handleGuideLinkChange(link.id, {
                            url: e.target.value,
                          })
                        }
                        placeholder="https://"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-primary"
                    >
                      Preview link
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeGuideLink(link.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-2 md:grid-cols-[1.5fr,2fr,auto] items-end">
            <div>
              <Label htmlFor={`new-link-title-${value.id}`}>Title</Label>
              <Input
                id={`new-link-title-${value.id}`}
                value={newGuideTitle}
                onChange={(e) => {
                  setNewGuideTitle(e.target.value);
                  if (guideLinkError) {
                    setGuideLinkError(null);
                  }
                }}
                placeholder="e.g. Form cues"
              />
            </div>
            <div>
              <Label htmlFor={`new-link-url-${value.id}`}>URL</Label>
              <Input
                id={`new-link-url-${value.id}`}
                value={newGuideUrl}
                onChange={(e) => {
                  setNewGuideUrl(e.target.value);
                  if (guideLinkError) {
                    setGuideLinkError(null);
                  }
                }}
                placeholder="https://example.com"
              />
            </div>
            <Button
              type="button"
              onClick={handleAddGuideLink}
              variant="secondary"
              size="sm"
            >
              Add Link
            </Button>
          </div>
          {guideLinkError && (
            <p className="text-xs text-destructive">{guideLinkError}</p>
          )}
        </div>
      </div>
    </Accordion>
  );
}
