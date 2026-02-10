---
name: plan-guide-links
overview: Add optional, per-exercise guide links (title+url) to plans so editors can add links and plan rows surface link counts. Includes schema, types, hooks, UI, migration and docs updates.
todos:
  - id: add-types
    content: Add PlanExerciseGuideLinkDTO and extend PlanExerciseDTO in src/types.ts (include id,title,url).
    status: pending
  - id: update-schema-doc
    content: "Update .cursor/plans/indexeddb_schema_ef33b4bd.plan.md: add guideLinks to PlanExercise and migration notes (v4)."
    status: pending
  - id: db-migration
    content: Implement DB upgrade in src/lib/db to backfill guideLinks = [] for existing plan.planExercises (batched, idempotent).
    status: pending
  - id: hooks-update
    content: Update usePlans.buildPlanToCreate, buildPlanUpdate, and usePlan enrichment to preserve guideLinks. Ensure create/update payloads pass guideLinks through.
    status: pending
  - id: ui-editor
    content: "Add guide links UI to PlanEditor and PlanExercisesList/PlanExerciseRow: add/edit/remove multiple titled links, validate URLs, and include in save payload."
    status: pending
  - id: ui-row
    content: Update PlanRow to compute & display total guide link count across plan.planExercises (compact indicator with tooltip).
    status: pending
  - id: tests
    content: "Add tests: create/read/update plans with guideLinks and migration test to ensure backfill works."
    status: pending
  - id: docs-update
    content: Update PRD (.ai/prd.md) with PlanExercise.guideLinks description and acceptance criteria; update schema doc already in a previous todo.
    status: pending
  - id: qa
    content: "Manual QA checklist: add links, save plan, open plan list indicator, instantiate session (ensure exerciseIds unaffected), run migration path on sample DB."
    status: pending
isProject: false
---

# Add per-exercise guide links (title + url)

Overview

Add an optional "guideLinks" array to each PlanExercise so authors can attach one or more titled links (e.g. videos, technique pages) to an exercise inside a plan. Changes touch: types, IndexedDB schema + migration, plan hooks, the PlanEditor UI (add/edit/remove links per plan exercise), and PlanRow (show a compact indicator/count of links). Update PRD and schema docs.

Implementation steps

1. Types

- Add a new DTO: `PlanExerciseGuideLinkDTO` in `src/types.ts` and extend `PlanExerciseDTO` with `guideLinks?: PlanExerciseGuideLinkDTO[]`.
- Ensure Create/Update command types accept the new field and that `CreatePlanCmd` -> `PlanDTO` populates `exerciseIds` unchanged.

Essential new type (to add to `src/types.ts`):

```typescript
export interface PlanExerciseGuideLinkDTO {
  id: UUID; // uuid for the link
  title: string; // short human-friendly title
  url: string; // validated http(s) URL
}

// extend PlanExerciseDTO
export interface PlanExerciseDTO {
  id: UUID;
  exerciseId: UUID;
  nameSnapshot?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultWeight?: number;
  optionalAlternativeExerciseId?: UUID | null;
  alternativeDefaults?: PlanExerciseAlternativeDefaultsDTO;
  notes?: string;
  guideLinks?: PlanExerciseGuideLinkDTO[]; // NEW OPTIONAL
}
```

1. IndexedDB schema doc

- Update `.cursor/plans/indexeddb_schema_ef33b4bd.plan.md`:
  - Add `guideLinks?: { id, title, url }[]` to the `PlanExercise` schema section.
  - Add migration notes: bump DB version (e.g. v4) and backfill `guideLinks = []` for existing planExercises (idempotent). Describe a batched migration strategy.

1. Hooks & DB layer

- Update `src/hooks/usePlans.ts`:
  - `buildPlanToCreate` and `buildPlanUpdate` should preserve `guideLinks` if present; no change needed for `exerciseIds` logic.
  - `usePlan` enrichment (lines ~154-168) should preserve and return `guideLinks` for each planExercise (no extra DB reads required since links are embedded in plan row).
- Add migration code in DB open/upgrade callback (where `getDB` is implemented in `src/lib/db`) to add `guideLinks: []` to existing plan.planExercises records when upgrading to new DB version.

1. UI — PlanEditor

- Update `src/components/plans/PlanEditor.tsx` and child `PlanExercisesList` / `PlanExerciseRow` (create or modify as needed):
  - For each planExercise row, add a collapsible "Guide links" section that shows existing links (title as anchor) and an "Add link" button that opens small inline inputs for Title + URL.
  - Allow adding multiple links (append to `planExercise.guideLinks` in form state), editing and removing links.
  - Validate URL format (simple client-side check: begins with http:// or https://) and non-empty title.
  - When saving plan (handleSave), ensure the planExercises mapping already includes `guideLinks` in both CreatePlanCmd and UpdatePlanCmd (PlanEditor currently maps many fields; extend to pass guideLinks through unchanged).

Concise example JSX (to implement inside the plan exercise row UI):

```jsx
<div className="mt-2">
  <Label>Guide Links</Label>
  {pe.guideLinks?.map((g, i) => (
    <div key={g.id} className="flex items-center gap-2">
      <a href={g.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary">{g.title}</a>
      <Button size="icon-small" onClick={() => removeGuideLink(pe.id, g.id)}>Remove</Button>
    </div>
  ))}
  <div className="flex gap-2 mt-2">
    <Input placeholder="Title" value={newTitle} onChange=... />
    <Input placeholder="https://..." value={newUrl} onChange=... />
    <Button onClick={() => addGuideLink(pe.id, { id: uuidv4(), title: newTitle, url: newUrl })}>Add</Button>
  </div>
</div>
```

- Update PlanEditor save mapping (both Create & Update branches) to include `guideLinks: pe.guideLinks` when constructing the plan payload (it will be serialized into DB as-is).

1. UI — PlanRow (plans list)

- Update `src/components/plans/PlanRow.tsx` to surface a compact indicator if any planExercises include guideLinks. Options:
  - Show a small link icon + total links count (sum across plan.planExercises.map(pe => pe.guideLinks?.length || 0)) near the plan name or in footer.
  - Tooltip/aria-label: list first 2 link titles on hover.

Example indicator (pseudo):

```tsx
const totalLinks = plan.planExercises.reduce(
  (s, pe) => s + (pe.guideLinks?.length ?? 0),
  0
);
{
  totalLinks > 0 && (
    <span title={`${totalLinks} guide links`} className="text-xs ml-2">
      🔗 {totalLinks}
    </span>
  );
}
```

1. DB migration

- Add migration in `src/lib/db` upgrade handler to support version bump (e.g., v4). Migration steps:
  - For each plan in `plans` store, ensure each `planExercise` has `guideLinks` set to `[]` if missing.
  - Use batched iteration to avoid locking UI (requestIdleCallback or setTimeout slices) if dataset may be large; document approach in migration notes.

1. Docs

- Update `.ai/prd.md` to include a short note in the Plan model describing `guideLinks` and the acceptance criteria (editor can add/edit/remove links; plan list shows indicator). Cite the new field in the data model section.
- Update the IndexedDB schema file (see step 2) with explicit migration notes.
- Optionally add a small line to `.cursor/rules/frontend.mdc` if there are UI/UX rules about external links (open external in new tab, rel=noopener, validation).

1. Tests & QA

- Add unit/behavioral smoke tests for:
  - Creating a plan with planExercise.guideLinks and reading it back via `usePlan` / `usePlans`.
  - Saving edits to guide links and ensuring `exerciseIds` unaffected.
  - Migration scenario: simulate older plan object without `guideLinks` and verify migration populates `[]`.
- Manual checks: new inputs in PlanEditor, links open in new tab, PlanRow shows correct counts, save flow persists changes.

1. Linting / Finalization

- Run linter and fix any issues. Update types usage where necessary.
- Update changelog/commit message describing DB version bump and feature.

Todos

- add-types: Add `PlanExerciseGuideLinkDTO` and extend PlanExerciseDTO in `src/types.ts`.
- update-schema-doc: Add `guideLinks` to `.cursor/plans/indexeddb_schema_ef33b4bd.plan.md` and add migration notes (v4).
- db-migration: Implement DB upgrade migration in `src/lib/db` to initialize missing `guideLinks` arrays.
- hooks-update: Ensure `buildPlanToCreate`, `buildPlanUpdate`, and `usePlan` preserve guideLinks.
- ui-editor: Add guide links UI in `src/components/plans/PlanEditor.tsx` and child exercise row/list components (add/edit/remove UI + validation).
- ui-row: Surface compact guide-links indicator in `src/components/plans/PlanRow.tsx`.
- tests: Add unit/integration tests for CRUD and migration.
- docs-update: Update `.ai/prd.md` and frontend rules if needed.
- qa: Manual verification checklist (save, edit, migrate, open links).

Estimated effort: 4–8 hours (schema + migration + UI + tests).
