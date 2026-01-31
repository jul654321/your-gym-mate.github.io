---
name: switch-alternative-set
overview: Add a header toggle to EditSetModal to switch a set to its alternative exercise, plus apply-to-session support that updates all sets in the current session. Provide optional bulk-update hook for atomic writes and better performance.
todos:
  - id: ui-edit-modal
    content: Add header toggle, state, and swap behavior in EditSetModal.tsx
    status: pending
  - id: modal-save-logic
    content: Implement payload construction for switch and applyToSession behavior using originalExerciseId
    status: pending
  - id: hooks-bulk-update
    content: Add useBulkUpdateLoggedSets hook to perform atomic multi-set updates in a single IDB transaction
    status: pending
  - id: confirmation-ux
    content: Add confirmation dialog for applyToSession + switchToAlternative
    status: pending
  - id: tests
    content: Add tests for single switch, switch+applyToSession, and session view grouping updates
    status: pending
  - id: undo-support
    content: (Optional) Add undo_trash writes for bulk changes to enable Undo
    status: pending
isProject: false
---

# Add 'Switch to alternative' toggle and apply-to-session behavior

## Summary

Add a toggle control in the header of `src/components/sessionDetail/EditSetModal.tsx` that lets the user switch the current set to its alternative exercise. When the toggle is enabled and the user saves with `Apply to all sets for this exercise in this session`, all sets in the current session that belong to the original primary exercise will be updated to become the alternative (with the previous primary becoming the new alternative snapshot). Use existing hooks where possible; add a bulk-update hook to perform the multi-set updates in one IDB transaction (recommended).

## Files to edit

- [src/components/sessionDetail/EditSetModal.tsx](src/components/sessionDetail/EditSetModal.tsx)
- [src/hooks/useLoggedSets.ts](src/hooks/useLoggedSets.ts) (add optional `useBulkUpdateLoggedSets`)

## Key changes (step-by-step)

1. UI: header toggle

- Add a small toggle control in the modal header labeled "Switch to alternative". Store it as `switchToAlternative` in component state.
- Keep a constant `originalExerciseId = set.exerciseId` captured from props so subsequent logic can reference the original primary across user interactions.

1. Form state & swap behavior

- Extend `EditSetFormState` with `switchToAlternative: boolean` and initialize it in `buildFormState` to `false`.
- When the toggle is turned on, swap visible form fields so the alternative becomes the primary editing context (exercise select, weight, reps). When toggled back, restore primary values. Implementation strategy: when toggling on, set formState.exerciseId to `formState.alternativeExerciseId`, copy main weight/reps into `alternativeWeight`/`alternativeReps`, and move alternative weight/reps into main fields. Keep `originalExerciseId` untouched.

1. Save logic

- Construct payloads differently depending on `switchToAlternative`:
  - Not switching: existing payload (primary remains primary, alternative as provided).
  - Switching: set the saved `exerciseId` to `formState.alternativeExerciseId` and set `alternative` to a snapshot of the previous primary (exerciseId = originalExerciseId, nameSnapshot from original, weight/reps from main values before swap).
- Update current set using existing `useUpdateLoggedSet()` so `exerciseIds` is recalculated by hook code.

1. applyToSession behavior

- Compute the list of other sets to update using the `originalExerciseId` (not the possibly-swapped current `formState.exerciseId`) so we update all sets that originally belonged to the primary exercise.
- For each affected set, produce an update payload matching the chosen action:
  - Non-switch: same as existing behavior (update weight/reps and optional alternative fields while keeping exerciseId unchanged).
  - Switch: update each set's `exerciseId` to `alternativeExerciseId` and set its `alternative` to the old primary snapshot (mirrors current set change). Also update weight/reps per the form fields.

1. Bulk update hook (recommended)

- Add `useBulkUpdateLoggedSets` in `src/hooks/useLoggedSets.ts` which accepts an array of UpdateLoggedSetCmd and performs a single readwrite transaction performing `put` for each set and invalidates queries once at the end. This improves atomicity and reduces repeated query invalidations.
- Fallback: keep calling `updateMutation.mutateAsync` in Promise.all as currently implemented (works but less efficient).

1. Query invalidation and UI updates

- `useUpdateLoggedSet` already invalidates `loggedSets` (and the single-set key). Bulk hook should invalidate the same queries once.
- `useSessionViewModel` groups sets by `exerciseId`; after updates the groupings will change and session view will reflect the alternative as primary for those sets.

1. Edge cases & UX

- If no alternative is provided or `alternativeExerciseId` is empty, disable the toggle.
- Confirm when `applyToSession` + `switchToAlternative` is enabled (this is a multi-set destructive action).
- Consider writing pre-change payloads to `undo_trash` so user can undo a bulk update.

## Why the DB & hooks are ready

- The `loggedSets` schema includes an `alternative` embedded snapshot and `exerciseIds` array (multiEntry) making primary↔alternative swaps supported at the data layer without schema changes.

Relevant schema excerpt:

```startLine:endLine:.cursor/plans/indexeddb_schema_ef33b4bd.plan.md
108:124:.cursor/plans/indexeddb_schema_ef33b4bd.plan.md
interface LoggedSet {
  id: string;
  sessionId: string;
  exerciseId: string;
  exerciseNameSnapshot?: string;
  timestamp: number;
  weight: number;
  weightUnit?: "kg" | "lb";
  reps: number;
  setIndex?: number;
  alternative?: AlternativeSnapshot | null; // optional embedded object
  notes?: string;
  createdAt: number;
  updatedAt?: number;
  // helper denormalized array to make queries that include/exclude alternatives simple
  exerciseIds: string[]; // [exerciseId, alternative?.exerciseId?]
}
```

- `useLoggedSets` provides reads by `sessionId` (used in modal) and `useUpdateLoggedSet` already recalculates `exerciseIds` when `alternative` is provided, so single-set update flow is supported by existing hooks. See existing update logic:

```startLine:endLine:src/hooks/useLoggedSets.ts
198:230:src/hooks/useLoggedSets.ts
const updated: LoggedSetDTO = {
  ...existing,
  ...cmd,
  updatedAt: Date.now(),
  // Recalculate exerciseIds if alternative changed
  exerciseIds:
    cmd.alternative !== undefined
      ? [
          cmd.exerciseId ?? existing.exerciseId,
          ...(cmd.alternative ? [cmd.alternative.exerciseId] : []),
        ]
      : existing.exerciseIds,
};
```

## Minimal code sketch (save payload when switching)

```ts
// new logic inside handleSave when switchToAlternative === true
const originalId = originalExerciseId; // from props
const newPrimaryId = formState.alternativeExerciseId;
const newPrimaryName =
  labelLookup.get(newPrimaryId) ?? form.alternativeNameSnapshot;

const switchedPayload: UpdateLoggedSetCmd = {
  id: set.id,
  exerciseId: newPrimaryId,
  exerciseNameSnapshot: newPrimaryName,
  weight: mainWeightValue, // user-edited main fields now refer to the new primary
  weightUnit: formState.weightUnit,
  reps: mainRepsValue,
  alternative: {
    exerciseId: originalId,
    nameSnapshot: labelLookup.get(originalId) ?? set.exerciseNameSnapshot,
    weight: prevMainWeight, // previous primary values
    reps: prevMainReps,
  },
};
await updateMutation.mutateAsync(switchedPayload);
```

## Todos

- ui-edit-modal: Add header toggle, state, field swap behavior in `src/components/sessionDetail/EditSetModal.tsx`.
- modal-save-logic: Implement switched payload construction and applyToSession logic using `originalExerciseId`.
- hooks-bulk-update: Add `useBulkUpdateLoggedSets` in `src/hooks/useLoggedSets.ts` (recommended) to perform multi-set updates in single transaction and single invalidation.
- confirmation-ux: Add confirmation dialog when performing `applyToSession` + `switchToAlternative`.
- tests: Add unit/integration tests for single-set switch, switch+applyToSession, and group re-render in `useSessionViewModel`.
- undo-support (optional): Push pre-change payloads to `undo_trash` to allow undo for bulk actions.

## Estimated effort

- UI + modal logic changes (no new hook): 2–3 hours.
- Add bulk update hook + wire modal to use it: +1–2 hours.
- Tests + undo support: +1–2 hours.

If you approve this plan I will create the plan file and can implement the UI + save logic first. If you prefer, I can implement the bulk update hook first so modal uses atomic updates.
