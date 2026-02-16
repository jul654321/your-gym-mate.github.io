// TrendChart component - displays weight/volume trends over time
// Refactored to use reusable chart primitives

import { useState, useMemo } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { ChartContainer } from "../charts/ChartContainer";
import { Axis } from "../charts/Axis";
import { LineSeries } from "../charts/LineSeries";
import { Tooltip, DefaultTooltipContent } from "../charts/Tooltip";
import type { TrendPoint } from "../../types";

export interface TrendChartProps {
  points: TrendPoint[];
  metric: "weight" | "volume";
  onMetricChange: (metric: "weight" | "volume") => void;
}

export function TrendChart({
  points,
  metric,
  onMetricChange,
}: TrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Chart dimensions for tooltip positioning
  const chartWidth = 600;
  const chartHeight = 300;
  const padding = useMemo(() => ({ top: 20, right: 20, bottom: 40, left: 50 }), []);
  const innerWidth = useMemo(() => chartWidth - padding.left - padding.right, [chartWidth, padding]);
  const innerHeight = useMemo(() => chartHeight - padding.top - padding.bottom, [chartHeight, padding]);

  // Compute min/max for current metric
  const { yMin, yMax } = useMemo(() => {
    if (points.length === 0) {
      return { yMin: 0, yMax: 100 };
    }

    const values =
      metric === "weight"
        ? points.map((p) => p.weight || 0)
        : points.map((p) => p.volume || 0);

    const yMin = Math.min(...values);
    const yMax = Math.max(...values);

    return { yMin, yMax };
  }, [points, metric]);

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  // Calculate tooltip position
  const tooltipPosition = useMemo(() => {
    if (hoveredIndex === null || !hoveredPoint) return null;

    const value =
      metric === "weight"
        ? hoveredPoint.weight || 0
        : hoveredPoint.volume || 0;

    const x = points.length <= 1
      ? padding.left + innerWidth / 2
      : padding.left + (hoveredIndex / (points.length - 1)) * innerWidth;

    const y =
      padding.top +
      innerHeight -
      ((value - yMin) / (yMax - yMin || 1)) * innerHeight;

    return { x, y };
  }, [hoveredIndex, hoveredPoint, points.length, yMin, yMax, metric, padding, innerWidth, innerHeight]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Format value for display
  const formatValue = (value: number) => {
    if (metric === "weight") {
      return `${value.toFixed(1)} kg`;
    }
    return `${Math.round(value)} kg`;
  };

  if (points.length === 0) {
    return (
      <Card className="flex items-center justify-center h-80">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">No data available</p>
          <p className="text-sm mt-1">
            Adjust your filters to see trend data
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      {/* Header with metric toggle */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {metric === "weight" ? "Weight" : "Volume"} Trend
        </h3>
        <div className="flex gap-2">
          <Button
            variant={metric === "weight" ? "primary" : "outline"}
            size="sm"
            onClick={() => onMetricChange("weight")}
          >
            Weight
          </Button>
          <Button
            variant={metric === "volume" ? "primary" : "outline"}
            size="sm"
            onClick={() => onMetricChange("volume")}
          >
            Volume
          </Button>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        <ChartContainer
          height={300}
          responsive
          padding={{ top: 20, right: 20, bottom: 40, left: 50 }}
          ariaLabel={`${metric === "weight" ? "Weight" : "Volume"} trend over time`}
        >
          {(scale) => (
            <>
              {/* Y-axis with grid */}
              <Axis
                scale={scale}
                orientation="left"
                min={yMin}
                max={yMax}
                tickCount={5}
                showGrid
              />

              {/* X-axis */}
              <Axis
                scale={scale}
                orientation="bottom"
                min={0}
                max={points.length - 1}
                tickCount={Math.min(6, points.length)}
                showGrid={false}
                formatTick={(value) => {
                  const index = Math.round(value);
                  return index >= 0 && index < points.length
                    ? formatDate(points[index].date)
                    : "";
                }}
              />

              {/* Line series with area and points */}
              <LineSeries
                scale={scale}
                data={points}
                xAccessor={(d) => d.date}
                yAccessor={(d) =>
                  metric === "weight" ? d.weight || 0 : d.volume || 0
                }
                min={yMin}
                max={yMax}
                showArea
                showPoints
                showLine
                hoveredIndex={hoveredIndex}
                onHoverChange={setHoveredIndex}
                ariaLabel={`${metric === "weight" ? "Weight" : "Volume"} data points`}
              />
            </>
          )}
        </ChartContainer>

        {/* Tooltip */}
        {hoveredPoint && hoveredIndex !== null && tooltipPosition && (
          <Tooltip
            data={{
              datum: hoveredPoint,
              index: hoveredIndex,
              x: tooltipPosition.x,
              y: tooltipPosition.y,
            }}
            containerWidth={chartWidth}
            containerHeight={chartHeight}
          >
            <DefaultTooltipContent
              label={formatDate(hoveredPoint.date)}
              value={
                metric === "weight"
                  ? formatValue(hoveredPoint.weight || 0)
                  : formatValue(hoveredPoint.volume || 0)
              }
            />
          </Tooltip>
        )}
      </div>
    </Card>
  );
}
