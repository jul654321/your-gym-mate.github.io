import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../../lib/utils/cn";

export interface InputErrorProps extends HTMLAttributes<HTMLParagraphElement> {
  message: string;
}

export const InputError = forwardRef<HTMLInputElement, InputErrorProps>(
  function InputError({ className, message, ...props }, ref) {
    return (
      <p ref={ref} className={cn("text-xs text-red-400", className)} {...props}>
        {message}
      </p>
    );
  }
);

InputError.displayName = "InputError";
