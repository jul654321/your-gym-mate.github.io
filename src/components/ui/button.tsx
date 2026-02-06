import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils/cn";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "link"
  | "destructive"
  | "icon";

type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-small";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-dark focus-visible:ring-primary/70 focus-visible:ring-offset-2 cursor-pointer",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary focus-visible:ring-slate-200 focus-visible:ring-offset-2 cursor-pointer",
  ghost:
    "bg-transparent text-muted-foreground hover:bg-slate-50 focus-visible:ring-slate-200 focus-visible:ring-offset-2 cursor-pointer",
  outline:
    "border border-slate-200 text-muted-foreground hover:bg-slate-50 focus-visible:ring-slate-200 focus-visible:ring-offset-2 cursor-pointer",
  link: "bg-transparent text-primary underline-offset-4 hover:underline focus-visible:ring-offset-0 focus-visible:ring-transparent",
  destructive:
    "bg-secondary text-red-500 hover:bg-secondary focus-visible:ring-red-500 focus-visible:ring-offset-2 cursor-pointer",
  icon: "rounded-full bg-white shadow-sm hover:bg-slate-100 focus-visible:ring-primary/70 focus-visible:ring-offset-2 cursor-pointer  ",
};

const sizeStyles: Record<ButtonSize | "ghost", string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10 px-0",
  "icon-small": "h-8 w-8",
  ghost: "h-auto w-auto px-0",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      className,
      isLoading = false,
      disabled,
      type = "button",
      children,
      ...props
    }: ButtonProps,
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-semibold transition duration-150 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60",
          variantStyles[variant],
          variant === "ghost" ? sizeStyles.ghost : sizeStyles[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <span className="mr-2 h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        )}
        {children}
      </button>
    );
  }
);
