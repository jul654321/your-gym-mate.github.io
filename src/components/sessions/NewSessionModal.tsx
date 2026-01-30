import { FormEvent, useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { usePlans } from "../../hooks/usePlans";

interface NewSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    name: string,
    basedOnPlanId?: string | null,
    planName?: string | null
  ) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function NewSessionModal({
  isOpen,
  onClose,
  onCreate,
  isLoading = false,
  error,
}: NewSessionModalProps) {
  const [name, setName] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const {
    data: plans = [],
    isLoading: isPlansLoading,
    error: plansError,
  } = usePlans({ sort: "name" });

  useEffect(() => {
    if (isOpen) {
      setName("");
      setSelectedPlanId("");
    }
  }, [isOpen]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onCreate(
      name,
      selectedPlanId || undefined,
      plans.find((plan) => plan.id === selectedPlanId)?.name || undefined
    );
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-current/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-editor-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <form
          className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl"
          onSubmit={handleSubmit}
        >
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
            <h2
              id="new-session-title"
              className="text-2xl font-bold text-gray-900"
            >
              Create New Session
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          </div>

          <div className="p-6">
            <p className="mt-2 text-sm text-slate-500">
              Give your session a name (required). Leave blank to auto-generate
              one based on today’s date.
            </p>

            <div className="mt-4">
              <label className="sr-only" htmlFor="new-session-name">
                Session name
              </label>
              <Input
                id="new-session-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Session name"
              />
            </div>

            {error && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                <label htmlFor="session-plan">Base plan</label>
                <span className="text-xs text-slate-400">optional</span>
              </div>
              <select
                id="session-plan"
                value={selectedPlanId}
                onChange={(event) => setSelectedPlanId(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                disabled={isPlansLoading}
              >
                <option value="">No plan — start from scratch</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
              {plansError && (
                <p className="text-xs text-red-500">
                  Unable to load plans: {plansError.message}
                </p>
              )}
              {!isPlansLoading && plans.length === 0 && (
                <p className="text-xs text-slate-400">
                  You haven’t created any plans yet.
                </p>
              )}
              <p className="text-xs text-slate-400">
                Choosing a plan copies its exercise order into the new session.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading} className="px-6">
              Create Session
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
