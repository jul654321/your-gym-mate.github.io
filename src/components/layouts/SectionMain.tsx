import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils/cn";

interface SectionMainProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function SectionMain({
  children,
  className = "",
  ...props
}: SectionMainProps) {
  return (
    <main
      className={cn(
        "relative z-2 container mx-auto px-4 pt-2 pb-4 space-y-6 overflow-y-auto",
        className
      )}
      {...props}
    >
      {children}
    </main>
  );
}
