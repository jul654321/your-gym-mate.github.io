import clsx from "clsx";
import { Plus } from "lucide-react";

export interface CenterFABProps {
  onOpen: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

export function CenterFAB({
  onOpen,
  disabled = false,
  ariaLabel = "Open quick log",
  className,
}: CenterFABProps) {
  const handleClick = () => {
    if (disabled) {
      return;
    }
    onOpen();
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-controls="quick-log-modal"
      aria-haspopup="dialog"
      className={clsx(
        "flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-primary/50 transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus-visible:ring-offset-white",
        disabled
          ? "cursor-not-allowed opacity-60 hover:scale-100"
          : "hover:scale-[1.05] active:scale-95",
        className
      )}
      onClick={handleClick}
      disabled={disabled}
    >
      <Plus className="h-6 w-6" aria-hidden />
    </button>
  );
}
