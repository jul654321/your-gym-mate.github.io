import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils/cn";

interface SectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
  headerTitle?: ReactNode;
}

export function SectionHeader({
  headerTitle,
  children = null,
  className = "",
  ...props
}: SectionHeaderProps) {
  return (
    <header
      className={cn(
        "text-foreground container mx-auto px-4 py-2 flex items-center gap-2",
        children ? "justify-between" : "justify-center",
        className
      )}
      {...props}
    >
      {headerTitle ? (
        <h1 className="text-lg text-muted-foreground text-center whitespace-nowrap overflow-hidden text-ellipsis">
          {headerTitle}
        </h1>
      ) : null}
      {children ? (
        <div className="flex items-center gap-2">{children}</div>
      ) : null}
    </header>
  );
}
