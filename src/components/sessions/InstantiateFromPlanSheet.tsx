import { useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { usePlans, useInstantiateSessionFromPlan } from "../../hooks/usePlans";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";

interface InstantiateFromPlanSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstantiateFromPlanSheet({
  isOpen,
  onClose,
}: InstantiateFromPlanSheetProps) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [instantiatingPlanId, setInstantiatingPlanId] = useState<string | null>(
    null
  );
  const { data: plans = [], isLoading, error: plansError } = usePlans();
  const instantiate = useInstantiateSessionFromPlan();
  const navigate = useNavigate();

  const filteredPlans = useMemo(() => {
    if (!query.trim()) {
      return plans;
    }
    const normalized = query.trim().toLowerCase();
    return plans.filter((plan) => plan.name.toLowerCase().includes(normalized));
  }, [plans, query]);

  const handleInstantiate = (planId: string) => {
    setError(null);
    setInstantiatingPlanId(planId);
    const sessionId = uuidv4();
    instantiate.mutate(
      { id: sessionId, planId },
      {
        onSuccess: (session) => {
          setInstantiatingPlanId(null);
          navigate(`/sessions/${session.id}`);
          onClose();
        },
        onError: (err) => {
          setInstantiatingPlanId(null);
          setError(
            err instanceof Error ? err.message : "Failed to instantiate plan."
          );
        },
      }
    );
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 py-6">
      <div
        className="absolute inset-0 bg-slate-900/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-2xl rounded-t-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-muted-foreground">
              Instantiate From Plan
            </h2>
            <p className="text-sm text-slate-500">
              Pick a plan to pre-populate a new session.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-200"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="mt-4">
          <label className="sr-only" htmlFor="plan-search">
            Search plans
          </label>
          <Input
            id="plan-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search plans"
          />
        </div>

        {plansError && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Unable to load plans: {plansError.message}
          </div>
        )}

        <div className="mt-4 space-y-4 overflow-y-auto pr-2">
          {isLoading && (
            <p className="text-sm text-slate-500">Loading plans…</p>
          )}
          {!isLoading && filteredPlans.length === 0 && (
            <p className="text-sm text-slate-500">
              No plans match your search.
            </p>
          )}

          {filteredPlans.map((plan) => (
            <article
              key={plan.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-muted-foreground">
                    {plan.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {plan.planExercises.length} exercises · Created{" "}
                    {new Intl.DateTimeFormat("en-US").format(
                      new Date(plan.createdAt)
                    )}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleInstantiate(plan.id)}
                  disabled={
                    instantiatingPlanId !== null &&
                    instantiatingPlanId !== plan.id
                  }
                  isLoading={instantiatingPlanId === plan.id}
                >
                  Instantiate
                </Button>
              </div>
            </article>
          ))}
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
