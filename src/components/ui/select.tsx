import { cn } from "../../lib/utils/cn";

export interface SelectProps extends React.ComponentProps<"select"> {
  hasError?: boolean;
}

export function Select({
  children,
  hasError = false,
  className,
  ...props
}: SelectProps) {
  return (
    <select
      className={cn(
        "flex h-11 w-full rounded-md border bg-card px-3 py-2 text-sm text-card-foreground transition duration-150 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        hasError
          ? "border-red-500 focus-visible:ring-red-500"
          : "border-gray-600 focus-visible:ring-primary/60",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
