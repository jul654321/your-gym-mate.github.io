# View Implementation Plan — Plans

## 1. Overview
The Plans view allows users to create, edit, delete, and instantiate workout plans. A plan is an ordered list of planExercises (each with default sets, reps, weight and an optional alternative). Plans persist to IndexedDB and are used to pre-populate sessions.

## 2. View Routing
- Path: `/plans`
- Edit route/modal: `/plans/:planId/edit` (or PlanEditor opened as modal from `/plans`)

## 3. Component Structure
- `PlansPage` (page container / route)
  - `PlanList`
    - `PlanRow` (per-plan)
  - `CreatePlanFAB`
  - `ConfirmDeleteModal` (shared)
  - `PlanEditor` (modal or route)
    - `PlanEditorHeader`
    - `PlanExercisesList`
      - `PlanExerciseRow` (editable exercise selector + defaults + alt selector + drag handle)
    - `PlanEditorFooter` (Save / Cancel / Instantiate CTA)

## 4. Component Details
### PlansPage
- Description: Route container that loads plans and renders list + FAB to create new plan.
- Main elements: header, `PlanList`, `CreatePlanFAB`, error/loading boundaries.
- Handled events: search input change, create new plan click, navigation to edit.
- Validation: none (view only).
- Types: uses `PlanDTO[]` from store, `PlansQueryParams` for filtering.
- Props: none (route-level).

### PlanList
- Description: Displays paginated/sorted list of plans using `usePlans`.
- Main elements: list (ul), `PlanRow` items, load more button or infinite scroll, search input.
- Handled events: filter/query, sort, load more.
- Validation: none.
- Types: `PlanDTO[]`, `PlansQueryParams`.
- Props: optional `pageSize`, `onInstantiateSuccess`.

### PlanRow
- Description: Single plan summary row with actions: Edit, Instantiate, Delete.
- Main elements: plan title, exercise count badge, Instantiate button, overflow menu (Edit/Delete).
- Handled events:
  - Instantiate click → call `useInstantiateSessionFromPlan()`
  - Edit click → open `PlanEditor` (route or modal) with planId
  - Delete click → open `ConfirmDeleteModal`
- Validation / conditions:
  - Disable Instantiate if DB not ready (from `useDbInit()`).
  - Confirm delete before calling `useDeletePlan()`.
- Types: accepts `PlanDTO` as `plan`.
- Props:
  - `plan: PlanDTO`
  - `onEdit(planId)`
  - `onInstantiate(planId)`
  - `onDelete(planId)`

### PlanEditor
- Description: Create/edit form for PlanDTO and its PlanExerciseDTO rows. Supports drag-to-reorder.
- Main elements:
  - Name input (text)
  - PlanExercisesList (ordered)
  - Add Exercise button (opens ExerciseAutocomplete or inline selector)
  - Save / Cancel / Instantiate (when editing existing)
- Handled events:
  - Add exercise (append PlanExercise row with generated id)
  - Remove exercise (confirm optional)
  - Reorder exercises (drag handle)
  - Edit dropdown/inputs for defaultSets/defaultReps/defaultWeight/alt exercise
  - Save → call `useCreatePlan()` or `useUpdatePlan()`
  - Instantiate → call `useInstantiateSessionFromPlan()` with overrides optional
- Validation:
  - `name` required (non-empty, trim)
  - Each `planExercise`:
    - `exerciseId` required
    - `defaultSets` optional but if present must be integer >= 1
    - `defaultReps` optional but if present must be integer >= 0
    - `defaultWeight` optional but if present must be number >= 0
    - `optionalAlternativeExerciseId` nullable; if set must be different from `exerciseId`
  - Prevent save if invalid; show inline errors and focus first invalid field
- Types:
  - Input/VM type: `PlanFormModel` (see Types section)
  - Persist types: `CreatePlanCmd` | `UpdatePlanCmd` (from `src/types.ts`)
- Props:
  - `planId?: UUID` (when editing)
  - `initial?: PlanDTO` (prefill)
  - `onClose()`
  - `onSaved(newPlan: PlanDTO)`

### PlanExerciseRow
- Description: Row UI for editing a PlanExerciseDTO.
- Main elements: exercise selector (autocomplete), inputs for sets/reps/weight, alt exercise selector, drag handle, remove button, optional notes.
- Handled events: exercise selected, defaults changed, alt toggled/selected, remove, reorder.
- Validation:
  - `exercise` required before saving plan
  - `alt` must not equal primary
- Types:
  - `PlanExerciseFormModel`
- Props:
  - `value: PlanExerciseFormModel`
  - `onChange(updated)`
  - `onRemove()`
  - `index: number`
  - `dragHandleProps`

### CreatePlanFAB
- Description: Floating action button that opens `PlanEditor` in "create" mode.
- Main elements: prominent FAB with "+" icon.
- Handled events: click → open `PlanEditor` with empty model.
- Validation: disabled while DB not ready.
- Props: `onCreateClick()`

### ConfirmDeleteModal
- Description: Confirms destructive delete with optional Undo snackbar flow (move to `undo_trash`).
- Main elements: Modal title, message, Confirm, Cancel buttons.
- Handled events: confirm → call `useDeletePlan()`; cancel → close.
- Validation: none.
- Props:
  - `itemName`, `onConfirm`, `onCancel`

## 5. Types
Use existing DTOs from `src/types.ts`. Add the following view-model / form types:

```typescript
// Plan form model used inside PlanEditor UI
type PlanExerciseFormModel = {
  id: UUID; // planExercise id
  exerciseId?: UUID; // selected exercise id (required before save)
  nameSnapshot?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultWeight?: number;
  optionalAlternativeExerciseId?: UUID | null;
  notes?: string;
};

type PlanFormModel = {
  id?: UUID; // undefined for create until saved
  name: string;
  planExercises: PlanExerciseFormModel[]; // ordered
  notes?: string;
};
```

Mapping to persistence:
- CreatePlanCmd (PlanDTO) must include `id`, `createdAt`, `planExercises` and `exerciseIds` = planExercises.map(pe => pe.exerciseId).
- UpdatePlanCmd uses `id` and partial PlanDTO fields; when updating planExercises ensure `exerciseIds` recalculated before write.

## 6. State Management
- Page-level:
  - Query state: `usePlans({ q?, pagination?, sort? })` to fetch list (React Query).
  - Local UI state: search query, sort, pagination cursor, selected planId for edit, showDeleteModal boolean.
- PlanEditor-level:
  - Local form state: `PlanFormModel` held in React local state (useReducer recommended for nested list operations).
  - Validation state: map of field errors for inputs.
  - UI transient state: saving boolean, savingError string.
- Custom hooks:
  - `usePlans()` (existing): list/fetch
  - `usePlan(id)` (existing): fetch single plan when edit begins (prefill)
  - `useCreatePlan()`, `useUpdatePlan()`, `useDeletePlan()`, `useInstantiateSessionFromPlan()` (existing)
  - New small helper: `usePlanFormReducer()` (optional) that exposes actions: addExercise, removeExerciseAt, updateExerciseAt, moveExercise(from,to), setName, validate, to keep editor logic centralized.

## 7. API Integration
Integrate with the existing hooks (these perform IndexedDB writes). Request / response types (from src/types.ts):
- Read plans: usePlans(params: PlansQueryParams) → returns PlanDTO[]
- Read single plan: usePlan(id) → returns PlanDTO | undefined
- Create plan: useCreatePlan().mutate(plan: CreatePlanCmd) → returns PlanDTO (persisted)
  - CreatePlanCmd = PlanDTO (client must generate id and createdAt)
- Update plan: useUpdatePlan().mutate(cmd: UpdatePlanCmd) → returns updated PlanDTO
- Delete plan: useDeletePlan().mutate(cmd: DeletePlanCmd) → returns deleted id
- Instantiate session: useInstantiateSessionFromPlan().mutate(cmd: InstantiateSessionFromPlanCmd) → returns SessionDTO

Frontend actions mapping:
- On Save (create): prepare PlanDTO with id (UUID), createdAt, planExercises (with ids), and exerciseIds derived, then call `useCreatePlan()`. On success invalidate `['plans']` is handled by hook.
- On Save (update): call `useUpdatePlan()` with UpdatePlanCmd (ensuring exerciseIds recalculated); hook invalidates `['plans']`.
- On Delete: call `useDeletePlan({id})`; show Undo via `undo_trash` (optional TODO to add).
- On Instantiate: call `useInstantiateSessionFromPlan({ id: uuid(), planId, overrides? })` then navigate to `/sessions/:id`.

## 8. User Interactions
- Create new plan:
  - User taps FAB → open PlanEditor empty.
  - Add exercises via autocomplete; set defaults; Save enabled when name non-empty and at least one exercise selected (recommended).
  - Save triggers optimistic UI pattern: show saving indicator, close editor on success and refresh list.
- Edit plan:
  - Open editor with prefilled values from `usePlan(planId)`.
  - Reorder exercises via drag handle; update defaults; Save calls update hook.
- Instantiate session:
  - From `PlanRow` or editor footer, user taps Instantiate → call instantiate hook → navigate to new session route on success.
  - If instantiate fails, show toast and keep user on plans list with option to retry.
- Delete plan:
  - Prompt confirm modal; on confirm call delete hook; show Undo snackbar (if undo_trash implemented) and remove item from list optimistically.

## 9. Conditions and Validation
- DB readiness: guard create/update/instantiate actions with `useDbInit().ready === true`. Disable CTAs and show tooltip/disabled state if not ready.
- Field validation:
  - Name: non-empty after trim (show "Name required")
  - Exercise selection per row: exerciseId required (highlight row-level error)
  - Numeric defaults: sets (>=1), reps (>=0), weight (>=0). Enforce numeric keyboard for weight/reps inputs.
  - Alternative exercise cannot equal primary exerciseId.
- Pre-save checks: recalculate `exerciseIds` from planExercises and ensure no duplicate planExercise ids; remove empty placeholder rows or block save until filled.

## 10. Error Handling
- Write errors (DB transaction or quota):
  - On create/update/delete/instantiate failure, show toast with user-friendly message from `dbErrorToUserMessage(err)` and an explicit Retry action.
  - For optimistic failures, rollback to previous list and show inline error near affected item.
- Validation errors: show inline messages and focus the first invalid control.
- Concurrency: single-user app; if update fails due to missing plan (deleted elsewhere), show error "Plan not found" and navigate back to list.
- Delete undo: move deletion to `undo_trash` if available, show Undo snackbar for configured window (8s). If `undo_trash` not implemented for plans, revert deletion via re-create on Undo.

## 11. Implementation Steps
1. Create page & route `src/pages/PlansPage.tsx` that uses `usePlans()` and renders `PlanList` + `CreatePlanFAB`. Add route to router for `/plans`.
2. Implement `PlanList` and `PlanRow` components. Wire `useInstantiateSessionFromPlan()` on Instantiate CTA and `useDeletePlan()` on Delete flow. Add ConfirmDeleteModal.
3. Implement `PlanEditor` component:
   - Build `PlanFormModel` state management (useReducer with actions for nested list ops).
   - Use `usePlan(planId)` to prefill when editing.
   - Implement `ExerciseAutocomplete` (reuse `useExercises()`), `PlanExerciseRow`, numeric inputs and alt selector.
   - Implement drag-to-reorder (use lightweight drag lib or HTML5 Drag API); ensure keyboard accessible reordering.
4. Wire create/update saving flows:
   - On save, validate form; construct `CreatePlanCmd` or `UpdatePlanCmd` ensuring `exerciseIds` computed; call corresponding hook; show optimistic UI and handle onSuccess/onError.
5. Wire instantiate flow from PlanRow & PlanEditor footer:
   - Generate session id and createdAt, call `useInstantiateSessionFromPlan()`, then navigate to `/sessions/:id`.
6. Add accessibility:
   - Ensure all inputs have labels, buttons have aria-labels, drag handles accessible, confirm dialogs announce role=dialog and have focus trap.
7. Add unit / smoke tests:
   - Test PlanEditor validation, PlanList rendering, instantiate path working (mock hooks), delete flow with confirmation.
8. Integrate lints and run `ReadLints` (after edits) to fix any introduced linter issues.
9. UX polish:
   - Add skeleton rows for loading states, empty-state for no plans with CTA to create, toasts for success/errors.
10. Optional: implement Undo via `undo_trash` for plan deletes (transactional) and show RecentDeletes in Settings.

---

Notes / Constraints:
- Use existing hooks (`usePlans`, `useCreatePlan`, `useUpdatePlan`, `useDeletePlan`, `useInstantiateSessionFromPlan`) for data operations; they handle invalidation.
- Persisted types must follow `src/types.ts` DTO shapes (client must generate UUID and createdAt).
- Respect PWA and offline rules: guard actions on `useDbInit().ready` and surface migration/upgrade UI per workspace rules.

