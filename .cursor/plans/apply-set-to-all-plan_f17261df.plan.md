---
name: apply-set-to-all-plan
overview: Add 'apply to all sets' and 'persist as default' options to EditSetModal so users can propagate edits to current session and future sessions.
todos:
  - id: add-edit-modal-ui
    content: "Modify EditSetModal.tsx: add two new checkbox fields (applyToSession, persistAsDefault) in form state, add UI checkboxes above footer, wire state."
    status: pending
  - id: add-settings-hooks
    content: Add src/hooks/useSettings.ts with useGetSetting and useUpdateSetting (react-query + getDB) to read/write settings store.
    status: pending
  - id: propagate-updates
    content: "Implement propagation logic in EditSetModal.handleSave: when applyToSession is true, find other sets in same session/exercise and call updateLoggedSet.mutate for each."
    status: pending
  - id: persist-defaults
    content: When persistAsDefault is true, merge and save defaults under settings key 'exerciseDefaults'.
    status: pending
  - id: prefill-usage
    content: (Follow-up) Extend quick-add/prefill logic to consult exerciseDefaults when available.
    status: pending
  - id: tests-and-lint
    content: "Run linter and perform manual acceptance tests: update propagation, persisted defaults, quick-add prefill."
    status: pending
isProject: false
---

# Prepopulate sets from Edit modal (apply-to-all & persist defaults)

Overview

- Add two explicit options in `EditSetModal`:
  - "Apply to all sets in this session" — updates all logged sets in the same session and exercise when saving.
  - "Save as default for future sessions" — stores exercise defaults in the `settings` store so new sessions/pre-filled sets reuse them.

Files to change (high level)

- `src/components/sessionDetail/EditSetModal.tsx` — add two checkboxes, extend form state, and implement propagation logic in `handleSave`.
- `src/hooks/useSettings.ts` — new hooks: `useGetSetting` and `useUpdateSetting` to read/write the `settings` store via react-query.
- `src/hooks/useLoggedSets.ts` (no change to hook itself) — use existing hooks/mutations (`useUpdateLoggedSet`) to update other sets; alternatively use `getDB()` for batch updates. We'll prefer using existing `useUpdateLoggedSet` to ensure cache invalidation.
- `src/types.ts` — add a small helper type for persisted exercise defaults (optional): `ExerciseDefaultsDTO` (or keep value as unknown in settings).

Essential code locations to modify

- The save handler currently lives here; update to perform propagation when checkboxes are checked:

```162:189:src/components/sessionDetail/EditSetModal.tsx
  const handleSave = () => {
    if (!canSave) {
      return;
    }

    const payload: UpdateLoggedSetCmd = {
      id: set.id,
      exerciseId: formState.exerciseId,
      weight: mainWeightValue,
      weightUnit: formState.weightUnit,
      reps: mainRepsValue,
      exerciseNameSnapshot: mainExerciseLabel,
      alternative: formState.alternativeEnabled
        ? {
            exerciseId: formState.alternativeExerciseId,
            nameSnapshot: altExerciseLabel,
            weight: altWeightValue,
            reps: altRepsValue,
          }
        : null,
    };

    updateMutation.mutate(payload, {
      onSuccess: () => {
        onClose();
      },
    });
  };
```

- Insert checkbox UI above the footer (before existing footer block):

```441:459:src/components/sessionDetail/EditSetModal.tsx
        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
          <Button
            onClick={onClose}
            disabled={isBusy}
            variant="secondary"
```

Implementation details

1. UI changes (`EditSetModal.tsx`)

- Extend `EditSetFormState` with two booleans: `applyToSession` and `persistAsDefault` and initialize in `buildFormState`.
- Add two accessible checkboxes (or toggles) in the modal body, just above the footer. Label copy: "Apply to all sets for this exercise in this session" and "Save as default for future sessions".

1. Persist defaults (future sessions)

- Add `src/hooks/useSettings.ts` implementing `useGetSetting(key)` and `useUpdateSetting()` using `getDB()` and react-query's `useQuery`/`useMutation`.
- On save, when `persistAsDefault` is checked, call `useUpdateSetting().mutate({ key: 'exerciseDefaults', value: { ...existing, [exerciseId]: { weight, reps, weightUnit, alternative } } })` (merge behaviour documented). Using a top-level `exerciseDefaults` map avoids schema changes.
- When creating new sets (quick-add flow) or when the app pre-fills last-set values, extend the code that pre-fills (`useGetLastSetForExercise` or quick-add logic) to also look up `exerciseDefaults` if last-set is missing. (This is a follow-up item in todos.)

1. Apply to current session

- On save, if `applyToSession` checked, fetch all sets in the same `sessionId` and `exerciseId` and call `updateLoggedSet.mutate` for each set (skipping the current set id). Implementation options:
  - Loop calling `updateLoggedSet.mutate` for each set — simpler and ensures existing cache invalidation. Add a small delay or batch to avoid UI blocking for large sessions.
  - Alternative: run a single DB transaction updating multiple rows via `getDB()` (faster) and then invalidate queries manually; this requires adding a helper using `getDB()` and `queryClient.invalidateQueries(["loggedSets"])`.
- We'll implement the first option for clarity and reuse of existing mutation logic.

1. Tests & UX

- Add unit / manual test checklist in plan:
  - Edit one set, check both boxes, save → verify all sets in UI update and saved defaults exist in `settings` store.
  - Create a new session from plan or quick-add; confirm defaults are used for prefill.
- Add a small non-blocking toast or snackbar if propagation is taking time: "Updating X sets…" and success toast when done. (Optional MVP: rely on existing isMutating indicator.)

Todos (implementation steps)

1. add-edit-modal-ui

- Modify `src/components/sessionDetail/EditSetModal.tsx`:
  - Add two boolean fields to `EditSetFormState` and `buildFormState`.
  - Add two checkboxes (accessible) above footer.
  - Wire them to component state.
  - Update `handleSave` to conditionally call propagation and settings update.

1. add-settings-hooks

- Add `src/hooks/useSettings.ts` with `useGetSetting(key)` and `useUpdateSetting()` using react-query and `getDB()`.

1. propagate-updates

- In `EditSetModal.handleSave`, after updating the primary set, if `applyToSession` is true: fetch session sets (via `getDB()` or `useLoggedSets`) filtered to same `exerciseId` and `sessionId`, then call `useUpdateLoggedSet().mutate` for each set to update weight/reps/alternative. Ensure to skip the set being edited.

1. persist-defaults

- If `persistAsDefault` is true, call `useUpdateSetting` to merge the defaults into `exerciseDefaults` map under settings store key.

1. prefill-usage (follow-up)

- Update quick-add / prefill logic (e.g., hooks using `useGetLastSetForExercise` / quick-add flow) to consult `exerciseDefaults` when last-set is absent or if a persisted default exists.

1. tests & lints

- Run linter and fix errors introduced.
- Manual acceptance tests listed above.

Risks & Notes

- Performance: iterating many updates in large sessions could be slow. If users have extremely large sessions, consider a batched DB transaction approach.
- Consistency: We rely on `useUpdateLoggedSet` for each update to preserve denormalized `exerciseIds` logic and to invalidate caches.
- Schema changes: We avoid DB schema migration by storing defaults in the existing `settings` store.

Estimated effort

- Implementation: ~3–5 hours
- Manual testing & minor fixes: ~1 hour

Would you like me to proceed and create the patch implementing the plan?
