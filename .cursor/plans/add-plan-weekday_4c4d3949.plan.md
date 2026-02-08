---
name: add-plan-weekday
overview: Add a plan-level weekday property so each Plan can be tagged with a single weekday (Mon–Sun). Update schema, hooks, UI, migrations, docs, and tests to support it.
todos:
  - id: update-prd
    content: "Update `.ai/prd.md` to add `weekday?: number | null` to Plan data model and add acceptance criteria for setting and displaying plan weekday."
    status: pending
  - id: schema-migration
    content: Update `.cursor/plans/indexeddb_schema_ef33b4bd.plan.md` and implement DB migration in `src/lib/db` to add `weekday` (nullable) to existing `plans` records; bump DB version and add migration notes.
    status: pending
  - id: types-update
    content: "Add `weekday?: number | null` to Plan DTO types in `src/types.ts` (or the types file used) and update Create/Update command types."
    status: pending
  - id: hooks-update
    content: "Update `src/hooks/usePlans.ts`: accept `PlansQueryParams.weekday`, persist `weekday` in create/update hooks, and support filtering by weekday in usePlans query."
    status: pending
  - id: ui-editor
    content: Update `src/components/plans/PlanEditor.tsx` to add a weekday picker control (None + Mon..Sun), include value in create/update payloads, and validate input.
    status: pending
  - id: ui-list-row
    content: Update `src/components/plans/PlanRow.tsx` to render a weekday badge when `plan.weekday` is set; ensure accessibility labels.
    status: pending
  - id: tests
    content: "Add unit/integration tests: create/update plan with weekday, usePlans filter by weekday, and DB migration test ensuring old plans get `weekday=null`."
    status: pending
  - id: doc-hooks
    content: Update `.cursor/plans/indexeddb_react_hooks_plan_80ebb75f.plan.md` to describe the new hook param and examples.
    status: pending
  - id: qa-checklist
    content: "Manual QA checklist: create/edit plan with weekday, list shows badge, filtering works, migration success; add to release notes."
    status: pending
isProject: false
---

# Add `weekday` to Plans (single weekday at plan level)

## Summary

Add a new plan-level field `weekday` to surface a single weekday for each plan (values: `0`..`6` or string names internally). This is metadata used for scheduling suggestions and filtering (no automatic session creation by default). Work includes schema + migration, hooks, UI, types, PRD and plans docs, tests, and a small UX update in plan list/editor.

## Goals

- Store a single weekday per Plan (nullable/default null).
- Update IndexedDB schema and migrations.
- Update React hooks (`usePlans`, create/update hooks, instantiate-from-plan logic if relevant).
- Add UI control to `PlanEditor.tsx` to set weekday and display it in `PlanRow`.
- Update PRD and internal plans documents to record the new field and acceptance criteria.
- Add unit/integration test cases and a migration that preserves existing plans (weekday === null).

## Design decisions

- Representation: store `weekday` as integer 0 (Sunday) .. 6 (Saturday). UI shows localized short names (Mon, Tue, ...). Reason: compact, easy to query and sort, language-agnostic storage.
- Default: existing plans get `weekday: null` after migration.
- No auto-scheduling: adding weekday is metadata; sessions are not auto-created. (If later required, add `autoSchedule` flag.)

## Files to update

- Documentation
  - `.ai/prd.md` — add field to Data model and Acceptance Criteria for plan scheduling.
  - `.cursor/plans/indexeddb_schema_ef33b4bd.plan.md` — update Plan interface to include `weekday?: number | null` and migration notes.
  - `.cursor/plans/indexeddb_react_hooks_plan_80ebb75f.plan.md` — document hooks changes and API contract.
- Types & DB
  - `src/types.ts` (or wherever Plan DTOs live) — add `weekday?: number | null` to `Plan`/`PlanDTO` and `Create/Update` commands.
  - `src/lib/db` — (migration code) add upgrade step to populate `weekday` = null for existing records and add handling for new field when writing/reading.
- Hooks
  - `src/hooks/usePlans.ts` — ensure create/update compute `exerciseIds` still and include `weekday` handling; update query filtering param support (allow filtering by weekday). Add `PlansQueryParams.weekday?: number` and support in usePlans query.
  - `src/hooks/*` tests (if present)
- UI
  - `src/components/plans/PlanEditor.tsx` — add a compact weekday picker (select input or segmented control) with accessible labels. Validate value and include in create/update payload.
  - `src/components/plans/PlanRow.tsx` — show weekday badge/icon in card header/footer when set.
  - `src/components/plans/PlanList.tsx` — optional: add filter UI to filter plans by weekday (defer if scope too large).
- Tests
  - Unit tests for hook create/update to persist weekday and for usePlans filter by weekday.
  - Migration test: DB upgrade preserves data and sets weekday=null for existing plans.

## Migration

- DB version bump + onupgradeneeded migration:
  1. Increment DB version (e.g., vN -> vN+1).
  2. In `onupgradeneeded`, iterate `plans` store in batches and for any record missing `weekday`, set `weekday = null` and `updatedAt = Date.now()` (or leave untouched). Use batched writes to avoid blocking UI.
  3. Ensure new writes/puts include `weekday` field (nullable).
  4. Update `meta`/settings with `dbVersionAppliedAt` and migration notes.

## Hook changes (high level)

- `usePlans(params: PlansQueryParams)`
  - Add optional `weekday?: number` to `PlansQueryParams`.
  - If `params.weekday` present, query all plans and filter by `weekday === params.weekday` (small set); consider an index if filtering by weekday becomes common (not required for MVP).
- `useCreatePlan()` / `useUpdatePlan()`
  - Accept `weekday` in cmd payload; ensure persisted when calling `db.add`/`db.put`.
  - Update optimistic cache and invalidate queries as before.
- `useInstantiateSessionFromPlan()`
  - No immediate change required. If UX should default suggested session date to the next occurrence of plan.weekday, add a follow-up task.

## UI changes

- `PlanEditor.tsx`
  - Add a labeled control: `Weekday` with options `None / Mon / Tue / Wed / Thu / Fri / Sat / Sun`.
  - Validate selection; on save, include `weekday` in the Plan object passed to `useCreatePlan`/`useUpdatePlan`.
- `PlanRow.tsx`
  - Render a small badge (e.g., short weekday string) in `cardHeader` or `cardFooter` when `plan.weekday != null`.
  - Provide alt text for accessibility: `aria-label="Scheduled weekday: Monday"`.

## Documentation updates

- Update `.ai/prd.md`: in Data model `Plan` add `weekday?: number | null` and acceptance criteria: ability to set weekday, display in plan list, filter plans by weekday.
- Update indexeddb schema plan file to include the new field and migration steps.
- Update hooks plan document to note new query param and behavior.

## Testing & QA

- Unit tests for create/update plan to include weekday.
- Hook test for `usePlans({ weekday })` filter.
- Integration test for migration updating pre-existing plans.
- Manual QA checklist: create plan with weekday, edit weekday, list shows badge, filter works, migration for old data preserves plans and sets weekday null.

## Rollout notes

- Feature is backward-compatible: weekday is optional and defaults to `null` for older records.
- No immediate UI breaking changes expected. Keep registration of feature behind a feature flag if desired.

## Acceptance criteria

- Developer can set a single weekday on a plan via `PlanEditor` and it persists in IndexedDB.
- Plan list shows weekday badge when set.
- `usePlans` supports filtering by weekday.
- PRD and internal plans docs updated.
- Migration safely upgrades existing DBs without data loss.

## Minimal example snippets

Save `weekday` on create/update (example payload):

```typescript
const newPlan = {
  id: uuidv4(),
  name: 'Upper Body',
  planExercises: [...],
  exerciseIds: [...],
  createdAt: Date.now(),
  weekday: 1 // Monday (0=Sun..6=Sat) or null
};
await db.add(STORE_NAMES.plans, newPlan);
```

Simple UI mapping (PlanEditor):

```tsx
<select
  value={weekday ?? ""}
  onChange={(e) =>
    setWeekday(e.target.value === "" ? null : Number(e.target.value))
  }
>
  <option value="">None</option>
  <option value="1">Mon</option>
  <option value="2">Tue</option>
  ...
</select>
```

## Follow-ups (optional)

- Add an index on `weekday` if filtering by weekday becomes a frequent operation.
- Add an auto-schedule option that suggests next session date when instantiating a session from a plan.
- Expose a calendar view that groups plans by weekday.

---
