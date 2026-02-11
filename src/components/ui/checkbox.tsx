import { Check } from "lucide-react";
import { cn } from "../../lib/utils/cn";

export interface CheckboxProps extends React.ComponentProps<"input"> {
  hasError?: boolean;
  children?: React.ReactNode;
}

export function Checkbox({
  className,
  hasError = false,
  children,
  ...props
}: CheckboxProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center relative">
        <input
          type="checkbox"
          className="w-4 h-4 opacity-0 relative z-1"
          {...props}
        />
        <div
          className={cn(
            "absolute left-0 top-0 flex items-center justify-center w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary bg-secondary z-0",
            hasError
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-600 focus:ring-primary/60",
            className
          )}
        >
          <Check
            className={cn("w-3 h-3", props.checked ? "visible" : "invisible")}
          />
        </div>
      </div>
      {children}
    </div>
  );
}
