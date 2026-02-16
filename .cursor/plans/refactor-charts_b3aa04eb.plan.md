---
name: refactor-charts
overview: Extract shared SVG chart primitives and compose them to make `TrendChart` and `VolumeBarChart` thin, reusable wrappers. Keep the current hand-rolled SVG implementation and make components responsive.
todos:
  - id: refactor-setup
    content: "Create src/components/charts/types.ts and ChartContainer.tsx (responsive wrapper) "
    status: pending
  - id: refactor-axis
    content: Implement Axis.tsx to draw axes and grid lines based on ChartContainer measurements
    status: pending
  - id: refactor-line-series
    content: "Implement LineSeries.tsx: line, area, points, hover/tooltip handlers"
    status: pending
  - id: refactor-bar-series
    content: "Implement BarSeries.tsx: bars, labels, click/hover handlers"
    status: pending
  - id: refactor-wrappers
    content: Replace SVG code in TrendChart.tsx and VolumeBarChart.tsx to compose new primitives
    status: pending
  - id: responsive
    content: Add ResizeObserver-based responsiveness and prop overrides
    status: pending
  - id: a11y
    content: Add keyboard support and aria attributes for points/bars; ensure tooltip accessible
    status: pending
  - id: tests
    content: Add unit tests for ChartContainer, LineSeries, BarSeries and add Storybook stories if available
    status: pending
isProject: false
---

# Refactor dashboard charts into reusable SVG components

## Goal

Extract reusable, well-typed, accessible SVG chart primitives so `TrendChart.tsx` and `VolumeBarChart.tsx` become small composition layers. Keep the existing hand-rolled SVG implementation and add responsive sizing.

## Files to add

- `src/components/charts/ChartContainer.tsx` — responsive svg wrapper, width/height/padding and viewBox logic, role/aria support.
- `src/components/charts/Axis.tsx` — X/Y axis + grid lines renderer.
- `src/components/charts/Tooltip.tsx` — positioned tooltip component that can be rendered absolutely over the svg.
- `src/components/charts/LineSeries.tsx` — renders line, area and points; accepts accessors and formatters.
- `src/components/charts/BarSeries.tsx` — renders bars, labels and handles click/hover.
- `src/components/charts/types.ts` — shared types and accessor signatures.

## Files to modify

- `src/components/dashboard/TrendChart.tsx` — replace internal scale + svg code with composition of `ChartContainer`, `Axis`, `LineSeries` and the existing header/metric toggle.
- `src/components/dashboard/VolumeBarChart.tsx` — replace internal scale + svg code with composition of `ChartContainer`, `Axis`, `BarSeries` and its header.

## High-level refactor steps

1. Create `types.ts` with generic series types and accessor signatures (x: (d)=>string|Date, y: (d)=>number).
2. Implement `ChartContainer`:

- Accepts `data`, `width`/`height` (optional), `padding`, `responsive: boolean`.
- Calculates chartWidth/chartHeight and exposes helper functions for pixel mapping via render-props or context.
- Provide `getX(i)`, `getY(value)` utilities for children.
- Add `role="img"` and `aria-label` props.

1. Implement `Axis` to draw axis lines, ticks and grid using the container's dimensions.
2. Implement `LineSeries` that receives precomputed xPositions,yPositions or accessors and draws path/area/points; extract the logic from `TrendChart` for generating `linePath` and `areaPath`.

- Reuse this existing logic (see reference) to minimize risk.

`56:63:src/components/dashboard/TrendChart.tsx`

`214:235:src/components/dashboard/TrendChart.tsx`

1. Implement `BarSeries` that receives data and draws bars and labels; move the bar rendering logic from `VolumeBarChart` into it (see reference).

`152:176:src/components/dashboard/VolumeBarChart.tsx`

1. Update `TrendChart.tsx` and `VolumeBarChart.tsx` to use new primitives. Keep top-level Card, header, and controls in those files.
2. Add responsive behavior: `ChartContainer` will measure parent width (ResizeObserver) when `responsive=true` and set viewBox appropriately. Provide optional `maxWidth`/`height` props.
3. Accessibility & keyboard: ensure bars/points are focusable (tabIndex=0) and have `aria-label` with date and value; Tooltip should be accessible via aria-live when values change.
4. Tests & stories: Add unit tests for `ChartContainer` utilities and snapshots for `LineSeries` and `BarSeries`. Add Storybook stories (if project uses it) or a small playground page.
5. Lint & run typecheck; fix any lints.

## Backwards compatibility & API shape

- New `LineSeries` and `BarSeries` props:
  - `data: T[]`
  - `xAccessor: (d:T,i:number)=>string | number | Date`
  - `yAccessor: (d:T)=>number`
  - `formatX?: (v)=>string` `formatY?: (v)=>string`
  - `onPointHover?: (d:T,i:number)=>void`, `onPointClick?: (d:T,i:number)=>void`
  - `className?`, `ariaLabel?`
- `TrendChart` and `VolumeBarChart` will continue exposing the same props to callers.

## Small code-snippets & references (existing logic to reuse)

- Line path generation (move into LineSeries):

```56:63:src/components/dashboard/TrendChart.tsx

```

- Line element + points rendering (to reuse classes/interaction):

```214:235:src/components/dashboard/TrendChart.tsx

```

- Bar rendering (move into BarSeries):

```152:176:src/components/dashboard/VolumeBarChart.tsx

```

## Todos

- refactor-setup: Create `src/components/charts/types.ts` and `ChartContainer.tsx`.
- refactor-axis: Implement `Axis.tsx` and grid rendering.
- refactor-line-series: Implement `LineSeries.tsx` using existing path logic.
- refactor-bar-series: Implement `BarSeries.tsx` using current bar logic.
- refactor-wrappers: Update `TrendChart.tsx` and `VolumeBarChart.tsx` to compose new primitives.
- responsive: Add ResizeObserver-based responsiveness and tests.
- a11y: Add aria labels, keyboard handlers, and aria-live for tooltip.
- tests: Add unit tests and/or stories.

## Risk & notes

- Keep the original line/area/bar math unchanged where possible to avoid visual regressions — reuse small code blocks (listed above).
- Make the new API ergonomic for future chart types (stacked bars, multi-line) by designing accessors and render-prop hooks.
