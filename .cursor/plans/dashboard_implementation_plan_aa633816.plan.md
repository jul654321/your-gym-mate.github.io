---
name: Dashboard Implementation Plan
overview: Implementation plan for the Dashboard view that provides filterable analytics, PR table, and volume/weight trend charts using local IndexedDB data and existing PWA patterns.
todos: []
isProject: false
---

# Dashboard View Implementation Plan

## 1. Overview

Dashboard view shows aggregated metrics and visualizations computed from local data (IndexedDB): trend charts (weight/volume), PR table, per-session volume bars, and a filter bar to customize exercise selection, date range, and min/max weight/reps. It must update in real-time when local data changes, support offline-first behavior, and follow the project's PWA and IndexedDB rules.

## 2. View Routing

Path: `/dashboard`

## 3. Component Structure

- `DashboardPage` (page container)
  - `DashboardHeader` (title, quick actions)
  - `FilterBar` (exercise multi-select, includeAlternatives toggle, date presets/custom range, min/max weight/reps)
  - `DashboardGrid` (layout)
    - `TrendChart` (weight/volume trend)
    - `VolumeBarChart` (per-session volume bars)
    - `PRTable` (list personal records)
    - `TotalsCard` (summary totals)
  - `LoadingSkeleton` / `ErrorBanner`

## 4. Component Details

### `DashboardPage`

- Description: Page-level container that orchestrates hooks, aggregates data, and passes data/handlers to child components.
- Main elements: top-level `main` element, header, grid layout of widgets.
- Handled interactions: listens to data-change events (IndexedDB) to recompute aggregates; handles deep-linking of filter state via query params.
- Validation: ensures filters are valid (date start <= end, min <= max weight/reps). Shows errors if invalid.
- Types: `DashboardFilters`, `TrendPoint`, `PRItem`, `VolumePoint`, `DashboardViewModel`.
- Props: none (route-level)

### `FilterBar`

- Description: UI for selecting exercises and filter parameters.
- Elements: exercise multi-select (searchable), includeAlternatives toggle, date picker (presets + custom), number inputs for min/max weight and reps, apply/reset buttons.
- Handled events: `onChange(filters)`, `onReset()`, `onPresetSelect(preset)`.
- Validation: date range required, number inputs must be >=0, min <= max when both set. Debounce inputs (150–300ms) before emitting change.
- Types: accepts and produces `DashboardFilters`.
- Props: `filters: DashboardFilters`, `exercises: ExerciseSummary[]`, `onChange: (f) => void`, `onReset: () => void`.

### `TrendChart`

- Description: Line chart for weight and/or volume trends over time.
- Elements: SVG/canvas chart (use existing chart library), legend, x/y axes, tooltip, toggle to switch metric (weight/volume).
- Handled events: hover (show tooltip), toggle metric.
- Validation: data array non-empty; otherwise show `NoData` state.
- Types: `TrendPoint[]`.
- Props: `points: TrendPoint[]`, `metric: 'weight'|'volume'`, `onMetricChange: (m) => void`.

### `VolumeBarChart`

- Description: Bar chart showing total session volume per session.
- Elements: bars, x-axis (session date), tooltip.
- Handled events: hover, click to navigate to session detail.
- Validation: fall back UI when no sessions.
- Types: `VolumePoint[]`.
- Props: `points: VolumePoint[]`, `onSessionClick: (sessionId) => void`.

### `PRTable`

- Description: Table listing top PRs per exercise with date achieved and optional includeAlternative flag.
- Elements: table rows with exercise name, PR weight, date, source set link.
- Handled events: row keyboard focus, sort (by weight/date), toggle includeAlternatives affects underlying query.
- Validation: show placeholder when no PRs.
- Types: `PRItem[]`.
- Props: `items: PRItem[]`, `onRowClick: (setId) => void`, `sortBy?: 'weight'|'date'`.

### `TotalsCard`

- Description: Compact summary — total volume, total sessions, avg session volume.
- Elements: numeric tiles, small sparkline.
- Handled events: none (read-only).
- Types: `TotalsViewModel`.
- Props: `totals: TotalsViewModel`.

## 5. Types

- `DashboardFilters` {
  - `exerciseIds: string[]` // selected exercise ids (empty = all)
  - `includeAlternatives: boolean` // default true
  - `dateFrom?: string` // ISO date
  - `dateTo?: string` // ISO date
  - `preset?: '7d'|'30d'|'90d'|'all'| 'custom'
  - `minWeight?: number`
  - `maxWeight?: number`
  - `minReps?: number`
  - `maxReps?: number`
  }
- `TrendPoint` {
  - `date: string` // ISO
  - `weight?: number` // aggregated (e.g., max or avg)
  - `volume?: number` // aggregated sum(weightreps)
  }
- `VolumePoint` {
  - `sessionId: string`
  - `date: string`
  - `volume: number`
  }
- `PRItem` {
  - `exerciseId: string`
  - `exerciseName: string`
  - `weight: number`
  - `dateAchieved: string`
  - `setId: string`
  - `isAlternative?: boolean`
  }
- `TotalsViewModel` {
  - `totalVolume: number`
  - `totalSessions: number`
  - `avgSessionVolume: number`
  }
- `DashboardViewModel` {
  - `trendPoints: TrendPoint[]`
  - `volumePoints: VolumePoint[]`
  - `prItems: PRItem[]`
  - `totals: TotalsViewModel`
  }

## 6. State variables & custom hooks

Suggested state and hooks:

- `useDashboardFilters()` hook — manages filter state (URL sync, validation, debounce).
- `useDashboardData(filters)` — computes aggregates and returns `DashboardViewModel` plus loading/error status. Internally uses IndexedDB cursors and streaming aggregation.
- `useExercises()` — returns exercise list for FilterBar.
- `useIndexedDBChanges()` — subscribes to local DB changes to invalidate caches and refetch.
- Local state variables in `DashboardPage`: `filters`, `metric`, `sortBy`, `selection`.

## 7. Hooks for state management and storage in IndexedDB

- `useDashboardData(filters: DashboardFilters)`:
  - Request: none (reads local idb). Internals: open DB, run cursors on `sets` store filtering by exercise/date/weight/reps.
  - Response: `DashboardViewModel`.
  - Behavior: should stream partial results to UI (skeleton -> partial charts), and return { data, loading, error }.
- IDB query patterns:
  - PRs: read `sets` index by exerciseId -> compute max weight per exercise and date.
  - Volume per session: group sets by `sessionId` and sum weightreps.
  - Trend points: bucket sets by day/week and compute sum(volume) and maxWeight.

## 8. Mapping User Stories to implementation

- US-013 (View statistics dashboard): implement `DashboardPage`, layout and the `useDashboardData` hook to load local data and render charts/tables.
- US-014 (Filter dashboard): implement `FilterBar` and `useDashboardFilters` with debounced onChange; filters feed `useDashboardData`.
- US-015 (PR calculation): `useDashboardData` computes PRs per exercise, with `includeAlternatives` toggle applied; `PRTable` displays results.
- US-016 (Aggregate volume): `useDashboardData` computes volume = Σ(weightreps) respecting filters; displayed in `VolumeBarChart` and `TotalsCard`.

## 9. User interactions and expected outcomes

- Change exercise selection -> debounced update -> charts & tables recompute.
- Toggle includeAlternatives -> immediate recompute.
- Pick date preset -> immediate filter apply.
- Enter min/max weight/reps -> validation; if invalid show inline error; otherwise apply.
- Click PR row -> navigate to session detail.
- Hover chart -> tooltip with point details.

## 10. API / Component-level conditions

All conditions are local (IDB) reads. Component-level checks:

- Filters: dateFrom <= dateTo; min <= max; numeric inputs non-negative.
- If no data found -> components show `NoData` state.
- PR inclusion of alternative sets: when `includeAlternatives` false, exclude sets with `isAlternative` flag or mapping to alternative exercise id.

## 11. Error scenarios and handling

- DB open error -> show `ErrorBanner` with Retry.
- Long-running aggregation -> show skeleton and progressively render partial results.
- Partial migration mismatch -> show migration notice and fallback (offer export backup). Follow PWA rules for migrations.
- Invalid filters -> inline validation messages and disabled Apply button.

## 12. Potential challenges & mitigations

- Performance: large datasets may make aggregation slow. Mitigation: use IndexedDB cursors, incremental aggregation, web worker for heavy compute, memoization, and debounced filters.
- Offline UX: ensure UI reads from idb always and shows meaningful offline indicator. Mitigation: use existing PWA service worker, and show offline badge.
- Timezone/date bucketing: ensure consistent ISO date handling and use UTC-normalized day buckets.
- Mapping alternative exercises: need consistent mapping function; put mapping in `src/lib/exerciseMaps.ts` to reuse.

## Implementation todos (high-level)

1. Define types in `src/types/dashboard.ts`.
2. Implement `useDashboardFilters` hook (URL sync + debounce).
3. Implement `useDashboardData` hook with IDB cursors and streaming aggregation.
4. Build `FilterBar` UI.
5. Build chart components (`TrendChart`, `VolumeBarChart`) using existing chart lib.
6. Build `PRTable` and `TotalsCard`.
7. Wire `DashboardPage` and routing `/dashboard`.
8. Add tests and manual acceptance checks (offline, SW update flow).

