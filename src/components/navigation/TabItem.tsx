import { memo, useCallback, useId } from "react";
import type { KeyboardEvent } from "react";
import clsx from "clsx";
import {
  Activity,
  ListChecks,
  Plus,
  Gauge,
  Settings,
  type LucideIcon,
  Home,
} from "lucide-react";
import type { TabDTO } from "../../types/navigation";

const ICON_MAP: Record<TabDTO["icon"], LucideIcon> = {
  home: Home,
  sessions: Activity,
  plans: ListChecks,
  quickLog: Plus,
  dashboard: Gauge,
  settings: Settings,
};

export interface TabItemProps {
  label: string;
  icon: TabDTO["icon"];
  badgeCount?: number;
  isActive: boolean;
  disabled?: boolean;
  className?: string;
  onActivate: () => void;
}

function TabItemComponent({
  label,
  icon,
  badgeCount,
  isActive,
  disabled = false,
  className,
  onActivate,
}: TabItemProps) {
  const generatedId = useId();
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) {
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onActivate();
      }
    },
    [disabled, onActivate]
  );

  const IconComponent = ICON_MAP[icon] ?? Activity;

  return (
    <button
      type="button"
      role="tab"
      id={`tab-${generatedId}`}
      aria-controls={`tabpanel-${generatedId}`}
      aria-selected={isActive}
      aria-current={isActive ? "page" : undefined}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={disabled ? undefined : onActivate}
      onKeyDown={handleKeyDown}
      className={clsx(
        "flex flex-col items-center justify-center gap-1 px-3 py-2 min-h-[56px] text-xs font-semibold transition-colors focus-visible:outline-none",
        isActive ? "text-primary" : "text-gray-600",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:text-primary focus-visible:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        className
      )}
    >
      <IconComponent
        className={clsx("h-5 w-5", isActive ? "text-primary" : "text-gray-500")}
        aria-hidden
      />
      <span>{label}</span>
      {badgeCount ? (
        <span className="text-[10px] font-semibold tracking-wide rounded-full bg-red-600 text-white px-2 py-0.5">
          {badgeCount}
        </span>
      ) : null}
    </button>
  );
}

export const TabItem = memo(TabItemComponent);
TabItem.displayName = "TabItem";
