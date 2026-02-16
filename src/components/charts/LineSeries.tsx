// LineSeries component - renders line chart with optional area fill and points
// Reuses the path generation logic from TrendChart.tsx

import { useMemo, useId } from "react";
import type { ChartScale, LineSeriesConfig } from "./types";

interface LineSeriesProps<T> extends LineSeriesConfig<T> {
  scale: ChartScale;
  min: number;
  max: number;
  hoveredIndex?: number | null;
  onHoverChange?: (index: number | null) => void;
}

export function LineSeries<T>({
  scale,
  data,
  yAccessor,
  min,
  max,
  showArea = true,
  showPoints = true,
  showLine = true,
  className = "text-primary",
  ariaLabel,
  onPointHover,
  onPointClick,
  hoveredIndex,
  onHoverChange,
}: LineSeriesProps<T>) {
  const seriesId = useId();
  const { dimensions } = scale;
  const { padding, chartHeight } = dimensions;

  // Compute y values and positions
  const { yValues, positions } = useMemo(() => {
    const yValues = data.map((d, i) => yAccessor(d, i));
    const positions = data.map((_, i) => ({
      x: scale.getX(i, data.length),
      y: scale.getY(yValues[i], min, max),
    }));
    return { yValues, positions };
  }, [data, yAccessor, scale, min, max]);

  // Generate line path (reused from TrendChart)
  const linePath = useMemo(() => {
    if (positions.length === 0) return "";
    const pathParts = positions.map((pos, i) => {
      const command = i === 0 ? "M" : "L";
      return `${command} ${pos.x} ${pos.y}`;
    });
    return pathParts.join(" ");
  }, [positions]);

  // Generate area path (reused from TrendChart)
  const areaPath = useMemo(() => {
    if (positions.length === 0) return "";
    const bottomY = padding.top + chartHeight;
    let path = `M ${positions[0].x} ${bottomY} `;
    positions.forEach((pos) => {
      path += `L ${pos.x} ${pos.y} `;
    });
    path += `L ${positions[positions.length - 1].x} ${bottomY} Z`;
    return path;
  }, [positions, chartHeight, padding.top]);

  const handlePointHover = (index: number) => {
    onHoverChange?.(index);
    onPointHover?.(data[index], index);
  };

  const handlePointLeave = () => {
    onHoverChange?.(null);
  };

  const handlePointClick = (index: number) => {
    onPointClick?.(data[index], index);
  };

  if (data.length === 0) return null;

  return (
    <g className="line-series" aria-label={ariaLabel}>
      {/* Area fill */}
      {showArea && (
        <path
          d={areaPath}
          fill="currentColor"
          className={`${className} opacity-10`}
          aria-hidden="true"
        />
      )}

      {/* Line */}
      {showLine && (
        <path
          d={linePath}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={className}
        />
      )}

      {/* Data points */}
      {showPoints &&
        positions.map((pos, i) => (
          <circle
            key={`${seriesId}-point-${i}`}
            cx={pos.x}
            cy={pos.y}
            r={hoveredIndex === i ? 6 : 4}
            fill="currentColor"
            className={`${className} cursor-pointer transition-all`}
            onMouseEnter={() => handlePointHover(i)}
            onMouseLeave={handlePointLeave}
            onClick={() => handlePointClick(i)}
            tabIndex={0}
            role="button"
            aria-label={`Data point ${i + 1}: ${yValues[i]}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handlePointClick(i);
              }
            }}
          />
        ))}
    </g>
  );
}
