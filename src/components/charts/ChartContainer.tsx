// ChartContainer - responsive SVG wrapper with measurement utilities
// Provides dimensions and pixel mapping helpers to child components

import { useEffect, useRef, useState, useMemo, type ReactNode } from "react";
import type { ChartPadding, ChartDimensions, ChartScale } from "./types";

export interface ChartContainerProps {
  children: (scale: ChartScale) => ReactNode;
  width?: number;
  height?: number;
  padding?: Partial<ChartPadding>;
  responsive?: boolean;
  maxWidth?: number;
  className?: string;
  role?: string;
  ariaLabel?: string;
}

const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 300;
const DEFAULT_PADDING: ChartPadding = {
  top: 20,
  right: 20,
  bottom: 40,
  left: 50,
};

export function ChartContainer({
  children,
  width: propWidth,
  height: propHeight = DEFAULT_HEIGHT,
  padding: propPadding,
  responsive = false,
  maxWidth,
  className = "",
  role = "img",
  ariaLabel,
}: ChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(
    propWidth || DEFAULT_WIDTH
  );

  // Merge padding with defaults
  const padding: ChartPadding = useMemo(
    () => ({ ...DEFAULT_PADDING, ...propPadding }),
    [propPadding]
  );

  // Calculate effective dimensions
  const dimensions: ChartDimensions = useMemo(() => {
    const effectiveWidth = responsive
      ? containerWidth
      : propWidth || DEFAULT_WIDTH;
    const width = maxWidth ? Math.min(effectiveWidth, maxWidth) : effectiveWidth;
    const height = propHeight;

    return {
      width,
      height,
      padding,
      chartWidth: width - padding.left - padding.right,
      chartHeight: height - padding.top - padding.bottom,
    };
  }, [containerWidth, propWidth, propHeight, padding, responsive, maxWidth]);

  // ResizeObserver for responsive sizing
  useEffect(() => {
    if (!responsive || !containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        setContainerWidth(width);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [responsive]);

  // Scale utilities for child components
  const scale: ChartScale = useMemo(
    () => ({
      getX: (index: number, total: number) => {
        if (total <= 1) return padding.left + dimensions.chartWidth / 2;
        return (
          padding.left + (index / (total - 1)) * dimensions.chartWidth
        );
      },
      getY: (value: number, min: number, max: number) => {
        const range = max - min || 1;
        return (
          padding.top +
          dimensions.chartHeight -
          ((value - min) / range) * dimensions.chartHeight
        );
      },
      dimensions,
    }),
    [padding, dimensions]
  );

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      <svg
        width="100%"
        height={dimensions.height}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="overflow-visible"
        role={role}
        aria-label={ariaLabel}
      >
        {children(scale)}
      </svg>
    </div>
  );
}
