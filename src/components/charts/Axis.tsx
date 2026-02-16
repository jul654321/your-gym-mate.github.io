// Axis component - renders axis lines, ticks, labels, and grid lines
// Supports all four orientations (left, right, top, bottom)

import { useMemo } from "react";
import type { ChartScale, AxisConfig } from "./types";

interface AxisProps extends Omit<AxisConfig, "formatTick"> {
  scale: ChartScale;
  min: number;
  max: number;
  formatTick?: (value: number) => string;
}

export function Axis({
  scale,
  min,
  max,
  orientation,
  tickCount = 5,
  showGrid = true,
  showTicks = true,
  showAxis = true,
  formatTick = (v) => Math.round(v).toString(),
  className = "",
}: AxisProps) {
  const { dimensions } = scale;
  const { padding, chartWidth, chartHeight } = dimensions;

  // Generate tick values and positions
  const ticks = useMemo(() => {
    return Array.from({ length: tickCount }, (_, i) => {
      const value = min + (i / (tickCount - 1)) * (max - min);
      const normalizedPosition = i / (tickCount - 1);

      let x: number, y: number;

      if (orientation === "left" || orientation === "right") {
        x = orientation === "left" ? padding.left : padding.left + chartWidth;
        y = padding.top + chartHeight - normalizedPosition * chartHeight;
      } else {
        x = padding.left + normalizedPosition * chartWidth;
        y = orientation === "bottom" ? padding.top + chartHeight : padding.top;
      }

      return { value, x, y };
    });
  }, [min, max, tickCount, orientation, padding, chartWidth, chartHeight]);

  // Axis line coordinates
  const axisLine = useMemo(() => {
    switch (orientation) {
      case "left":
        return {
          x1: padding.left,
          y1: padding.top,
          x2: padding.left,
          y2: padding.top + chartHeight,
        };
      case "right":
        return {
          x1: padding.left + chartWidth,
          y1: padding.top,
          x2: padding.left + chartWidth,
          y2: padding.top + chartHeight,
        };
      case "top":
        return {
          x1: padding.left,
          y1: padding.top,
          x2: padding.left + chartWidth,
          y2: padding.top,
        };
      case "bottom":
        return {
          x1: padding.left,
          y1: padding.top + chartHeight,
          x2: padding.left + chartWidth,
          y2: padding.top + chartHeight,
        };
    }
  }, [orientation, padding, chartWidth, chartHeight]);

  return (
    <g className={`axis axis-${orientation} ${className}`}>
      {/* Main axis line */}
      {showAxis && (
        <line
          x1={axisLine.x1}
          y1={axisLine.y1}
          x2={axisLine.x2}
          y2={axisLine.y2}
          stroke="currentColor"
          strokeWidth="1"
          className="text-gray-300"
        />
      )}

      {/* Ticks, labels, and grid lines */}
      {ticks.map((tick, i) => (
        <g key={i}>
          {/* Tick mark */}
          {showTicks && (
            <line
              x1={
                orientation === "left"
                  ? tick.x - 5
                  : orientation === "right"
                    ? tick.x
                    : tick.x
              }
              y1={
                orientation === "bottom"
                  ? tick.y
                  : orientation === "top"
                    ? tick.y - 5
                    : tick.y
              }
              x2={
                orientation === "left"
                  ? tick.x
                  : orientation === "right"
                    ? tick.x + 5
                    : tick.x
              }
              y2={
                orientation === "bottom"
                  ? tick.y + 5
                  : orientation === "top"
                    ? tick.y
                    : tick.y
              }
              stroke="currentColor"
              strokeWidth="1"
              className="text-gray-300"
            />
          )}

          {/* Tick label */}
          <text
            x={
              orientation === "left"
                ? tick.x - 10
                : orientation === "right"
                  ? tick.x + 10
                  : tick.x
            }
            y={
              orientation === "bottom"
                ? tick.y + 20
                : orientation === "top"
                  ? tick.y - 10
                  : tick.y
            }
            textAnchor={
              orientation === "left"
                ? "end"
                : orientation === "right"
                  ? "start"
                  : "middle"
            }
            dominantBaseline={
              orientation === "left" || orientation === "right"
                ? "middle"
                : "auto"
            }
            className="text-xs fill-gray-500"
          >
            {formatTick(tick.value)}
          </text>

          {/* Grid line */}
          {showGrid && (
            <line
              x1={
                orientation === "left" || orientation === "right"
                  ? padding.left
                  : tick.x
              }
              y1={
                orientation === "left" || orientation === "right"
                  ? tick.y
                  : padding.top
              }
              x2={
                orientation === "left" || orientation === "right"
                  ? padding.left + chartWidth
                  : tick.x
              }
              y2={
                orientation === "left" || orientation === "right"
                  ? tick.y
                  : padding.top + chartHeight
              }
              stroke="currentColor"
              strokeWidth="1"
              className="text-gray-100"
              strokeDasharray="2,2"
            />
          )}
        </g>
      ))}
    </g>
  );
}
