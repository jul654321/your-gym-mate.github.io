import { Button } from "../ui/button";

export interface CreateSessionFABProps {
  onCreate?: () => void;
  onInstantiate?: () => void;
  disabled?: boolean;
}

export function CreateSessionFAB({
  onCreate,
  onInstantiate,
  disabled = false,
}: CreateSessionFABProps) {
  return (
    <div className="fixed inset-x-4 bottom-6 z-40 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto flex flex-col gap-2 rounded-2xl bg-white/90 p-3 shadow-2xl shadow-teal-900/10 backdrop-blur">
        <Button
          onClick={onCreate}
          disabled={disabled || !onCreate}
          size="lg"
          className="w-64"
        >
          Create New Session
        </Button>
        <Button
          onClick={onInstantiate}
          disabled={disabled || !onInstantiate}
          variant="outline"
          className="w-64"
        >
          Start From Plan
        </Button>
      </div>
    </div>
  );
}
