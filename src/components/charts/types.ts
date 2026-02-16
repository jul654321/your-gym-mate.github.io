// Shared types for reusable chart components
// Generic accessor signatures and series data structures

import type { ReactNode } from "react";

// Generic data point accessors
export type Accessor<T, R> = (datum: T, index: number) => R;
export type ValueFormatter<T> = (value: T) => string;

// Padding configuration for chart margins
export interface ChartPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// Chart dimensions and scale utilities
export interface ChartDimensions {
  width: number;
  height: number;
  padding: ChartPadding;
  chartWidth: number;
  chartHeight: number;
}

// Scale mapping utilities provided by ChartContainer to children
export interface ChartScale {
  /** Map data index to x pixel coordinate */
  getX: (index: number, total: number) => number;
  /** Map y value to pixel coordinate */
  getY: (value: number, min: number, max: number) => number;
  /** Get dimensions */
  dimensions: ChartDimensions;
}

// Series data configuration
export interface SeriesConfig<T> {
  data: T[];
  xAccessor: Accessor<T, string | number | Date>;
  yAccessor: Accessor<T, number>;
  formatX?: ValueFormatter<string | number | Date>;
  formatY?: ValueFormatter<number>;
  className?: string;
  ariaLabel?: string;
}

// Line series specific configuration
export interface LineSeriesConfig<T> extends SeriesConfig<T> {
  showArea?: boolean;
  showPoints?: boolean;
  showLine?: boolean;
  onPointHover?: (datum: T, index: number) => void;
  onPointClick?: (datum: T, index: number) => void;
}

// Bar series specific configuration
export interface BarSeriesConfig<T> extends SeriesConfig<T> {
  onBarHover?: (datum: T, index: number) => void;
  onBarClick?: (datum: T, index: number) => void;
  barClassName?: string;
}

// Axis configuration
export type AxisOrientation = "left" | "right" | "top" | "bottom";

export interface AxisConfig {
  orientation: AxisOrientation;
  tickCount?: number;
  showGrid?: boolean;
  showTicks?: boolean;
  showAxis?: boolean;
  formatTick?: ValueFormatter<number>;
  className?: string;
}

// Tooltip data
export interface TooltipData<T = unknown> {
  datum: T;
  index: number;
  x: number;
  y: number;
  formattedX?: string;
  formattedY?: string;
}

// Tooltip positioning
export type TooltipPosition = "top" | "bottom" | "left" | "right" | "auto";

export interface TooltipConfig {
  position?: TooltipPosition;
  offset?: number;
  className?: string;
  render?: (data: TooltipData) => ReactNode;
}
