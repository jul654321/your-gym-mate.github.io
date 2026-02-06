import { cn } from "../../lib/utils/cn";
import { forwardRef, type LabelHTMLAttributes } from "react";

export const Label = forwardRef<
  HTMLLabelElement,
  LabelHTMLAttributes<HTMLLabelElement>
>(function Label({ children, className, ...props }, ref) {
  return (
    <label
      ref={ref}
      className={cn(
        "block text-sm font-medium text-muted-foreground mb-1",
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
});
