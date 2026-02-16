# Reusable Chart Components

A collection of reusable, accessible SVG-based chart primitives for building custom data visualizations.

## Overview

These components provide a composable API for creating charts while maintaining full control over styling, behavior, and accessibility. The design follows the principle of extracting common chart primitives (axes, series, tooltips) while keeping them flexible enough to compose into various chart types.

## Components

### ChartContainer

A responsive SVG wrapper that handles sizing and provides coordinate mapping utilities to child components.

**Features:**
- Responsive sizing with ResizeObserver
- Configurable padding/margins
- Provides scale utilities via render props
- Built-in accessibility support (role, aria-label)

**Example:**
```tsx
<ChartContainer
  height={300}
  responsive
  padding={{ top: 20, right: 20, bottom: 40, left: 50 }}
  ariaLabel="Sales trend over time"
>
  {(scale) => (
    // Render chart elements using scale utilities
  )}
</ChartContainer>
```

### Axis

Renders axes with ticks, labels, and optional grid lines. Supports all four orientations.

**Features:**
- Four orientations: left, right, top, bottom
- Configurable tick count and formatting
- Optional grid lines
- Automatic tick positioning

**Example:**
```tsx
<Axis
  scale={scale}
  orientation="left"
  min={0}
  max={100}
  tickCount={5}
  showGrid
  formatTick={(v) => `${v}%`}
/>
```

### LineSeries

Renders line charts with optional area fill and interactive points.

**Features:**
- Line, area fill, and points (individually toggleable)
- Hover and click interactions
- Keyboard navigation support
- Accessible focus states

**Example:**
```tsx
<LineSeries
  scale={scale}
  data={data}
  xAccessor={(d) => d.date}
  yAccessor={(d) => d.value}
  min={0}
  max={100}
  showArea
  showPoints
  hoveredIndex={hoveredIndex}
  onHoverChange={setHoveredIndex}
/>
```

### BarSeries

Renders bar charts with optional labels and interactive bars.

**Features:**
- Automatic bar width calculation
- X-axis label support with smart intervals
- Click and hover interactions
- Keyboard navigation support
- Accessible focus states

**Example:**
```tsx
<BarSeries
  scale={scale}
  data={data}
  yAccessor={(d) => d.volume}
  xLabelAccessor={(d) => formatDate(d.date)}
  min={0}
  max={maxVolume}
  onBarClick={(datum) => handleClick(datum)}
  hoveredIndex={hoveredIndex}
  onHoverChange={setHoveredIndex}
/>
```

### Tooltip

A positioned tooltip component that automatically adjusts placement based on data point location.

**Features:**
- Auto-positioning to avoid edges
- Multiple position strategies
- aria-live support for screen readers
- Composable content via children

**Example:**
```tsx
<Tooltip
  data={{
    datum: hoveredPoint,
    index: hoveredIndex,
    x: tooltipX,
    y: tooltipY,
  }}
  containerWidth={600}
  containerHeight={300}
>
  <DefaultTooltipContent
    label="Jan 15"
    value="$1,234"
  />
</Tooltip>
```

## Accessibility Features

All chart components include built-in accessibility support:

- **Keyboard Navigation**: Points and bars are focusable with Tab and activatable with Enter/Space
- **ARIA Labels**: All interactive elements have descriptive labels
- **ARIA Live Regions**: Tooltips use aria-live for screen reader announcements
- **Role Attributes**: Proper semantic roles (img, button) for chart elements
- **Focus States**: Visible focus indicators for keyboard users

## Responsive Behavior

The `ChartContainer` component uses ResizeObserver to automatically adapt to parent container width when `responsive={true}`. This makes charts work seamlessly across different screen sizes.

## Usage Pattern

The typical pattern for building a chart is:

1. Wrap your chart in `ChartContainer`
2. Use the `scale` render prop to access coordinate mapping
3. Compose `Axis`, series components (`LineSeries`, `BarSeries`), and other elements
4. Add a `Tooltip` outside the SVG for hover states
5. Manage hover state in parent component

**Example:**
```tsx
function MyChart({ data }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  
  return (
    <div className="relative">
      <ChartContainer responsive height={300}>
        {(scale) => (
          <>
            <Axis scale={scale} orientation="left" min={0} max={100} />
            <Axis scale={scale} orientation="bottom" min={0} max={data.length - 1} />
            <LineSeries
              scale={scale}
              data={data}
              xAccessor={(d) => d.x}
              yAccessor={(d) => d.y}
              min={0}
              max={100}
              hoveredIndex={hoveredIndex}
              onHoverChange={setHoveredIndex}
            />
          </>
        )}
      </ChartContainer>
      {hoveredIndex !== null && (
        <Tooltip data={tooltipData} containerWidth={600} containerHeight={300}>
          {/* Custom tooltip content */}
        </Tooltip>
      )}
    </div>
  );
}
```

## Design Principles

1. **Composability**: Small, focused components that can be combined
2. **Type Safety**: Full TypeScript support with generic data types
3. **Flexibility**: Configurable styling via className props
4. **Accessibility**: Built-in WCAG compliance
5. **Performance**: Memoized calculations and efficient rendering
6. **No Dependencies**: Pure SVG, no external charting libraries

## Future Extensions

The architecture supports easy extension for:
- Stacked bar charts
- Multi-line series
- Scatter plots
- Custom series types
- Animation/transitions
- Zoom and pan interactions
