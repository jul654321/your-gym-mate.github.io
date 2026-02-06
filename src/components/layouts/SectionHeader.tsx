import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils/cn";

interface SectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
  headerTitle?: ReactNode;
}

export function SectionHeader({
  headerTitle,
  children = null,
  ...props
}: SectionHeaderProps) {
  return (
    <header
      className={cn(
        "bg-primary text-primary-foreground border-b border-gray-200",
        props.className
      )}
      {...props}
    >
      <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-2">
        {headerTitle ? (
          <h1 className="text-lg font-semibold">{headerTitle}</h1>
        ) : null}
        {children ? (
          <div className="flex items-center gap-2">{children}</div>
        ) : null}
      </div>
    </header>
  );
}
