// BarSeries component - renders bar chart with labels and interaction handlers
// Reuses the bar rendering logic from VolumeBarChart.tsx

import { useMemo, useId } from "react";
import type { ChartScale, BarSeriesConfig } from "./types";

interface BarSeriesProps<T> extends BarSeriesConfig<T> {
  scale: ChartScale;
  min?: number;
  max: number;
  hoveredIndex?: number | null;
  onHoverChange?: (index: number | null) => void;
  xLabelAccessor?: (datum: T, index: number) => string;
  showXLabels?: boolean;
  xLabelInterval?: number;
}

export function BarSeries<T>({
  scale,
  data,
  yAccessor,
  xLabelAccessor,
  min = 0,
  max,
  className = "text-primary",
  barClassName,
  ariaLabel,
  onBarHover,
  onBarClick,
  hoveredIndex,
  onHoverChange,
  showXLabels = true,
  xLabelInterval,
}: BarSeriesProps<T>) {
  const seriesId = useId();
  const { dimensions } = scale;
  const { padding, chartWidth, chartHeight } = dimensions;

  // Compute bar dimensions and positions
  const bars = useMemo(() => {
    const barWidth = chartWidth / data.length;

    return data.map((datum, i) => {
      const value = yAccessor(datum, i);
      const x = padding.left + i * barWidth;
      const barHeight = ((value - min) / (max - min)) * chartHeight;
      const y = padding.top + chartHeight - barHeight;
      const isHovered = hoveredIndex === i;

      return {
        datum,
        index: i,
        x,
        y,
        width: barWidth,
        height: barHeight,
        centerX: x + barWidth / 2,
        value,
        isHovered,
      };
    });
  }, [data, yAccessor, min, max, chartWidth, chartHeight, padding, hoveredIndex]);

  const handleBarHover = (index: number) => {
    onHoverChange?.(index);
    onBarHover?.(data[index], index);
  };

  const handleBarLeave = () => {
    onHoverChange?.(null);
  };

  const handleBarClick = (index: number) => {
    onBarClick?.(data[index], index);
  };

  // Calculate label interval
  const labelInterval = useMemo(() => {
    if (xLabelInterval !== undefined) return xLabelInterval;
    if (data.length < 10) return 1;
    return Math.ceil(data.length / 8);
  }, [data.length, xLabelInterval]);

  if (data.length === 0) return null;

  return (
    <g className="bar-series" aria-label={ariaLabel}>
      {/* Bars */}
      {bars.map((bar) => {
        const barClass = barClassName || className;

        return (
          <g key={`${seriesId}-bar-${bar.index}`}>
            {/* Bar rectangle */}
            <rect
              x={bar.x + bar.width * 0.1}
              y={bar.y}
              width={bar.width * 0.8}
              height={bar.height}
              fill="currentColor"
              className={
                bar.isHovered
                  ? `${barClass} cursor-pointer`
                  : `${barClass}/70 hover:${barClass} cursor-pointer transition-colors`
              }
              onClick={() => handleBarClick(bar.index)}
              onMouseEnter={() => handleBarHover(bar.index)}
              onMouseLeave={handleBarLeave}
              tabIndex={0}
              role="button"
              aria-label={`Bar ${bar.index + 1}: ${bar.value}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleBarClick(bar.index);
                }
              }}
            />

            {/* X-axis label */}
            {showXLabels &&
              xLabelAccessor &&
              (bar.index % labelInterval === 0 || data.length < 10) && (
                <text
                  x={bar.centerX}
                  y={padding.top + chartHeight + 15}
                  textAnchor="middle"
                  className="text-xs fill-gray-500"
                  aria-hidden="true"
                >
                  {xLabelAccessor(bar.datum, bar.index)}
                </text>
              )}
          </g>
        );
      })}
    </g>
  );
}
