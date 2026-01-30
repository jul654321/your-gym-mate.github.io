interface CreatePlanFABProps {
  onClick: () => void;
  disabled?: boolean;
}

export function CreatePlanFAB({
  onClick,
  disabled = false,
}: CreatePlanFABProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="fixed bottom-6 right-6 w-14 h-14 bg-teal-600 text-white rounded-full shadow-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all hover:scale-110 focus:outline-none focus:ring-4 focus:ring-teal-300"
      aria-label="Create new plan"
      title={disabled ? "Database not ready" : "Create new plan"}
    >
      <svg
        className="w-6 h-6 mx-auto"
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
    </button>
  );
}
