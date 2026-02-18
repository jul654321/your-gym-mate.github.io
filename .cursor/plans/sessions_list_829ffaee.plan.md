---
name: Sessions List
overview: Implementation plan for the Sessions List view (/sessions). Covers components, types, hooks, IndexedDB interactions, validation, error handling, and step-by-step implementation tasks.
todos:
  - id: sessions-page-impl
    content: Implement SessionsPage route, UI skeleton, and DB-ready banner.
    status: pending
  - id: session-list-component
    content: Implement SessionList with cursor pagination and virtualization.
    status: pending
  - id: session-row-component
    content: Implement SessionRow UI, actions (rename, toggle status, delete), and per-row lazy volume compute.
    status: pending
  - id: instantiate-sheet
    content: Implement InstantiateFromPlanSheet and integrate `useInstantiateSessionFromPlan()`.
    status: pending
  - id: create-session-fab
    content: Implement CreateSessionFAB and New Session modal with validation and create flow.
    status: pending
  - id: undo-snackbar
    content: Integrate UndoSnackbar flow for delete and restore using `useUndoTrash()`.
    status: pending
  - id: tests
    content: Add unit & integration tests for create, instantiate, delete+undo, rename, status toggle.
    status: pending
isProject: false
---

# View Implementation Plan — Sessions List

## 1. Overview

Sessions List displays all sessions (active & historical), allows creating new sessions (ad-hoc), instantiating sessions from plans, quick access to active session, and basic session actions (rename, mark active/completed, delete with Undo). It uses the local IndexedDB hooks layer and follows optimistic update patterns.

## 2. View Routing

Path: `/sessions`
Guard: render only when `useDbInit().ready === true`. If `upgrading === true`, show migration banner and disable destructive actions.

## 3. Component Structure

- `SessionsPage` (route container)
  - `DBStatusBanner` (re-usable)
  - `SessionList` (list container)
    - `SessionRow` (per-session item)
  - `InstantiateFromPlanSheet` (sheet/modal to choose plan)
  - `UndoSnackbar` (global/visible on deletes)

## 4. Component Details

### SessionsPage

- Description: Route container for `/sessions`. Loads sessions via `useSessions()` and supplies state/handlers to child components.
- Main elements: page header, `SessionList`.
- Handled interactions: apply filters (date range, status), navigate to session detail (`/sessions/:id`), open instantiate sheet, show DB status.
- Validation: no input validation besides ensuring date range is valid (from <= to).
- Types used: `Session`, `SessionListQueryParams`.
- Props: none (route container).

### SessionList

- Description: Renders paginated list of sessions using cursor-based pagination from `useSessions(params)`.
- Elements: list container, “Load more” button, empty state.
- Events: fetch next page, row selection (navigate), row actions (rename, status toggle, delete).
- Validation: none intrinsic.
- Props: `{ params: SessionListQueryParams }`.

### SessionRow

- Description: Displays session metadata: name, date, status badge, volume (lazy), set count, source plan indicator, and contextual actions (rename, mark active/completed, delete, instantiate link to plan).
- Elements: main tappable row, action menu (three-dot): Rename, Toggle Status, Delete, View.
- Events handled:
  - onTap: navigate to `/sessions/:id`
  - onRename: open inline rename input or modal -> call `useUpdateSession()`
  - onToggleStatus: call `useUpdateSession()` to set active/completed
  - onDelete: call `useDeleteSession()` which moves session and its loggedSets to `undo_trash` inside a transaction; show `UndoSnackbar`.
- Validation:
  - Rename: non-empty, length <= 100
  - Status toggle: allowed unless `useDbInit().upgrading === true` (guard)
- Types: `Session`, `SessionSummaryVM` (ViewModel with calculated fields: volume, setCount)
- Props: `{ session: Session, onRename?: (id, name) => void, onToggleStatus?: (id,status) => void, onDelete?: (id) => void }`.

### InstantiateFromPlanSheet

- Description: Sheet/modal listing plans (`usePlans()`), with Instantiate CTA per plan.
- Elements: search, plan rows, instantiate CTA.
- Events: onInstantiate(planId) -> call `useInstantiateSessionFromPlan(planId)` inside a transaction and then navigate to new session.
- Validation: ensure selected plan exists; if instantiate fails, show error toast and keep modal open.
- Props: `{ onClose?: () => void }`.

### UndoSnackbar

- Description: Global snackbar for undoing deletes. Called after delete; shows Undo button for configured undoWindow.
- Events: onUndo -> `useRestoreFromTrash()` called with saved payload id(s).
- Props: integrated globally but controlled via context/hooks.

## 5. Types

- DTOs (persisted shapes — match IndexedDB stores):
  - `Session` {
    id: string;
    name: string;
    date: string; // ISO
    sourcePlanId?: string | null;
    status: 'active' | 'completed' | 'planned';
    createdAt: string;
    updatedAt?: string;
    }
  - `LoggedSet` {
    id: string;
    sessionId: string;
    exerciseId: string;
    timestamp: string;
    weight: number; // numeric base value
    weightUnit: 'kg'|'lb';
    reps: number;
    setIndex: number;
    alternative?: { exerciseId: string; weight: number; weightUnit: 'kg'|'lb'; reps: number } | null;
    notes?: string;
    }
- ViewModels:
  - `SessionSummaryVM` {
    id: string;
    name: string;
    date: string;
    status: Session['status'];
    setCount: number; // computed
    volume: number; // computed, sum weightreps across sets in session
    sourcePlanId?: string|null;
    }
- Query params:
  - `SessionListQueryParams` { status?: 'all'|'active'|'completed'; from?: string; to?: string; q?: string; pageSize?: number; cursor?: string }

## 6. State Management

- Local component state in `SessionsPage` for filters (debounced) and UI state (sheet open, rename modal id, deletingId).
- Global/DB state via hooks: `useSessions(params)` returns paginated data and `fetchNext()`.
- Use React Query keys: `['sessions', params]` and `['sessions','summary',sessionId]` for per-row volume.
- Custom hook: `useSessionListLogic(params)` that consolidates filter state, pagination, and handlers (rename, toggleStatus, delete) and abstracts `useDbInit()` guard checks.

## 7. Hooks and IndexedDB integration (request/response types)

- Read hooks:
  - `useSessions(params: SessionListQueryParams)` -> { data: Session[], nextCursor?: string, loading, error, fetchNext }
  - `usePlans()` -> { data: Plan[], loading, error }
- Write hooks:
  - `useCreateSession()` -> mutate(payload: Partial) => returns created Session
    - Request type: `SessionCreateDTO` { name: string; date?: string; sourcePlanId?: string|null }
    - Response type: `Session` (persisted)
  - `useInstantiateSessionFromPlan()` -> mutate(planId) => Response: created `Session` (with pre-populated session exercises stored in `sessions` and associated plan snapshot stored/denormalized)
  - `useUpdateSession()` -> mutate({ id, patch }) => Response: updated `Session`
  - `useDeleteSession()` -> mutate({ id }) => Response: moved to `undo_trash` record id
  - `useRestoreFromTrash()` -> mutate(undoId) => Response: restored session object
- Verification conditions:
  - `createSession` must write to `sessions` store and generate `id` and `createdAt`.
  - `instantiateSessionFromPlan` reads `plans` and `planExercises`, constructs session snapshot, writes session and (optionally) initial `loggedSets` entries with default values (but per PRD initial sets are populated but not logged — so create sessionExercises snapshot only, not loggedSets).

## 8. User Stories Mapping (to implementation)

- US-004 Instantiate a session from a plan
  - UI: `InstantiateFromPlanSheet` -> call `useInstantiateSessionFromPlan(planId)` -> create session (denormalized exercises) -> navigate to `/sessions/:id`.
  - Ensure acceptance criteria: new session shows exercises with defaults (display in Session Detail); session saved locally and listed in sessions (invalidate `['sessions']`).
- US-006 Start/mark active/completed
  - UI: `SessionRow` status toggle -> `useUpdateSession()` -> update `status` and invalidate list.
- US-017 Edit/delete sessions
  - Edit: inline rename flow calling `useUpdateSession()`.
  - Delete: call `useDeleteSession()` -> transaction to move `loggedSets` -> `undo_trash`, show `UndoSnackbar`.

## 9. User Interactions & Expected Outcomes

- Tap session row: navigate to `/sessions/:id` showing session detail.
- Tap FAB → choose New Session: opens NewSession modal -> user enters name -> create -> optimistic row added and navigate to new session.
- Tap FAB → Start from Plan: open plan sheet -> pick plan -> instantiate -> navigate.
- Rename: show inline edit, validate non-empty, call update → update reflected in list immediately (optimistic).
- Toggle status: instantly update UI, persist to DB.
- Delete: confirm modal, then call delete -> UI removes row and shows UndoSnackbar; Undo restores.
- Load more: fetchNext appended to list; preserve scroll.

## 10. Conditions required by the API & component-level verification

- DB-ready: `useDbInit().ready === true` before enabling create/delete.
- Transaction semantics: `useDeleteSession()` must atomically move session and its loggedSets to `undo_trash` — component should show temporary disabled state while mutation pending.
- Instantiate: `useInstantiateSessionFromPlan()` must read plan snapshot; verify `plan.id` exists and plan has at least one exercise; on missing -> error toast.
- Verify session persisted by refetching `['sessions']` or relying on optimistic response id.

## 11. Error Scenarios & Handling

- DB not ready / migration in progress: show migration banner and disable destructive actions; provide Retry.
- Quota error on create: show friendly `dbErrorToUserMessage` with options: retry or export/clear.
- Instantiate failure: keep modal open, show inline error with Retry.
- Delete failure: show snackbar with Rollback option, re-add row in UI on failure.
- Partial failure (some loggedSets move fail): surface error and allow manual recovery via Settings -> RecentDeletes.

## 12. Implementation Risks & Mitigations

- Large session lists causing UI jank: use cursor-based pagination and virtualization (e.g., react-window). Lazy compute volumes.
- Race between optimistic update and background invalidation: ensure mutation responses update cache keys and use stable ids (temp id -> replace).
- Undo persistence across restarts: ensure `undo_trash.expiresAt` checked on `useDbInit` and scheduled cleanup persists.
- Accessibility: ensure row actions are keyboard operable and labeled; test with VoiceOver and iOS Safari.

## Implementation-breakdown Conclusion

This view primarily composes existing hooks (`useSessions`, `usePlans`, `useCreateSession`, `useInstantiateSessionFromPlan`, `useUpdateSession`, `useDeleteSession`, `useRestoreFromTrash`) and components (`FilterBar`, `UndoSnackbar`). Most complexity is in transactions for delete/instantiate and correct optimistic patterns. The plan below details concrete components, types, state, validations, and step-by-step implementation tasks.
