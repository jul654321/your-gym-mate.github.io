// TrendChart component - displays weight/volume trends over time
// Simple SVG-based line chart implementation

import { useState, useMemo } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
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

  // Chart dimensions
  const width = 600;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Compute scales
  const { xScale, yScale, yMin, yMax } = useMemo(() => {
    if (points.length === 0) {
      return { xScale: [], yScale: [], yMin: 0, yMax: 100 };
    }

    const values =
      metric === "weight"
        ? points.map((p) => p.weight || 0)
        : points.map((p) => p.volume || 0);

    const yMin = Math.min(...values);
    const yMax = Math.max(...values);
    const yRange = yMax - yMin || 1;

    const xScale = points.map((_, i) => {
      return padding.left + (i / (points.length - 1 || 1)) * chartWidth;
    });

    const yScale = values.map((v) => {
      return padding.top + chartHeight - ((v - yMin) / yRange) * chartHeight;
    });

    return { xScale, yScale, yMin, yMax };
  }, [points, metric, chartWidth, chartHeight, padding]);

  // Generate path
  const linePath = useMemo(() => {
    if (xScale.length === 0) return "";
    const pathParts = xScale.map((x, i) => {
      const command = i === 0 ? "M" : "L";
      return `${command} ${x} ${yScale[i]}`;
    });
    return pathParts.join(" ");
  }, [xScale, yScale]);

  // Generate area path (filled under line)
  const areaPath = useMemo(() => {
    if (xScale.length === 0) return "";
    const bottomY = padding.top + chartHeight;
    let path = `M ${xScale[0]} ${bottomY} `;
    xScale.forEach((x, i) => {
      path += `L ${x} ${yScale[i]} `;
    });
    path += `L ${xScale[xScale.length - 1]} ${bottomY} Z`;
    return path;
  }, [xScale, yScale, chartHeight, padding.top]);

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const tickCount = 5;
    return Array.from({ length: tickCount }, (_, i) => {
      const value = yMin + (i / (tickCount - 1)) * (yMax - yMin);
      const y =
        padding.top + chartHeight - (i / (tickCount - 1)) * chartHeight;
      return { value, y };
    });
  }, [yMin, yMax, chartHeight, padding.top]);

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

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

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

          {/* Area fill */}
          <path
            d={areaPath}
            fill="currentColor"
            className="text-primary opacity-10"
          />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-primary"
          />

          {/* Data points */}
          {xScale.map((x, i) => (
            <circle
              key={i}
              cx={x}
              cy={yScale[i]}
              r={hoveredIndex === i ? 6 : 4}
              fill="currentColor"
              className="text-primary cursor-pointer"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}

          {/* X-axis labels (show subset to avoid crowding) */}
          {xScale
            .filter((_, i) => i % Math.ceil(points.length / 6) === 0)
            .map((x, i) => {
              const pointIndex = i * Math.ceil(points.length / 6);
              return (
                <text
                  key={pointIndex}
                  x={x}
                  y={padding.top + chartHeight + 20}
                  textAnchor="middle"
                  className="text-xs fill-gray-500"
                >
                  {formatDate(points[pointIndex].date)}
                </text>
              );
            })}
        </svg>

        {/* Tooltip */}
        {hoveredPoint && hoveredIndex !== null && (
          <div
            className="absolute bg-card border border-border rounded-md shadow-lg p-2 pointer-events-none z-10"
            style={{
              left: `${(xScale[hoveredIndex] / width) * 100}%`,
              top: `${(yScale[hoveredIndex] / height) * 100}%`,
              transform: "translate(-50%, -120%)",
            }}
          >
            <p className="text-xs font-medium">{formatDate(hoveredPoint.date)}</p>
            <p className="text-xs text-primary">
              {metric === "weight"
                ? formatValue(hoveredPoint.weight || 0)
                : formatValue(hoveredPoint.volume || 0)}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
