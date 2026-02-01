import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, hasError = false, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 transition duration-150 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
          hasError
            ? "border-red-500 focus-visible:ring-red-500"
            : "border-slate-200 focus-visible:ring-primary/60",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
