import { type ReactNode } from "react";
import clsx from "clsx";
import { TabItem } from "./TabItem";
import type { TabViewModel, TabId } from "../../types/navigation";

export interface BottomTabBarProps {
  tabs: TabViewModel[];
  onTabActivate: (tabId: TabId) => void;
  centerSlot?: ReactNode;
  hidden?: boolean;
  className?: string;
}

export function BottomTabBar({
  tabs,
  onTabActivate,
  centerSlot,
  hidden = false,
  className,
}: BottomTabBarProps) {
  const nonCenterTabs = tabs.filter((tab) => !tab.isCenter);
  const leftTabs = nonCenterTabs.slice(0, Math.ceil(nonCenterTabs.length / 2));
  const rightTabs = nonCenterTabs.slice(Math.ceil(nonCenterTabs.length / 2));

  return (
    <nav
      role="tablist"
      aria-label="Primary navigation"
      aria-hidden={hidden}
      className={clsx(
        "fixed inset-x-0 bottom-0 z-50 border-t bg-card text-foreground backdrop-blur-md shadow-lg",
        hidden && "pointer-events-none opacity-0",
        className
      )}
    >
      <div className="relative mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <div className="flex flex-1 items-center justify-start gap-2">
          {leftTabs.map((tab) => (
            <TabItem
              key={tab.id}
              label={tab.label}
              icon={tab.icon}
              badgeCount={tab.badgeCount}
              isActive={tab.isActive}
              disabled={tab.disabled}
              onActivate={() => onTabActivate(tab.id)}
            />
          ))}
        </div>

        <div className="pointer-events-none absolute inset-x-0 -top-5 flex justify-center">
          <div className="pointer-events-auto">{centerSlot}</div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-2">
          {rightTabs.map((tab) => (
            <TabItem
              key={tab.id}
              label={tab.label}
              icon={tab.icon}
              badgeCount={tab.badgeCount}
              isActive={tab.isActive}
              disabled={tab.disabled}
              onActivate={() => onTabActivate(tab.id)}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}
