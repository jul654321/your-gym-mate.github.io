// Tooltip component - positioned tooltip overlay for charts
// Supports multiple positioning strategies and custom rendering

import { useMemo, type ReactNode } from "react";
import type { TooltipData, TooltipPosition } from "./types";

export interface TooltipProps<T = unknown> {
  data: TooltipData<T>;
  containerWidth: number;
  containerHeight: number;
  position?: TooltipPosition;
  offset?: number;
  className?: string;
  children?: ReactNode;
  ariaLive?: "polite" | "assertive" | "off";
}

export function Tooltip<T = unknown>({
  data,
  containerWidth,
  containerHeight,
  position = "auto",
  offset = 10,
  className = "",
  children,
  ariaLive = "polite",
}: TooltipProps<T>) {
  // Calculate optimal position based on data point location
  const { left, top, transform } = useMemo(() => {
    const xPercent = (data.x / containerWidth) * 100;
    const yPercent = (data.y / containerHeight) * 100;

    let left = `${xPercent}%`;
    let top = `${yPercent}%`;
    let transform = "translate(-50%, -120%)";

    if (position === "auto") {
      // Auto positioning based on quadrant
      const isLeft = xPercent < 50;
      const isTop = yPercent < 50;

      if (isTop) {
        // Position below the point
        transform = "translate(-50%, 10%)";
      } else {
        // Position above the point
        transform = "translate(-50%, -120%)";
      }

      // Adjust horizontal position if near edges
      if (xPercent < 15) {
        transform = isTop
          ? "translate(0%, 10%)"
          : "translate(0%, -120%)";
      } else if (xPercent > 85) {
        transform = isTop
          ? "translate(-100%, 10%)"
          : "translate(-100%, -120%)";
      }
    } else if (position === "top") {
      transform = "translate(-50%, -120%)";
    } else if (position === "bottom") {
      transform = "translate(-50%, 10%)";
    } else if (position === "left") {
      transform = "translate(-110%, -50%)";
    } else if (position === "right") {
      transform = "translate(10%, -50%)";
    }

    return { left, top, transform };
  }, [data.x, data.y, containerWidth, containerHeight, position]);

  return (
    <div
      className={`absolute bg-card border border-border rounded-md shadow-lg p-2 pointer-events-none z-10 ${className}`}
      style={{ left, top, transform }}
      role="tooltip"
      aria-live={ariaLive}
    >
      {children}
    </div>
  );
}

// Default tooltip content component
export interface DefaultTooltipContentProps {
  label: string;
  value: string;
  className?: string;
}

export function DefaultTooltipContent({
  label,
  value,
  className = "",
}: DefaultTooltipContentProps) {
  return (
    <div className={className}>
      <p className="text-xs font-medium whitespace-nowrap">{label}</p>
      <p className="text-xs text-primary">{value}</p>
    </div>
  );
}
