import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  clickable?: boolean;
  cardHeader?: ReactNode;
  cardFooter?: ReactNode;
  theme?: "default" | "secondary";
}

export function Card({
  children,
  className,
  clickable = false,
  cardHeader,
  cardFooter,
  theme = "default",
  ...props
}: CardProps) {
  return (
    <article
      className={cn(
        "rounded-2xl bg-card p-4 shadow-sm flex flex-col gap-2 text-foreground",
        clickable && "cursor-pointer transition hover:shadow-lg",
        theme === "secondary" && "bg-secondary",
        theme === "secondary" && "text-secondary-foreground",
        className
      )}
      {...props}
    >
      {cardHeader && (
        <header className="flex items-start text-foreground gap-4 justify-between text-md font-semibold">
          {cardHeader}
        </header>
      )}
      {children && <main>{children}</main>}
      {cardFooter && (
        <footer className="flex items-start gap-4 justify-between">
          {cardFooter}
        </footer>
      )}
    </article>
  );
}
