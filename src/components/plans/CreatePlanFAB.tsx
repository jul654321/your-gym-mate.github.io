import { Button } from "../ui/button";

interface CreatePlanFABProps {
  onClick: () => void;
  disabled?: boolean;
}

export function CreatePlanFAB({
  onClick,
  disabled = false,
}: CreatePlanFABProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant="icon"
      size="icon"
      className="fixed bottom-6 right-6 shadow-2xl"
      aria-label="Create new plan"
      title={disabled ? "Database not ready" : "Create new plan"}
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg>
    </Button>
  );
}
