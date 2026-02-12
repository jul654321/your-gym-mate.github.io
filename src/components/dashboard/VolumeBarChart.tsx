// VolumeBarChart component - displays volume per session as bars
// Simple SVG-based bar chart with click navigation

import { useState, useMemo } from "react";
import { Card } from "../ui/card";
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

  // Chart dimensions
  const width = 600;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 60, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Compute scales
  const { barWidth, yMax } = useMemo(() => {
    if (points.length === 0) {
      return { barWidth: 0, yMax: 100 };
    }

    const barWidth = chartWidth / points.length;
    const yMax = Math.max(...points.map((p) => p.volume), 1);

    return { barWidth, yMax };
  }, [points, chartWidth]);

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const tickCount = 5;
    return Array.from({ length: tickCount }, (_, i) => {
      const value = (i / (tickCount - 1)) * yMax;
      const y = padding.top + chartHeight - (i / (tickCount - 1)) * chartHeight;
      return { value, y };
    });
  }, [yMax, chartHeight, padding.top]);

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

      {/* Chart SVG */}
      <div className="relative">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="overflow-visible"
        >
          {/* Y-axis */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={padding.top + chartHeight}
            stroke="currentColor"
            strokeWidth="1"
            className="text-gray-300"
          />

          {/* Y-axis ticks and labels */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={padding.left - 5}
                y1={tick.y}
                x2={padding.left}
                y2={tick.y}
                stroke="currentColor"
                strokeWidth="1"
                className="text-gray-300"
              />
              <text
                x={padding.left - 10}
                y={tick.y}
                textAnchor="end"
                dominantBaseline="middle"
                className="text-xs fill-gray-500"
              >
                {Math.round(tick.value)}
              </text>
              {/* Grid line */}
              <line
                x1={padding.left}
                y1={tick.y}
                x2={padding.left + chartWidth}
                y2={tick.y}
                stroke="currentColor"
                strokeWidth="1"
                className="text-gray-100"
                strokeDasharray="2,2"
              />
            </g>
          ))}

          {/* X-axis */}
          <line
            x1={padding.left}
            y1={padding.top + chartHeight}
            x2={padding.left + chartWidth}
            y2={padding.top + chartHeight}
            stroke="currentColor"
            strokeWidth="1"
            className="text-gray-300"
          />

          {/* Bars */}
          {points.map((point, i) => {
            const x = padding.left + i * barWidth;
            const barHeight = (point.volume / yMax) * chartHeight;
            const y = padding.top + chartHeight - barHeight;
            const isHovered = hoveredIndex === i;

            return (
              <g key={point.sessionId}>
                {/* Bar */}
                <rect
                  x={x + barWidth * 0.1}
                  y={y}
                  width={barWidth * 0.8}
                  height={barHeight}
                  fill="currentColor"
                  className={
                    isHovered
                      ? "text-primary cursor-pointer"
                      : "text-primary/70 hover:text-primary cursor-pointer transition-colors"
                  }
                  onClick={() => onSessionClick(point.sessionId)}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />

                {/* X-axis label - show subset to avoid crowding */}
                {(i % Math.ceil(points.length / 8) === 0 ||
                  points.length < 10) && (
                  <text
                    x={x + barWidth / 2}
                    y={padding.top + chartHeight + 15}
                    textAnchor="middle"
                    className="text-xs fill-gray-500"
                  >
                    {formatDate(point.date)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredPoint && hoveredIndex !== null && (
          <div
            className="absolute bg-card border border-border rounded-md shadow-lg p-2 pointer-events-none z-10"
            style={{
              left: `${((padding.left + hoveredIndex * barWidth + barWidth / 2) / width) * 100}%`,
              top: "10%",
              transform: "translateX(-50%)",
            }}
          >
            <p className="text-xs font-medium whitespace-nowrap">
              {formatDate(hoveredPoint.date)}
            </p>
            <p className="text-xs text-primary">
              {formatVolume(hoveredPoint.volume)}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
