---
name: Logged Set View
overview: Implementation plan for the Logged Set extension (Session Detail) to display, edit, copy, and manage logged sets within a session. Includes types, components, state, IndexedDB hook integration, validation, error handling, and implementation steps.
todos:
  - id: logged-set-1
    content: Create `LoggedSetsList` component and tests
    status: pending
  - id: logged-set-2
    content: Update `LoggedSetRow` to support toggle semantics & guide links
    status: pending
  - id: logged-set-3
    content: Wire `SessionView` to pass viewmodel `actions` and `isMutating` down
    status: pending
  - id: logged-set-4
    content: Ensure `EditSetModal` validations & integrate updateSet
    status: pending
  - id: logged-set-5
    content: Integrate UndoSnackbar with deleteSet
    status: pending
  - id: logged-set-6
    content: Add unit & integration tests for flows
    status: pending
  - id: logged-set-7
    content: Update types in `src/types.ts` (LoggedSetDTO/CreateLoggedSetCmd) and export comments
    status: pending
  - id: logged-set-8
    content: Update `.ai/prd.md` and `.ai/ui-plan.md` (proposed change summary included in implementation plan)
    status: pending
isProject: false
---

# View Implementation Plan — Logged Set

## 1. Overview

A focused extension to the Session Detail view that presents each logged set, grouped by exercise, and supports toggling completion, editing, copying, deleting (with undo), and viewing auxiliary plan guidance. The view must integrate with the existing hooks-based IndexedDB layer, follow optimistic update patterns, support alternatives, and remain mobile-first and accessible.

## 2. View Routing

Path: `/sessions/:sessionId` (existing session detail route). Logged set UI lives inside the Session Detail view as grouped list rows and will also be used by modals (QuickAdd and EditSet).

## 3. Component Structure

- SessionView (existing) — parent container; uses `useSessionViewModel`.
  - SessionHeader (existing) — name/status controls.
  - SessionTotalsBar (existing) — totals display.
  - LoggedSetsList — groups exercises and renders exercise headers + list of `LoggedSetRow`.
    - LoggedSetRow — single row (existing file to extend/test: `src/components/sessionDetail/LoggedSetRow.tsx`).
  - EditSetModal — edit modal (existing).
  - QuickAddModal — quick add modal (existing).
  - ConfirmDeleteModal — shared modal for delete confirmation (existing).
  - UndoSnackbar — global component for undo actions (existing shared component).

## 4. Component Details

### LoggedSetsList

- Description: Renders `groupedExercises` from `useSessionViewModel()`; for each group shows exercise header and maps `sets` to `LoggedSetRow` components. Supports infinite scroll / pagination and an "Add Set" CTA per exercise.
- Main elements: exercise header (name + count + guide link count), list of `LoggedSetRow` components, "Add Set" button.
- Events handled: addSet(exerciseId), onCopy(setId), onEdit(setId), onDelete(setId), toggleSetStatus(setId).
- Validation: addSet requires sessionId present; disable add button if session missing or isMutating.
- Types used: `GroupedExerciseVM`, `LoggedSetDTO`.
- Props: `groupedExercises: GroupedExerciseVM[]`, `isMutating: boolean`, `actions: SessionViewModel['actions']`.

### LoggedSetRow (file: `src/components/sessionDetail/LoggedSetRow.tsx`)

- Description: Visual row for a single LoggedSet. Shows primary set details (type, weight+unit, reps), alternative snapshot (if present), action buttons (toggle completion, copy, edit, delete, guide links), and delete confirmation.
- Main elements: Card wrapper, primary text, alt pill, icon buttons (Check, Copy, Pencil, Trash, Book if guide links exist), ConfirmDeleteModal.
- Events handled:
  - Toggle status: `toggleStatus(set.id)` — should call `actions.toggleSetStatus` (optimistic update to set.status = 'completed').
  - Copy: `actions.copySet` (create new set using last values)
  - Edit: open `EditSetModal` with set payload
  - Delete: show `ConfirmDeleteModal`, on confirm call `actions.deleteSet` (moves to undo_trash by hook)
  - Guide link: open plan exercise guide links sheet
- Validation conditions:
  - Buttons disabled when `isBusy` (global mutation pending) or session missing
  - Weight: display fallback `0` for missing numeric values; units default to user setting (via `useSettings('weightUnit')` or DEFAULT_WEIGHT_UNIT)
- Types: `LoggedSetDTO` for `set` prop, callbacks typed as `(id: string) => void` or `(id, set) => void` for edit.
- Props interface in code exists and is adequate; ensure `isBusy` prop passed from parent `isMutating` state.

### EditSetModal

- Description: Modal form allowing editing of weight, reps, weight unit, setType, and alternative (exerciseId/nameSnapshot, weight, reps). On save calls `actions.updateSet`.
- Main elements: numeric inputs for weight & reps (primary + alternative), weight unit selector, save/cancel buttons, inline validation messages, accessible labels.
- Events: onSave -> validate -> `updateSet(setId, updatedSet)`; onCancel -> close modal.
- Validation conditions:
  - Weight >= 0 (float allowed)
  - Reps >= 1 (integer)
  - If alternative present, ensure alternative.reps >= 1 and alternative.weight >= 0
  - setType ∈ {"main","warmup","drop","accessory"} (enforce allowed set types in UI)
- Props: `open: boolean`, `onClose: () => void`, `set: LoggedSetDTO`, `onSave: (id, set) => void`.

### ConfirmDeleteModal

- Description: existing generic modal that confirms deletion and shows `isDeleting` state. On confirm, call provided `onConfirm`.
- Events: onConfirm triggers `actions.deleteSet`.

## 5. Types

Define required DTOs and view models (merge with existing `src/types.ts`). Use precise fields below — align with existing hooks that consume these shapes.

### LoggedSetDTO

- id: string (UUID)
- sessionId: string
- exerciseId: string
- exerciseNameSnapshot?: string
- status?: 'pending' | 'completed' | 'skipped'
- weight?: number
- weightUnit?: 'kg' | 'lb'
- reps?: number
- setType?: string (e.g., 'main' | 'warmup' | 'accessory')
- timestamp?: number (ms since epoch)
- createdAt?: number
- setIndex?: number (0-based order index)
- orderIndex?: number (optional numeric ordering from plan/session hints)
- exerciseIds?: string[] (multi-entry index for aggregates including alternatives)
- alternative?: {
  exerciseId: string;
  nameSnapshot?: string;
  weight?: number;
  reps?: number;
  }
- notes?: string

### CreateLoggedSetCmd (request payload)

Same as LoggedSetDTO but fields required for creation:

- id: string (generated client-side)
- sessionId: string
- exerciseId: string
- status: 'pending' | 'completed'
- weight: number
- weightUnit: 'kg'|'lb'
- reps: number
- setType: string
- timestamp: number
- createdAt: number
- exerciseIds?: string[]
- alternative?: { exerciseId: string; nameSnapshot?: string; weight?: number; reps?: number }

### GroupedExerciseVM (ViewModel)

- exerciseId: string
- exerciseName: string
- sets: LoggedSetDTO[]

### SessionViewModel (from hook)

- session?: SessionDTO | null
- groupedExercises: GroupedExerciseVM[]
- totals: { totalVolume: number; totalSets: number }
- isLoading: boolean
- isSessionMissing: boolean
- isMutating: boolean
- isLoadingSets: boolean
- actions: { renameSession, toggleStatus, toggleSetStatus, deleteSession, addSet, copySet, deleteSet, updateSet }

## 6. State Management

- Source of truth: IndexedDB via hooks (useLoggedSets, useCreateLoggedSet, useUpdateLoggedSet, useDeleteLoggedSet). UI must not duplicate persistent state; only local ephemeral UI state allowed (modal open flags, showDeleteModal per row, optimistic markers if desired).
- Local component state:
  - LoggedSetRow: showDeleteModal: boolean
  - EditSetModal: local form state for edited fields + local validation errors
  - LoggedSetsList: optional local pagination cursor/state for infinite scroll
- Global state handled by `useSessionViewModel`:
  - accumulatedSets: LoggedSetDTO[] (keeps current sets)
  - groupedExercises: derived groups
  - isMutating / isLoading flags
- Custom hooks required: none new — reuse `useSessionViewModel` and the existing CRUD hooks. Optionally add `useConfirmDelete` or `useUndo` helper if not present.

## 7. Hooks Integration & IndexedDB Request/Response Types

Use existing hooks with these interfaces:

- useLoggedSets({ sessionId, sort:'timestamp' }): returns { data: LoggedSetDTO[] }
- useCreateLoggedSet(): mutate(payload: CreateLoggedSetCmd)
- useUpdateLoggedSet(): mutate(payload: Partial & { id: string })
- useDeleteLoggedSet(): mutate({ id: string }) — should move record into `undo_trash` store with expiresAt for Undo

Requests/Responses (concrete):

- Create Logged Set: Request = CreateLoggedSetCmd (above). Response = Saved LoggedSetDTO (same shape, may include server-assigned fields if any; for local only, echo request)
- Update Logged Set: Request = Partial & { id }. Response = Updated LoggedSetDTO.
- Delete Logged Set: Request = { id }. Response = success void or deleted id; underlying hook should place object into `undo_trash`.

Integration notes:

- All mutations should be invoked through the SessionViewModel actions: `actions.addSet`, `actions.copySet`, `actions.updateSet`, `actions.deleteSet`, `actions.toggleSetStatus`.
- Parent view (`SessionView`) passes `actions` and `isMutating` down as props to `LoggedSetsList` and from there into `LoggedSetRow`.

## 8. User Interactions

- Toggle completion: tapping Check toggles status to 'completed' (via `updateLoggedSet({ id, status:'completed' })`) — show optimistic UI (button state updates immediately). If toggle should also allow toggling back to pending, implement toggle behaviour: if completed → set pending.
- Copy set: creates a new set with identical fields (new id + timestamp/createdAt); call `createLoggedSet` with payload derived from source set (use `actions.copySet`).
- Edit set: opens `EditSetModal` prefilled; on save call `updateSet` with merged DTO.
- Delete set: show confirm modal -> onConfirm call `deleteSet` (moves to undo trash) and show UndoSnackbar; Undo calls `useRestoreFromTrash`.
- View guide links: if a plan exercise has guideLinks, show Book button that opens guide modal or external links.
- Add set: per-exercise Add button triggers `actions.addSet(exerciseId)` which creates a new default set (weight 0, reps 1) optimistically.

## 9. Conditions and Validation

Interface-level validations (client-side before calling hooks):

- sessionId existence: any create/update/delete must verify sessionId present; otherwise, disable actions or prompt create/select session.
- Weight: must be numeric >= 0 (float). Empty input treated as 0 if user accepts quick-add default.
- Reps: integer >= 1
- WeightUnit: must be in allowed enum (`kg` | `lb`) — default to user setting or `DEFAULT_WEIGHT_UNIT`.
- Alternative: if any alt fields provided, validate both alt.weight >= 0 and alt.reps >= 1.
- SetType: restrict to allowed set types; fallback to 'main'.
- IDs: creation requires a unique id — use `crypto.randomUUID()`; UI should show temporary placeholder while persisting.

API-level conditions (hooks ensure):

- Mutations require `sessionId` to be present.
- Updates require `id` present and correspond to an existing logged set (hook should reject if not found).

Component-level verification:

- LoggedSetRow buttons disabled when `isMutating` or when `set` is marked pending deletion (optimistic delete state).

## 10. Error Handling

- Mutation failure (create/update/delete): rollback optimistic change and show global toast with Retry and Dismiss actions. For delete, restore via Undo.
- Transaction abort / quota exceeded: map to friendly message via `dbErrorToUserMessage`. Present Retry and Export (for quota) guidance.
- Missing session: show inline error and CTA to create session before logging (Quick Add handles creating ad-hoc session transactionally).
- Edit conflicts: if update fails due to stale record, show dialog explaining record changed elsewhere and offer to reload and re-open edit.
- Undo handling: implement `undo_trash` store and UndoSnackbar; ensure scheduled cleanup is robust across restarts (checked on `useDbInit`).

## 11. Implementation Steps

1. Review `useSessionViewModel` and confirm `actions` API (already exposes: addSet/copySet/updateSet/deleteSet/toggleSetStatus). Use it as single integration surface.
2. Confirm `LoggedSetDTO` shape in `src/types.ts`. If missing fields exist (alt, exerciseIds, setIndex) extend `types.ts` and add field comments. (Note: do not commit now — this is step in implementation.)
3. Update `LoggedSetRow.tsx` to:

- Ensure `isBusy` prop is passed and properly tied to `isMutating`.
- Add accessible labels to buttons (already present), ensure Book button opens guide links modal.
- Ensure that toggle completes toggles between 'pending' and 'completed' (adjust `toggleStatus` semantics if needed).

1. Implement `LoggedSetsList` component (if not present): renders grouped exercise headers + `LoggedSetRow` children, passes down `isMutating` and `actions` from `useSessionViewModel`.
2. Wire `SessionView` to render `LoggedSetsList` using `const vm = useSessionViewModel(sessionId)` and pass `vm.groupedExercises`, `vm.totals`, `vm.isMutating`, and `vm.actions`.
3. Ensure `EditSetModal` form fields follow validation rules; on save call `actions.updateSet` with merged DTO and close modal on success.
4. Ensure `addSet` and `copySet` use `crypto.randomUUID()` and follow payload shape described in `useSessionViewModel`; confirm optimistic UI behavior via the hooks.
5. Add UndoSnackbar integration: when a deleteSet mutation is invoked, show an Undo snackbar with 8s timer. Use `useUndoTrash()` or `useRestoreFromTrash()` hook for undo.
6. Add unit tests (jest/RTL) for LoggedSetRow interactions: toggle status, copy, edit open, delete confirm shows modal, delete triggers undo snackbar.
7. Add e2e test / manual checklist to validate: create set, edit set, copy set, delete set & undo, alt set display, guide links open, totals update.
8. Accessibility review: ensure tap targets 44–48px, aria-labels exist, modal focus trap works.
9. Lint and run `ReadLints` and fix any linter errors; ensure type declarations exported from `src/types.ts` are updated.
10. Document changes: add small section in `.ai/ui-plan.md` and `.ai/prd.md` indicating Logged Set extension details and acceptance criteria (proposed edits captured in plan). (Note: files not modified until plan accepted.)

## Todos

- logged-set-1: Create `LoggedSetsList` component and tests
- logged-set-2: Update `LoggedSetRow` to support full toggle semantics & guide links
- logged-set-3: Wire `SessionView` to pass viewmodel `actions` and `isMutating` down
- logged-set-4: Ensure EditSetModal validations & integrate updateSet
- logged-set-5: Integrate UndoSnackbar with deleteSet
- logged-set-6: Add unit & integration tests for flows
- logged-set-7: Update types in `src/types.ts` (LoggedSetDTO/CreateLoggedSetCmd) and export comments
- logged-set-8: Update `.ai/prd.md` and `.ai/ui-plan.md` (proposed change summary included in implementation plan)
