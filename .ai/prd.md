# Product Requirements Document (PRD) - Your Gym Mate

## 1. Product Overview

Project name: Your Gym Mate

Purpose: A lightweight personal Progressive Web App (PWA) for tracking gym workouts and lifts. The MVP focuses on fast manual logging of sets (exercise, weight, reps), support for specifying an alternative exercise per logged set, and a minimal statistics dashboard for tracking progress over time.

Target platform: Mobile-first PWA optimized for iOS (installable to homescreen). Single-user (local device) app with no accounts or cloud sync at MVP launch.

Timeline & team: 2-week MVP implementation by a single full-stack developer.

Key flows in MVP:

- Workout plan creator (create/edit plans composed of exercises with defaults)
- Workout plan session creator (instantiate sessions from plans or create ad-hoc sessions)
- Workout plan session log (log sets, including optional alternative exercise)
- Statistics dashboard (filterable aggregates and PRs)

## 2. User Problem

Primary problem: Individuals who lift weights want a simple, fast, private way to record their workouts and track progress (weights, reps, volume, PRs) without the friction of bulky apps, accounts, or integrations.

User needs:

- Minimal friction logging — add a set quickly during a workout.
- Ability to track alternatives (machine vs free weight) when an exercise differs from plan.
- Persistent local storage so exercise history survives app restarts.
- Lightweight insights (PRs, total volume) and filters to observe progress over time.

Primary personas:

- Persona A — Beginner: wants simple defaults and minimal setup; cares about logging quickly and seeing basic progress.
- Persona B — Experienced lifter: wants accurate set-level data, PR tracking, and filters by exercise/date for analysis.

-## 3. Functional Requirements

Data model (minimal, extensible):

- Exercise: id, name, optional metadata (category, equipment)
- Plan: id, name, optional `weekday` (0=Sun..6=Sat) plus list of planExercise {exerciseId, defaultSets, defaultReps, defaultWeight, optionalAlternativeExerciseId, notes}; `weekday` documents the scheduled day without creating sessions. Each plan may also include an optional `workoutType` (Cardio | HighIntensity | Strength) to categorize the training style; sessions instantiated from a plan should inherit that type so filters and analytics can use it.
- Session: id, name, date/time, sourcePlanId (nullable), workoutType? (copied from the source plan), list of loggedSetIds, status (active/completed)
- LoggedSet: id, sessionId, exerciseId (primary), timestamp, weight (number + unit), reps (integer), setIndex (order), alternative (nullable object: {exerciseId, weight, reps}), notes
- PR / Aggregates computed from LoggedSet data (not stored as single source of truth)

Persistence:

- Local-only persistence for MVP (IndexedDB preferred for structured data and larger capacity; fallback/localStorage for small datasets optional).
- Data must survive app close/restart and be available offline.
- Optional: manual export/import (CSV) flagged as deferred/optional per unresolved questions.

Core CRUD:

- Plans: create, read/list, update, delete
- Sessions: create (from plan or ad-hoc), read/list, update (rename, status), delete
- Logged sets: create, edit, delete; support multiple sets per exercise in a session

Logging UX:

- Fast add flow: from active session, tap exercise → quick modal to enter weight + reps + optional alternative → save. Aim: time-to-log < 20s (target).
- Re-use last set values per exercise as shortcuts (UX convenience).
- Support editing of previously logged sets.

Statistics dashboard:

- Filters: exercise (single/multi), date range (preset: 7d/30d/90d/all; custom), min/max weight, min/max reps.
- Aggregations: total volume (sum weight \* reps), PR (max weight for given rep range or rep-for-weight — define formula), total sets, average weight, sessions count.
- Visuals: simple line chart for trend (weight or volume over time) and table of recent PRs/values. Chart types: line for trend, bar for per-session volume (defaults).
- Alternatives handling: allow toggling whether alternatives are included in exercise aggregates (default: include if alternative.exerciseId equals selected exercise; otherwise treat as separate).

PWA specifics:

- Web App Manifest and Service Worker to enable Add to Homescreen (iOS-optimized); ensure responsive mobile-first UI and touch-friendly controls.
- Offline behavior: read/write to IndexedDB while offline; queue UI actions if any background sync planned (deferred).

Security & privacy:

- Single-user local app; no external accounts or cloud storage in MVP.
- Optional local access control story included (device passcode/biometric gating or simple app PIN) — implementation deferred but story included for traceability.

Analytics & instrumentation:

- Minimal local event logging to measure time-to-log and basic usage for personal testing. No external analytics by default in MVP.

## 4. Product Boundaries

In scope (MVP):

- Set-level manual logging of exercise, weight, reps (with optional alternative exercise per set).
- Plan creation and basic defaults for exercises.
- Instantiate sessions from plans and ad-hoc sessions.
- Persistent local-only storage (IndexedDB/localStorage).
- Statistics dashboard with filtering and simple visualizations (line/bar).
- PWA installability and iOS compatibility considerations.
- Basic CRUD for plans, sessions, sets; editing and deletion.

Out of scope (deferred):

- Cloud sync, multi-device sync, user accounts, social features, coaching features.
- Integrations with Apple Health, wearables, or gym equipment.
- Advanced analytics benchmarks, automated workout suggestions, or AI-driven insights.
- Paid features, in-app purchases or monetization.
- Background sync and push notifications (iOS service worker limitations).
- Extensive export/import beyond a simple CSV export (flagged for decision).

Non-functional constraints:

- Deliverable within 2 weeks by one developer.
- App must be responsive and optimized for common iOS Safari constraints (service worker limitations, no background sync).
- Keep architecture modular to allow later addition of sync/integrations.

## 5. User Stories

All user stories below include ID, Title, Description, and Acceptance Criteria. Stories are testable and traceable.

US-001

- Title: Create a workout plan
- Description: As the user, I can create a workout plan with a name and add exercises with default sets, reps, weight, and an optional alternative exercise.
- Acceptance Criteria:

1.  User can create a plan with a name.
2.  User can add multiple exercises to the plan.
3.  Each exercise row accepts name, default sets, reps, weight
4.  Alternative exercise (related to the given exercise) field that also accepts name, default sets, reps, weight.
5.  Plan is saved locally and appears in the plans list.

US-002

- Title: Edit a workout plan
- Description: As the user, I can edit a saved plan to update name, exercises, and default values.
- Acceptance Criteria:

1.  User can open a plan, change name and exercise defaults, add/remove exercises.
2.  Changes persist locally and reflect in subsequent session instantiations.

US-003

- Title: Delete a workout plan
- Description: As the user, I can delete a plan I no longer need.
- Acceptance Criteria:

1.  Deletion prompts confirmation.
2.  Plan removed from local storage and disappear from plans list.
3.  Deleting a plan does not delete sessions already created from it (sessions remain).

US-004

- Title: Instantiate a session from a plan
- Description: As the user, I can start a session from a plan; the session is pre-populated with exercises and default values.
- Acceptance Criteria:

1.  User selects a plan and creates a session from it.
2.  The new session shows exercises, default sets/reps/weight populated but not yet logged.
3.  Session is saved (automatic and manually) locally and listed in sessions.

US-005

- Title: Create an ad-hoc session
- Description: As the user, I can create a session not based on a plan (ad-hoc) and add exercises manually.
- Acceptance Criteria:

1.  User creates a session via "New Session".
2.  User can add exercises within the session.
3.  Session appears in sessions list and can be used for logging.

US-006

- Title: Start and mark session as active/completed
- Description: As the user, I can mark a session active when starting and completed when finished.
- Acceptance Criteria:

1.  Sessions have status (active/completed).
2.  The UI shows the session's status and filtering/sorting can use it.

US-007

- Title: Log a set for an exercise
- Description: As the user, I can log a set for an exercise with weight, reps, and timestamp.
- Acceptance Criteria:

1.  User can select an exercise in an active session and enter weight and reps.
2.  The logged set is saved (automatic and manually) and visible in session history immediately.
3.  Multiple sets for same exercise are supported and ordered by setIndex/timestamp.

US-008

- Title: Log a set with an alternative exercise
- Description: As the user, I can log a set and optionally record an alternative exercise (with its own reps/weight).
- Acceptance Criteria:

1.  UI provides an optional "alternative" input when logging a set.
2.  LoggedSet contains alternative object saved alongside primary set.
3.  Both primary and alternative details are visible in session history entry.

US-009

- Title: Edit a logged set
- Description: As the user, I can edit weight, reps, or alternative for any previously logged set.
- Acceptance Criteria:

1.  Tapping an existing set opens edit modal.
2.  Updates are persisted locally and reflected in aggregates.

US-010

- Title: Delete a logged set
- Description: As the user, I can delete any logged set from a session.
- Acceptance Criteria:

1.  Deletion asks for confirmation.
2.  Upon confirmation, set is removed and aggregates update accordingly.

US-011

- Title: View a session history
- Description: As the user, I can view chronological sets logged in a session including alternatives.
- Acceptance Criteria:

1.  Session view lists sets in order with weight, reps, and alternative if present.
2.  Timestamps and set indices are visible for each set.

US-012

- Title: Quick log shortcut (reuse last set)
- Description: As the user, I can reuse the previous logged set's weight/reps as a shortcut when adding the next set for the same exercise.
- Acceptance Criteria:

1.  When starting to log a set, the UI automatically pre-fills with last recorded values for that exercise.

US-013

- Title: View statistics dashboard
- Description: As the user, I can open a dashboard showing metrics and charts for my logged data.
- Acceptance Criteria:

1.  Dashboard shows filters and default visualizations (line chart for weight/volume trend, table of PRs).
2.  Dashboard loads aggregated values from local data.

US-014

- Title: Filter dashboard by exercise and date range
- Description: As the user, I can filter dashboard data by exercise, date ranges, min/max weight, and reps.
- Acceptance Criteria:

1.  Filters apply immediately and update charts/tables.
2.  Preset date ranges available: 7d, 30d, 90d, All plus custom range.

US-015

- Title: PR calculation
- Description: As the user, the app calculates Personal Records (PRs) per exercise based on the logged sets.
- Acceptance Criteria:

1.  A PR is defined as the highest logged weight for a given exercise for any set.
2.  Dashboard lists PR per exercise and date when achieved.
3.  Edge cases: if alternative was used and maps to same exercise, inclusion depends on toggle—default include.

US-016

- Title: Aggregate volume calculation
- Description: As the user, the dashboard computes total volume per exercise or per session as sum(weight \* reps) across sets.
- Acceptance Criteria:

1.  Volume calculation matches raw data: volume = Σ(weight \* reps) for included sets.
2.  Aggregates reflect filters and update when sets edited/deleted.

US-017

- Title: Edit or delete sessions
- Description: As the user, I can rename, edit contents (add/remove exercises), or delete a session.
- Acceptance Criteria:

1.  Session edit flow allows renaming and modifying exercises.
2.  Deleting a session prompts confirmation and removes its logged sets.

US-018

- Title: Export data (optional, deferred)
- Description: As the user, I can export logged data as CSV for backup or external analysis.
- Acceptance Criteria:

1.  Export generates a CSV file of sessions and sets (exercise, date, weight, reps, alternative).
2.  Export is accessible via device share/save. (If unable due to time, mark as deferred.)

US-019

- Title: Local backup / import (deferred)
- Description: As the user, I can import a previously exported CSV to restore data.
- Acceptance Criteria:

1.  Import validates file schema and prompts about duplicates/overwrite.
2.  Imported data appears in local storage. (Deferred if insufficient time.)

US-020

- Title: App-level local access control (authentication)
- Description: As the user, I can enable optional local access control (PIN or biometric) to restrict access to the app on my device.
- Acceptance Criteria:

1.  Option to enable/disable local access control in Settings.
2.  When enabled, the app requests PIN/biometric on launch or resume per user-configured timeout.
3.  Settings stored locally; if device biometric not supported, fallback to PIN.

US-021

- Title: App settings and preferences
- Description: As the user, I can access settings to configure units (kg/lb), default number formats, and dashboard defaults.
- Acceptance Criteria:

1.  User can change weight unit and default settings.
2.  Settings persist locally and affect UI and calculations.

US-022

- Title: Handle edge cases for alternatives
- Description: As the user, alternative exercise entries are stored and represented consistently for aggregates and session history.
- Acceptance Criteria:

1.  If alternative.exerciseId is present, it is shown and stored as distinct object.
2.  Aggregation toggles allow including/excluding alternative sets when filtering by exercise.

US-023

- Title: Undo last delete (short window)
- Description: As the user, I can undo a recent deletion of a set/session within a short timeframe (e.g., via snackbar "Undo").
- Acceptance Criteria:

1.  After delete, show undo option for 5–10 seconds.
2.  Selecting undo restores the deleted item and updates aggregates.

US-024

- Title: Offline reliability
- Description: As the user, all core CRUD operations work without network and persist locally.
- Acceptance Criteria:

1.  Create/read/update/delete operate when device has no network.
2.  Data persists across app reloads and device restarts.

US-025

- Title: Accessibility and basic UX constraints
- Description: As the user, the app meets basic accessibility practices (tap target sizes, readable contrast, and labels).
- Acceptance Criteria:

1.  Buttons meet minimum touch target size.
2.  Inputs have accessible labels and high-contrast text.

## 6. Success Metrics

Delivery & quality:

- Delivered within 2 weeks and fully functional for the four main flows (plan creator, session creator, session log including alternatives, dashboard).
- No critical bugs blocking logging or persistence.

Behavioral KPIs (personal testing oriented):

- Time-to-log-target: median time to log a set < 20 seconds (measured by local event logging during personal testing).
- Weekly usage: personal target of 3 sessions/week during the initial 1-week adoption test.
- Data reliability: 0% data loss in routine testing across app restarts.

Product KPIs (for future multi-user launch):

- 7-day retention (deferred tracking if/when analytics added).
- Average workouts per week per user.

Quality acceptance:

- Dashboard aggregates and PR calculations verified against raw logged data (manual test cases).
- CRUD operations validated by unit/manual tests (at least smoke tests for create/read/update/delete for plans, sessions, sets).

Open decisions & unresolved items (for developer/PM to decide pre-implementation):

1. Persistence tech: IndexedDB recommended; confirm library (idb) or direct API.
2. Representation of multi-part weights (e.g., "2x10kg"): store numeric weight + unit and reps; for complex notes allow free-text notes (store structured where possible).
3. Explicit PR formula: MVP PR = max weight for any logged set for that exercise. Consider rep-adjusted PRs later.
4. CSV export/import: decide whether included in MVP or deferred (story US-018/US-019 flagged optional).
5. Dashboard visuals: implement minimal line and bar charts (use lightweight charting lib).
6. Undo vs full change log: implement short-window undo; full audit log deferred.

Appendix: Acceptance checklist before marking MVP done

- All CRUD flows implemented and tested locally.
- Logged sets support alternatives and multiple sets per exercise.
- Dashboard supports specified filters and shows PR and volume aggregates.
- PWA manifest + service worker present; app installable to iOS homescreen and persists data offline.
- Basic settings and optional local access control present.
- Manual verification of data persistence across restarts.
- Plan editor allows setting an optional weekday, and plans list surfaces the badge when the field is populated.
- Plan editor also allows selecting an optional workout type (Cardio, HighIntensity, Strength); plan rows should surface a compact pill for the type and sessions instantiated from the plan should inherit it so filtering/analytics can use the classification.
