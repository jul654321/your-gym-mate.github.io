// VolumeBarChart component - displays volume per session as bars
// Refactored to use reusable chart primitives

import { useState, useMemo } from "react";
import { Card } from "../ui/card";
import { ChartContainer } from "../charts/ChartContainer";
import { Axis } from "../charts/Axis";
import { BarSeries } from "../charts/BarSeries";
import { Tooltip, DefaultTooltipContent } from "../charts/Tooltip";
import type { VolumePoint } from "../../types";

export interface VolumeBarChartProps {
  points: VolumePoint[];
  onSessionClick: (sessionId: string) => void;
}

export function VolumeBarChart({
  points,
  onSessionClick,
}: VolumeBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Chart dimensions for tooltip positioning
  const chartWidth = 600;
  const chartHeight = 300;
  const padding = useMemo(
    () => ({ top: 20, right: 20, bottom: 60, left: 50 }),
    []
  );
  const innerWidth = useMemo(
    () => chartWidth - padding.left - padding.right,
    [chartWidth, padding]
  );
  const innerHeight = useMemo(
    () => chartHeight - padding.top - padding.bottom,
    [chartHeight, padding]
  );

  // Compute y-axis max
  const yMax = useMemo(() => {
    if (points.length === 0) return 100;
    return Math.max(...points.map((p) => p.volume), 1);
  }, [points]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Format volume for display
  const formatVolume = (volume: number) => {
    return `${Math.round(volume)} kg`;
  };

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  // Calculate tooltip position
  const tooltipPosition = useMemo(() => {
    if (hoveredIndex === null || !hoveredPoint) return null;

    const barWidth = innerWidth / points.length;
    const x = padding.left + hoveredIndex * barWidth + barWidth / 2;
    const barHeight = (hoveredPoint.volume / yMax) * innerHeight;
    const y = padding.top + innerHeight - barHeight;

    return { x, y };
  }, [
    hoveredIndex,
    hoveredPoint,
    points.length,
    yMax,
    padding,
    innerWidth,
    innerHeight,
  ]);

  if (points.length === 0) {
    return (
      <Card className="flex items-center justify-center h-80">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">No session data available</p>
          <p className="text-sm mt-1">
            Complete some workouts to see volume per session
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Volume per Session</h3>
        <p className="text-sm text-muted-foreground">
          Click a bar to view session details
        </p>
      </div>

      {/* Chart */}
      <div className="relative">
        <ChartContainer
          height={chartHeight}
          responsive
          padding={padding}
          ariaLabel="Volume per session bar chart"
        >
          {(scale) => (
            <>
              {/* Y-axis with grid */}
              <Axis
                scale={scale}
                orientation="left"
                min={0}
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
                tickCount={0}
                showGrid={false}
                showTicks={false}
              />

              {/* Bar series */}
              <BarSeries
                scale={scale}
                data={points}
                yAccessor={(d) => d.volume}
                xAccessor={(d) => d.date}
                xLabelAccessor={(d) => formatDate(d.date)}
                min={0}
                max={yMax}
                hoveredIndex={hoveredIndex}
                onHoverChange={setHoveredIndex}
                onBarClick={(d) => onSessionClick(d.sessionId)}
                showXLabels
                ariaLabel="Session volume bars"
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
            position="top"
          >
            <DefaultTooltipContent
              label={formatDate(hoveredPoint.date)}
              value={formatVolume(hoveredPoint.volume)}
            />
          </Tooltip>
        )}
      </div>
    </Card>
  );
}
