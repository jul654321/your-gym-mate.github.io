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
        "container mx-auto px-4 pt-2 pb-26 flex flex-col gap-4 overflow-y-auto",
        className
      )}
      {...props}
    >
      {children}
    </main>
  );
}
