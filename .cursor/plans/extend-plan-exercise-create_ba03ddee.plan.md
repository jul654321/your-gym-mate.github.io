---
name: extend-plan-exercise-create
overview: Allow entering free-text exercises in Plan UI which creates a new exercise record in IndexedDB and selects it for the plan. Ensure compatibility across plan save and related hooks.
todos: []
isProject: false
---

# Add free-text exercise creation to Plan UI

## Summary

Add the ability to create a new exercise from the Plan editor's exercise input. When the user types a new exercise name and chooses the "Create" option (or presses Enter), the app will create a new exercise record in IndexedDB (client-generated id + createdAt) via the existing `useCreateExercise` hook and then select that exercise for the plan row. Duplicates are allowed (per requirement) — the code will always create a new exercise record even if an existing exercise with the same name exists.

## Files to change

- `src/components/plans/ExerciseAutocomplete.tsx` (primary)
- (no change required) `src/components/ui/autocomplete.tsx` — will be used as-is
- `src/components/plans/PlanExerciseRow.tsx` — unchanged (already calls `onChange` with id + exercise snapshot)
- Ensure `src/hooks/useExercises.ts` and `src/hooks/useCreateExercise` remain compatible (they are already implemented)

## Implementation details

Rationale

- `ExerciseAutocomplete` already performs text search and returns `options` to the shared `Autocomplete` component. We will add a synthetic "create" option appended to the options list when the input (`query`) is non-empty.
- Selecting the synthetic option will call `useCreateExercise().mutateAsync(...)` with a generated uuid and createdAt timestamp; on success we call `onChange(newId, createdExercise)` so `PlanExerciseRow` updates nameSnapshot and `exerciseId` in the form.
- We intentionally do NOT dedupe by name; per request, duplicates create new records.

Behavior details

- When `query` is non-empty, and either there are no matching results or regardless, show a top item: `Add "<query>"` (id prefixed with `__create__:${query}`) with `meta: 'Create'` and no `data` payload.
- When user selects the create item (click or Enter), component will:
  1. disable further input (show loading state)
  2. build a CreateExerciseCmd: { id: uuidv4(), name: query.trim(), createdAt: Date.now() }
  3. call `createExercise.mutateAsync(cmd)` and await
  4. on success call `onChange(created.id, created)`
  5. reset query to the created name and clear any temporary loading
  6. invalidate queries already handled by hook's onSuccess
- If the create mutation fails, show a non-blocking error via console.error and keep the input focused so user can retry. (Optionally surface a toast in a later change.)

Compatibility notes

- `useCreateExercise` uses `db.add` and requires client-generated id and createdAt — we will use `uuidv4()` and `Date.now()`.
- `PlanEditor.handleSave` already expects `plan.planExercises[*].exerciseId` to be set before saving; the new flow ensures that once create completes we call `onChange` that sets `exerciseId` and `nameSnapshot`.
- `useExercises` and cached queries will be invalidated by `useCreateExercise`'s onSuccess, so lists elsewhere will update automatically.

## Example code change (primary)

Replace the current `ExerciseAutocomplete` implementation with a version that supports create. (Only the component body changes; other files remain.)

```typescript
// New ExerciseAutocomplete (replace file: src/components/plans/ExerciseAutocomplete.tsx)
import { useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useExercises, useCreateExercise } from "../../hooks/useExercises";
import { Autocomplete, type AutocompleteItem } from "../ui/autocomplete";
import type { ExerciseDTO } from "../../types";

interface ExerciseAutocompleteProps {
  value?: string;
  onChange: (exerciseId: string, exercise: ExerciseDTO) => void;
  placeholder?: string;
  label: string;
  error?: string;
  excludeIds?: string[];
}

export function ExerciseAutocomplete({
  value,
  onChange,
  placeholder = "Search exercises...",
  label,
  error,
  excludeIds = [],
}: ExerciseAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [clearedValue, setClearedValue] = useState<string | undefined>();
  const [isCreating, setIsCreating] = useState(false);

  const { data: exercises = [], isFetching } = useExercises({
    q: query,
    sort: "name",
    pagination: { pageSize: 10 },
  });

  const { data: allExercises = [] } = useExercises({});

  const createMutation = useCreateExercise();

  const selectedExercise = useMemo(() => {
    if (!value) return null;
    return allExercises.find((item) => item.id === value) ?? null;
  }, [allExercises, value]);

  const filteredExercises = exercises.filter(
    (exercise) => !excludeIds.includes(exercise.id)
  );

  // Synthetic create option when user typed something
  const trimmedQuery = query.trim();
  const createOptionId = `__create__:${trimmedQuery}`;

  const options: AutocompleteItem<ExerciseDTO>[] = [
    // If the user typed and we want to offer creation, append create option first
    ...(trimmedQuery
      ? [
          {
            id: createOptionId,
            label: `Add "${trimmedQuery}"`,
            description: "Create new exercise",
            // no data attached — selection handler will detect intent
          } as AutocompleteItem<ExerciseDTO>,
        ]
      : []),
    ...filteredExercises.map((exercise) => ({
      id: exercise.id,
      label: exercise.name,
      description: exercise.category,
      data: exercise,
    })),
  ];

  const showSelectedExercise =
    Boolean(selectedExercise) && clearedValue !== value && query.length === 0;
  const inputValue = showSelectedExercise ? selectedExercise!.name : query;

  const handleInputChange = (nextValue: string) => {
    setClearedValue(undefined);
    setQuery(nextValue);
  };

  const handleSelect = async (item: AutocompleteItem<ExerciseDTO>) => {
    // Create flow
    if (item.id.startsWith("__create__:") && trimmedQuery.length > 0) {
      try {
        setIsCreating(true);
        const newExercise = {
          id: uuidv4(),
          name: trimmedQuery,
          createdAt: Date.now(),
        } as ExerciseDTO;

        await createMutation.mutateAsync(newExercise);

        // Propagate selection to parent
        onChange(newExercise.id, newExercise);

        // Update input to reflect selected name
        setQuery(newExercise.name);
        setClearedValue(undefined);
      } catch (err) {
        console.error("Failed to create exercise", err);
        // Keep input unchanged so user can retry; consider adding a toast later
      } finally {
        setIsCreating(false);
      }

      return;
    }

    // Normal select
    const exercise = item.data!;
    setClearedValue(undefined);
    setQuery(exercise.name);
    onChange(exercise.id, exercise);
  };

  const handleClear = () => {
    setQuery("");
    setClearedValue(value);
  };

  return (
    <Autocomplete
      label={label}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      options={options}
      onSelectOption={handleSelect}
      placeholder={placeholder}
      error={error}
      loading={isFetching || isCreating}
      onClear={inputValue ? handleClear : undefined}
      noResultsMessage={trimmedQuery ? "No exercises found" : "No exercises"}
    />
  );
}
```

Notes:

- We use a synthetic id prefix `__create__:` to detect the create action. This avoids touching the shared `Autocomplete` component.
- `useCreateExercise` already invalidates the exercises query; no further action required.

## Tasks / Todos

1. implement-exercise-create — Update `src/components/plans/ExerciseAutocomplete.tsx` as shown above. (in_progress)
2. manual-test-plan-editor — Manually test in the Plan Editor: type a new exercise name, press Enter or click the Add option, verify the new exercise is created and selected, save the plan, and verify plan contains the new exerciseId. (pending)
3. test-edge-cases — Test duplicate names (should create new records), rapid create attempts, and failure modes (e.g. DB full). (pending)
4. lint-and-fix — Run linter and fix any issues introduced. (pending)
5. add-e2e-tests — (optional) Add a Cypress or Playwright test that covers creating a new exercise from plan editor and saving plan. (pending)

## Acceptance criteria

- User can type a new exercise name inside the Plan Editor and create it inline.
- A new exercise row is created in IndexedDB with a unique id and createdAt timestamp.
- The newly created exercise is automatically selected for the plan row (exerciseId set and nameSnapshot updated).
- Duplicate names are allowed and create distinct DB records.
- Other parts of the UI that list exercises update to include the new record.

## Rollout & followups

- Add a small toast notification on create success/failure (UX improvement).
- Add analytics event (opt-in) for creation of custom exercises.
- Consider adding lightweight validation (max name length) if needed.
