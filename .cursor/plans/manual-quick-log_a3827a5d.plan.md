---
name: manual-quick-log
overview: Add a 'Log a set' flow when a session has no logged sets — allow selecting or creating an exercise and then create a set using existing session add logic.
todos:
  - id: create-exercise-picker
    content: Create ExercisePickerModal at src/components/sessionDetail/ExercisePickerModal.tsx — searchable list using useExercises, create new exercise inline using useCreateExercise, call onSelect(exerciseId) when user picks/creates an exercise.
    status: pending
  - id: update-loggedsetslist-empty-state
    content: Update src/components/sessionDetail/LoggedSetsList.tsx to show a primary "Log a set" button in the empty state; open ExercisePickerModal and call onAddSet(selectedId).
    status: pending
  - id: docs-update-prd
    content: Update .ai/prd.md to include acceptance criteria for inline exercise creation when logging a set.
    status: pending
  - id: docs-update-indexeddb
    content: Update .cursor/plans/indexeddb_schema_ef33b4bd.plan.md to note inline exercise creation details (fields required) and indicate no schema migration required.
    status: pending
  - id: qa-test
    content: "Run manual QA steps: empty session button opens modal; selecting existing exercise logs set; creating new exercise creates DB record and logs set; verify exercises store and loggedSets store entries."
    status: pending
isProject: false
---

# Manual quick-log: add "Log a set" from Session view when no sets exist

## Summary

When a session has no logged sets, show a prominent "Log a set" button that opens a small modal to select an exercise (searchable list). The exercise picker reuses the existing `useExercises` hook and allows creating a new exercise inline (via `useCreateExercise`). Once an exercise is chosen the picker returns its `id` and the parent calls the existing `onAddSet(exerciseId)` handler (which delegates to session view model actions.addSet) to create the logged set with existing defaults and migrations. No DB schema changes required; creating an exercise will write to the `exercises` store (id, name, createdAt).

## Files to change

- `src/components/sessionDetail/LoggedSetsList.tsx` — show button in empty-state and open new modal; wire selected exercise id to `onAddSet` prop.
- `src/components/sessionDetail/ExercisePickerModal.tsx` (new) — modal component that lists/searches exercises and supports creating a new exercise inline.
- `src/pages/SessionView.tsx` — no change to addSet usage; continue passing `onAddSet={actions.addSet}` so newly selected exercise is handled by existing session logic.
- Documentation updates: `.ai/prd.md` (add quick-log + inline exercise creation acceptance criteria) and `.cursor/plans/indexeddb_schema_ef33b4bd.plan.md` (short note that creating an exercise requires `createdAt` and `name` and no migration required).

## Implementation steps (detailed)

1. Create `ExercisePickerModal` component

- Path: `src/components/sessionDetail/ExercisePickerModal.tsx` (new)
- Behavior:
  - Props: `{ open: boolean; onClose: () => void; onSelect: (exerciseId: string) => void }`
  - Uses `useState` for local `query`, `selectedExerciseId` and `newExerciseName`.
  - Uses `useExercises({ q: query, sort: 'name' })` to fetch filtered list.
  - Renders an input for search/typing; shows matching exercises with keyboard/mouse selection.
  - If no matching exercise or user types a new name, show an inline "Create exercise" action that calls `useCreateExercise().mutateAsync({ id: uuidv4(), name: newExerciseName.trim(), createdAt: Date.now() })` and then calls `onSelect(newId)`.
  - When user picks an existing exercise, call `onSelect(exerciseId)`.
  - Accessibility: focus trap, accessible labels, close on Esc.
- Use existing hooks: `useExercises` and `useCreateExercise`. Use `uuid` for new id.

1. Modify `LoggedSetsList.tsx` (small changes)

- Replace the empty-card body (currently lines ~171-181) to include two actions: primary button "Log a set" and secondary "Create exercise" (optional). The primary will open `ExercisePickerModal`.
- Add local state `const [pickerOpen, setPickerOpen] = useState(false);` and handler `handleSelectExercise = (id) => { setPickerOpen(false); onAddSet(id); }` and `onClose` to close modal.
- Ensure `LoggedSetsList` props remain unchanged (still uses `onAddSet` callback provided by `SessionView`). This keeps session creation logic in a single place.

1. Keep `SessionView.tsx` unchanged except verify `onAddSet` continues to call `actions.addSet(exerciseId)`; no prop changes required. (SessionView already passes correct handler.)
2. Reuse existing `actions.addSet` behaviour

- Confirmed: `SessionView` calls `actions.addSet(exerciseId)` so the actual DB write to `loggedSets` follows the established session view model flow. No new transaction logic required.

1. Docs / indexedDB notes

- Update `.ai/prd.md` to add acceptance criteria: "If an exercise does not exist when logging, allow creating it inline from the log modal; new exercise must be saved to `exercises` store with `id`, `name`, `createdAt` and be immediately selectable." Add short example flow.
- Update `.cursor/plans/indexeddb_schema_ef33b4bd.plan.md` notes under `exercises` that the create flow requires `createdAt` and that creating exercises inline during quick-log is supported without schema migration.

1. Testing & QA

- Manual tests:
  - Open a session with no sets → the card shows "Log a set" button and launches modal.
  - Search for exercise by prefix → selecting an item calls `actions.addSet` and a new LoggedSet appears.
  - Type a new exercise name, press "Create exercise" → new exercise is added, modal returns id and a set is created in session.
  - Verify `exercises` store contains the newly created row after creation.
- Edge cases:
  - Rapid double-click: disable button while create API pending.
  - Validation: prevent creating an exercise with empty name.

1. Linting & style

- Follow React rules in `.cursor/rules/react.md` (use hooks, memoize where appropriate, keep logic in hooks if growing).

1. Optional improvements (future)

- Permit setting weight/reps inline in the picker to bypass default-based adds.
- Allow creating an alternative exercise inline for that set.

## Minimal code snippets (essential edits)

Modify the empty-state in `LoggedSetsList.tsx` (existing file). Replace the card body block with the new card UI that opens the modal. Example context (existing block to replace):

```111:182:src/components/sessionDetail/LoggedSetsList.tsx
  if (!groupedSets.length && !isLoading) {
    return (
      <Card theme="secondary" className="text-center mt-4">
        <div className="text-6xl mb-4">🏋️</div>
        <h2 className="text-lg font-semibold text-muted-foreground mb-2">
          No sets logged yet
        </h2>
        <p className="text-muted-foreground mb-6">
          Start your first workout set
        </p>
      </Card>
    );
  }
```

New UI (proposed behavior; implement in new file):

```tsx
// src/components/sessionDetail/ExercisePickerModal.tsx (new)
import React, { useState } from 'react';
import { useExercises, useCreateExercise } from '../../hooks/useExercises';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { v4 as uuidv4 } from 'uuid';

export function ExercisePickerModal({ open, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const { data: exercises = [] } = useExercises({ q: query, sort: 'name' });
  const createExercise = useCreateExercise();
  const [creating, setCreating] = useState(false);

  async function handleCreate(name) {
    if (!name.trim()) return;
    setCreating(true);
    const id = uuidv4();
    await createExercise.mutateAsync({ id, name: name.trim(), createdAt: Date.now() });
    setCreating(false);
    onSelect(id);
  }

  return (
    // modal markup: search input, list of exercises, "Create" CTA when no exact match
  );
}
```

## Todos

- create-exercise-picker: Create `ExercisePickerModal` component and tests
- update-loggedsetslist-empty-state: Update `LoggedSetsList.tsx` to open the picker when empty
- docs-update-prd: Add acceptance criteria and flow to `.ai/prd.md`
- docs-update-indexeddb: Add note about inline exercise creation to `.cursor/plans/indexeddb_schema_ef33b4bd.plan.md`
- qa-test: Manual QA checklist

If you want I will now create the plan file in the repo and then, after you approve, implement the changes and open a PR.
