---
name: add-plan-workoutType
overview: Add an optional `workoutType` enum to Plans (Cardio | HighIntensity | Strength), wire through IndexedDB schema, hooks, UI, types, PRD and docs, and add migration and tests.
todos:
  - id: add-types
    content: Update Plan types to include optional `workoutType` enum and update Create/Update command types.
    status: pending
  - id: db-migration
    content: Add DB migration to bump version and set `workoutType = null` for existing plans (batched, idempotent).
    status: pending
  - id: hooks-update
    content: Update `useCreatePlan`, `useUpdatePlan`, `usePlans` and `useInstantiateSessionFromPlan` to handle `workoutType` (persist, filter, copy to session).
    status: pending
  - id: ui-plan-editor
    content: Add `Workout type` select to `PlanEditor.tsx` and wire into form reducer and validation.
    status: pending
  - id: ui-plan-row
    content: Show compact badge/pill on `PlanRow` when `workoutType` is present.
    status: pending
  - id: docs-update
    content: Update `.ai/prd.md`, `.cursor/plans/indexeddb_schema_ef33b4bd.plan.md`, and `.cursor/plans/indexeddb_react_hooks_plan_80ebb75f.plan.md` with the new field, migration notes, and hooks changes.
    status: pending
  - id: tests
    content: Add unit tests for hooks (create/update/instantiate) and migration smoke test.
    status: pending
  - id: code-review
    content: Run linter, fix issues, get review and merge.
    status: pending
isProject: false
---

# Add `workoutType` to Plans

## Summary

Add an optional `workoutType` field to the `Plan` model (enum: `Cardio`, `HighIntensity`, `Strength`). Persist it in IndexedDB, expose it in React hooks and query params, surface it in the Plan editor UI, surface on plan list/row, ensure sessions instantiated from plans inherit the type, update PRD and related docs, and create a small migration to backfill existing plans with `null`.

## What will change (concise)

- Data model: add `workoutType?: "Cardio" | "HighIntensity" | "Strength" | null` to `Plan` interface and types used across the app. Sessions should copy the plan's workoutType when instantiated.
- IndexedDB schema: add `workoutType` to `plans` store records and make sure migrations handle previously stored plans.
- Hooks: update `usePlans` query params to support filtering by `workoutType`; update `useCreatePlan` and `useUpdatePlan` to persist the field; update `useInstantiateSessionFromPlan` to copy `workoutType` into the created session record.
- UI: add a `Workout type` select to `PlanEditor` next to Weekday; show a compact pill on `PlanRow` (like weekday badge) when present; optionally filter in PlanList in future.
- PRD & docs: update `.ai/prd.md`, `.cursor/plans/indexeddb_schema_ef33b4bd.plan.md`, and `.cursor/plans/indexeddb_react_hooks_plan_80ebb75f.plan.md` to declare the new field, describe migration, and update hooks docs.
- Tests & QA: add unit tests for hooks (create/update/instantiate), and a migration smoke test. Add acceptance criteria and update PRD acceptance checklist.

## Files to edit

- src/types (where PlanDTO / CreatePlanCmd / UpdatePlanCmd defined)
- src/lib/db (schema and migration files)
- src/hooks/usePlans.ts
- src/components/plans/PlanEditor.tsx
- src/components/plans/PlanRow.tsx
- src/components/plans/PlanList.tsx (optional: filters)
- .ai/prd.md
- .cursor/plans/indexeddb_schema_ef33b4bd.plan.md
- .cursor/plans/indexeddb_react_hooks_plan_80ebb75f.plan.md
- tests/hooks/usePlans.test.ts (new)

## Key implementation notes and examples

- Follow existing weekday handling as a template: add `workoutType` handling in the same places where `weekday` is already handled.

Reference: how `weekday` is populated in `useCreatePlan`:

```116:128:src/hooks/usePlans.ts
export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (plan: CreatePlanCmd) => {
      const db = await getDB();

      // Ensure exerciseIds is populated
      const planToCreate: PlanDTO = {
        ...plan,
        exerciseIds: plan.planExercises.map((pe) => pe.exerciseId),
        weekday: plan.weekday ?? null,
      };

      await db.add(STORE_NAMES.plans, planToCreate);
      return planToCreate;
    },
```

And `weekday` merge logic in `useUpdatePlan`:

```154:172:src/hooks/usePlans.ts
      const hasWeekdayField = Object.prototype.hasOwnProperty.call(
        cmd,
        "weekday"
      );
      const weekdayValue = hasWeekdayField
        ? cmd.weekday ?? null
        : existing.weekday ?? null;

      const updated: PlanDTO = {
        ...existing,
        ...cmd,
        updatedAt: Date.now(),
        weekday: weekdayValue,
        exerciseIds: recalcExerciseIds,
      };
```

Apply the same pattern to `workoutType` (check for presence on cmd using `hasOwnProperty` and default to existing or `null`).

- UI example: `PlanEditor` already includes a Weekday select. Add a `Workout type` `Select` below/above it using the same input pattern.

Reference: weekday select in PlanEditor:

```199:216:src/components/plans/PlanEditor.tsx
            <div>
              <Label htmlFor="plan-weekday">Scheduled Weekday</Label>
              <Select
                id="plan-weekday"
                value={form.weekday ?? ""}
                onChange={(e) =>
                  setWeekday(
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
              >
                {WEEKDAY_SELECT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                Pick a weekday tag to help organize and filter plans.
              </p>
            </div>
```

New workout type select will mirror this UX (use a SMALL set of options: Cardio, High intensity training, Strength training). Use internal enum keys `Cardio`, `HighIntensity`, `Strength` and friendly labels for display.

- When instantiating a session from a plan, copy the plan.workoutType into the new session DTO. This will allow session-level filters and later analytics to use the session-type.
- DB migration: bump DB version; in `onupgradeneeded` for the `plans` store, iterate existing records and set `workoutType = null` (no-op but ensures shape). Mark migration in `settings.meta` and keep it idempotent. Use batched iteration (100 records) to avoid blocking UI.
- PRD and docs: update the Plan data model section to include `workoutType` and update the Acceptance checklist to require UI to show and respect the field. Add a short migration note to the IndexedDB schema plan and hooks plan describing the new query param and copying behavior.

## Acceptance Criteria

- A plan record may include `workoutType` saved to IndexedDB; existing plans remain readable.
- Plan editor UI allows selecting one of the three workout types or leaving it unset.
- Plan row shows a compact pill when `workoutType` is present.
- Creating/updating plans persists `workoutType` and not breaking existing fields (weekday, planExercises, etc.).
- Instantiating a session from a plan copies the `workoutType` into the session.
- DB migration is implemented and idempotent.
- PRD and schema/docs updated to reflect the change.

## Rollout & Testing

- Add unit tests for `useCreatePlan` and `useUpdatePlan` to include `workoutType` and `useInstantiateSessionFromPlan` to copy `workoutType` to session.
- Add a small migration smoke test which runs the migration against a fixture DB with plans lacking `workoutType` and asserts that plans after migration still read and include `workoutType: null`.
- Manual QA checklist: create plan with each type, instantiate session and verify session has type, check plans list UI renders pill, check filtering by type in `usePlans` returns expected results (unit test + manual).

## Todos

1. id: add-types
   content: Update Plan types to include optional `workoutType` enum and update Create/Update command types.
2. id: db-migration
   content: Add DB migration to bump version and set `workoutType = null` for existing plans (batched, idempotent).
3. id: hooks-update
   content: Update `useCreatePlan`, `useUpdatePlan`, `usePlans` and `useInstantiateSessionFromPlan` to handle `workoutType` (persist, filter, copy to session).
4. id: ui-plan-editor
   content: Add `Workout type` select to `PlanEditor.tsx` and wire into form reducer and validation.
5. id: ui-plan-row
   content: Show compact badge/pill on `PlanRow` when `workoutType` is present.
6. id: docs-update
   content: Update `.ai/prd.md`, `.cursor/plans/indexeddb_schema_ef33b4bd.plan.md`, and `.cursor/plans/indexeddb_react_hooks_plan_80ebb75f.plan.md` with the new field, migration notes, and hooks changes.
7. id: tests
   content: Add unit tests for hooks (create/update/instantiate) and migration smoke test.
8. id: code-review
   content: Run linter, fix issues, get review and merge.

---

If you want, I can now: (A) open a PR that implements these changes end-to-end, or (B) implement the changes step-by-step — tell me which files you'd like me to modify first.
