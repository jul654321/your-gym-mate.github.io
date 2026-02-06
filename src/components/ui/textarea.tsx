import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils/cn";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, hasError = false, rows = 2, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex h-30 w-full rounded-md border bg-card px-3 py-2 text-sm text-card-foreground transition duration-150 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
          hasError
            ? "border-red-500 focus-visible:ring-red-500"
            : "border-gray-600 focus-visible:ring-primary/60",
          className
        )}
        rows={rows}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
