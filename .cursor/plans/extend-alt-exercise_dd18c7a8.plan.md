---
name: extend-alt-exercise
overview: Plan the work to give alternative plan exercises the same default fields as primaries and ensure all relevant reducers, validation paths, and persistence layers handle the extra data.
todos: []
isProject: false
---

# Extend Alternative Exercise Defaults

## Goals

- Make the alternative exercise option support the same default sets, reps, and weight fields (plus notes) as the primary selection so a plan can ship with complete instructions for both choices.
- Update validation, persistence, and UI affordances so that the new fields survive rounding on save, editing, and instantiation while staying consistent with the existing reducer/DTO contracts.
- Audit related layers (PlanEditor hydration, IndexedDB schema, plan instantiation, plan list rendering) to avoid regressions or silent drops of the extra data.

## Implementation Steps

1. **Update the form model & persistence mappings** — examine `[src/hooks/usePlanFormReducer.ts](src/hooks/usePlanFormReducer.ts)` and `[src/types.ts](src/types.ts)` to determine where `PlanExerciseFormModel`/`PlanDTO` should carry the new optional alternative defaults (sets/reps/weight/notes). Consider whether the DTO already supports storing per-alternative data or if we need to add a nested `alternativeDefaults` structure; note how `exerciseIds` is derived from plan exercises so it still represents only the primary selections.
2. **Expand the row UI** — adjust `[src/components/plans/PlanExerciseRow.tsx](src/components/plans/PlanExerciseRow.tsx)` to render the same sets/reps/weight inputs (plus the notes input) for the alternative exercise selection. Reuse the existing `Input` components, ensure labels/ids remain unique, and wire their change handlers back through `onChange` so `PlanExerciseFormModel` stays in sync.
3. **Refresh validation & reducer handling** — in `usePlanFormReducer`, extend `PlanFormErrors`, `validatePlanForm`, and the reducer’s `PlanExerciseFormModel` merging so the alternative defaults are validated (min values) and preserved when editing. Any new error keys introduced here should be surfaced via `errors` props to `PlanExerciseRow`/`PlanExercisesList`.
4. **Audit surrounding components & persistence** — confirm `[src/components/plans/PlanEditor.tsx](src/components/plans/PlanEditor.tsx)` still constructs `PlanDTO` correctly, update any transforms (e.g., `planExercises` mapping, instantiations) to include the alternative defaults, and ensure `PlanExercisesList`/`PlanRow` don’t need adjustments. If the IndexedDB schema lacks the new fields, schedule a migration under `src/lib/db/migrations/`. Double-check the `.cursor/plan` metadata and any other references to `optionalAlternativeExerciseId` to ensure the extra data remains intact.
5. **Test & document** — plan to run validation via unit tests or manual checks: creating/editing plans with alternative defaults, validating error messaging, ensuring duplicates create unique records, and persistence when the plan is instantiated later.

## Todos

- id: update-form-model
  content: Confirm how `PlanExerciseFormModel` and the persisted DTO should store per-alternative defaults and adjust the reducer/types accordingly.
- id: wire-row-ui
  content: Extend `PlanExerciseRow` to render and emit input changes for alternative sets/reps/weight/notes while keeping accessibility/composition rules.
- id: validate-persistence
  content: Update the validator/reducer, persistence mappers in `PlanEditor`, and any DB schema so the extra fields survive save/load/instantiate paths.
