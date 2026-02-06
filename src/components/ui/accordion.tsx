import { useState, type HTMLAttributes } from "react";
import { Button } from "./button";
import { cn } from "../../lib/utils/cn";

interface AccordionProps extends HTMLAttributes<HTMLDivElement> {
  accordionTitle?: string;
  accordionSubTitle?: string;
  headerContent?: React.ReactNode;
}

export function Accordion({
  accordionTitle,
  accordionSubTitle,
  children,
  headerContent,
  ...props
}: AccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section
      role="region"
      aria-labelledby={accordionTitle}
      {...props}
      className="flex flex-col bg-background rounded-lg p-4 gap-4"
    >
      <div className="w-full flex flex-col items-start justify-between gap-3">
        <header
          className="flex items-center gap-3 w-full"
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "w-4 h-4 max-w-4 max-h-4 transition-transform duration-200",
              isExpanded ? "rotate-90" : ""
            )}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Button>

          {headerContent ? (
            <div className="flex flex-grow items-start justify-between gap-3">
              {headerContent}
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-foreground">
                {accordionTitle}
              </p>
              {accordionSubTitle && (
                <p className="text-xs text-muted-foreground">
                  {accordionSubTitle}
                </p>
              )}
            </div>
          )}
        </header>

        <main
          className={cn("w-full flex gap-1", isExpanded ? "block" : "hidden")}
        >
          {children}
        </main>
      </div>
    </section>
  );
}
