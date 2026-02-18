---
name: Dashboard Plan Filter
overview: Extend the Dashboard filters with a "Workout Plan" multi-select, allowing users to scope all analytics (trend, volume, PRs, totals) to sessions instantiated from specific plans. Involves updating types, filter hook, data hook, FilterBar component, DashboardPage, and documentation.
todos:
  - id: update-types
    content: "Add `planIds: UUID[]` to `DashboardFilters` in src/types.ts"
    status: pending
  - id: update-filter-hook
    content: Extend useDashboardFilters to parse/serialize `plans` URL param and include planIds in DEFAULT_FILTERS
    status: pending
  - id: update-data-hook
    content: Add plan-ID session filtering to fetchFilteredSets in useDashboardData using sourcePlanId index
    status: pending
  - id: update-filterbar
    content: Add plans prop and Workout Plan multi-select section to FilterBar component
    status: pending
  - id: update-dashboard-page
    content: Fetch plans via usePlans in DashboardPage and pass to FilterBar
    status: pending
  - id: update-prd
    content: Update .ai/prd.md to add plan filter to US-014 acceptance criteria
    status: pending
  - id: update-ui-plan
    content: Update .ai/ui-plan.md Dashboard section to mention plan multi-select in FilterBar
    status: pending
  - id: create-impl-plan
    content: Write .ai/dashboard-filters-plan-view-implementation-plan.md
    status: pending
isProject: false
---

# Dashboard Filters Extension — Workout Plan Filter

## 1. Overview

Add a Workout Plan multi-select filter to the Dashboard's `FilterBar` modal. When one or more plans are selected, all analytics (trend chart, volume bar chart, PR table, totals) are scoped exclusively to logged sets that belong to sessions instantiated from those plans. When no plans are selected (default), behaviour is unchanged — all sessions are included.

## 2. View Routing

`/dashboard` — no new route. The plan filter state is serialized as the `plans` URL query parameter (`?plans=planId1,planId2`), consistent with the existing filter URL-sync pattern.

## 3. Component Structure

```
DashboardPage
├── SectionHeader
│   └── FilterBar (extended)
│       ├── Filter toggle button
│       └── Modal
│           ├── Workout Plan multi-select  ← NEW (rendered first)
│           │   ├── Plan search Input
│           │   └── Plan list with Checkboxes (select-all row + per-plan rows)
│           ├── Exercise multi-select (existing)
│           ├── Include Alternatives toggle (existing)
│           ├── Date Presets (existing)
│           └── Custom date range (existing)
└── SectionMain
    ├── TotalsCard
    ├── TrendChart
    ├── VolumeBarChart
    └── PRTable
```

## 4. Component Details

### FilterBar (extended)

- **Description**: Modal-based filter panel; the new "Workout Plan" section is rendered above the existing "Exercises" section using the same searchable multi-select pattern.
- **Main elements**: Plan search `<Input>`, plan list `<div>` with "Select all" `<Checkbox>` + per-plan `<Checkbox>` rows.
- **Handled interactions**:
  - `planSearchQuery` change → filters visible plan list via `useMemo`
  - Plan checkbox toggle → add/remove planId from `filtersForm.planIds`
  - "Select all" checkbox → set `filtersForm.planIds` to all filtered plan IDs or clear to `[]`
  - Apply button → calls `onChange(filtersForm)` (unchanged)
  - Reset button → calls `onReset()` (unchanged)
- **Validation**: none specific to plan filter; existing cross-field validations (date, weight, reps) unchanged
- **Types**: extended `FilterBarProps`, extended `DashboardFilters`, `PlanDTO`
- **Props (additions)**:
  - `plans: PlanDTO[]` — list of all available plans for selection

### DashboardPage (updated)

- **Description**: Orchestrates data and passes handlers down; extended to also fetch plans.
- **Changes**:
  - Call `usePlans({ sort: 'name' })` and destructure `{ data: plans, isLoading: plansLoading }`
  - Merge `plansLoading` into the `isLoading` guard
  - Pass `plans` prop to `<FilterBar />`

## 5. Types

### Updated `DashboardFilters` — `[src/types.ts](src/types.ts)` line 328

Add `planIds: UUID[]` field. Empty array means "all plans" (default).

```ts
export interface DashboardFilters {
  exerciseIds: UUID[];
  planIds: UUID[]; // NEW — empty = no plan filter applied
  includeAlternatives: boolean;
  dateFrom?: string;
  dateTo?: string;
  preset?: DatePreset;
  minWeight?: number;
  maxWeight?: number;
  minReps?: number;
  maxReps?: number;
}
```

No new ViewModel or DTO types are required. `PlanDTO` (already in `src/types.ts` line 70) is used directly in `FilterBarProps`.

## 6. State Management

### `useDashboardFilters` — `[src/hooks/useDashboardFilters.ts](src/hooks/useDashboardFilters.ts)`

- Add `planIds: []` to `DEFAULT_FILTERS` (line 8)
- In `filtersFromUrl` memo: parse `const planIdsParam = searchParams.get("plans"); planIds: planIdsParam ? planIdsParam.split(",") : []`
- In `setFilters`: handle `updates.planIds` — if non-empty, `newParams.set("plans", updates.planIds.join(","))`; if empty, `newParams.delete("plans")`
- No change to debounce (300 ms) or validation logic

### `FilterBar` local state additions

- `const [planSearchQuery, setPlanSearchQuery] = useState("")`
- `const filteredPlans = useMemo(() => plans.filter(...), [plans, planSearchQuery])`
- `filtersForm` already holds full `DashboardFilters`; adding `planIds` to the initial state is automatic since `filters` prop now carries it

## 7. Hooks Integration

### `useDashboardFilters` (extended)

- **URL param key**: `plans` (comma-separated UUIDs)
- **Read**: `searchParams.get("plans")` → split → `filters.planIds`
- **Write**: `setFilters({ planIds: [...] })` → serializes to URL

### `useDashboardData` — `[src/hooks/useDashboardData.ts](src/hooks/useDashboardData.ts)`

New filtering step added inside `fetchFilteredSets` when `filters.planIds.length > 0`:

1. Open a readonly transaction on `STORE_NAMES.sessions`
2. Use the existing `sourcePlanId` index (already present; see `usePlans.ts` line 327) — `index.getAll(planId)` for each selected planId
3. Collect all matching sessions into `planSessionIds: Set<string>`
4. **Intersection with date filter**: if date-based session IDs were already resolved, intersect the two sets (AND logic); if no date filter, use `planSessionIds` as the primary filter
5. Pass the intersected set through to `loggedSets` filtering

### `usePlans` (existing) — used in `DashboardPage`

- Called with `{ sort: 'name' }` — returns `PlanDTO[]`
- No changes to the hook itself

## 8. User Interactions

| User action                       | Expected outcome                                                 |
| --------------------------------- | ---------------------------------------------------------------- |
| Open filter modal                 | New "Workout Plan" section appears at the top                    |
| Type in plan search input         | Plan list narrows to matching names (case-insensitive)           |
| Check one or more plans           | Plan IDs added to `filtersForm.planIds`                          |
| Tap "Select all" when unchecked   | All visible plan IDs selected                                    |
| Tap "Select all" when all checked | All plan IDs cleared                                             |
| Tap "Apply"                       | `onChange` called; dashboard recomputes scoped to selected plans |
| Tap "Reset"                       | All filters (including planIds) reset; `plans` URL param removed |
| Deselect all plans (empty)        | Dashboard behaves as if no plan filter is active                 |

## 9. Conditions and Validation

- **Plan + Exercise (AND)**: sets must belong to a plan-session AND match the exercise filter — both filters applied in sequence inside `fetchFilteredSets`
- **Plan + Date (AND)**: session must be instantiated from a selected plan AND fall within the date range — enforced by intersecting session ID sets
- **Plan + Weight/Reps (AND)**: plan filter narrows session scope first; weight/reps filters applied to the resulting sets
- No cross-field validation error is introduced by `planIds`; existing validations (date order, weight/reps non-negative range) are unchanged

## 10. Error Handling

- `usePlans` error → `plans` defaults to `[]`; plan section in `FilterBar` shows "No plans available" empty state (same pattern as exercise empty state)
- `usePlans` loading → `plansLoading` included in `isLoading` guard in `DashboardPage`; skeleton covers the whole page until plans are ready
- Non-existent plan IDs in URL param → silently ignored (no sessions will match those IDs; resulting empty set does not throw)
- All sessions excluded by plan filter → existing "No data" empty state is shown by `TrendChart`, `VolumeBarChart`, and `PRTable` (no change needed)

## 11. Implementation Steps

1. **Update `src/types.ts**`— add`planIds: UUID[]`to`DashboardFilters` interface
2. **Update `src/hooks/useDashboardFilters.ts**`:

- Add `planIds: []` to `DEFAULT_FILTERS`
- Parse `plans` URL param into `planIds` in `filtersFromUrl` memo
- Serialize `planIds` in the `setFilters` callback

1. **Update `src/hooks/useDashboardData.ts**`:

- In `fetchFilteredSets`, after resolving date-based session IDs, add a plan-ID filtering pass using the `sourcePlanId` index on the `sessions` store
- Intersect plan-session IDs with date-session IDs when both filters are active

1. **Update `src/components/dashboard/FilterBar.tsx**`:

- Add `plans: PlanDTO[]` to `FilterBarProps`
- Add `planSearchQuery` state and `filteredPlans` memo
- Render the new "Workout Plan" multi-select section (search input + select-all row + per-plan checkbox rows) at the top of the modal body, above the "Exercises" section

1. **Update `src/pages/DashboardPage.tsx**`:

- Import `usePlans` from `../hooks`
- Call `usePlans({ sort: 'name' })` and merge `plansLoading` into the `isLoading` flag
- Pass `plans` to `<FilterBar />`

1. **Update `.ai/prd.md**` — extend US-014 acceptance criteria: _"User can filter dashboard data by workout plan (multi-select); only sessions instantiated from selected plans are included in aggregates"_
2. **Update `.ai/ui-plan.md**`— in the Dashboard section under "Key info" and "Components", add plan multi-select to the`FilterBar` description
3. **Verify lints** on all modified files after implementation
