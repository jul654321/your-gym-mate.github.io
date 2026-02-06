import { PlanRow } from "./PlanRow";
import type { PlanDTO } from "../../types";
import { Button } from "../ui/button";

interface PlanListProps {
  plans: PlanDTO[];
  onEdit: (planId: string) => void;
  dbReady: boolean;
  isLoading: boolean;
  error: Error | null;
  handleCreateClick: () => void;
}

export function PlanList({
  plans,
  onEdit,
  dbReady,
  isLoading,
  error,
  handleCreateClick,
}: PlanListProps) {
  return (
    <section aria-live="polite">
      <h2 className="text-lg font-semibold text-slate-900">
        Plans ({plans.length})
      </h2>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-gray-600">Loading plans...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded">
          <p className="text-red-800">Failed to load plans: {error.message}</p>
        </div>
      )}

      {/* Plans list */}
      {!isLoading && !error && (
        <div className="mt-4 space-y-3">
          {plans.map((plan) => (
            <PlanRow
              key={plan.id}
              plan={plan}
              onEdit={onEdit}
              dbReady={dbReady}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && plans.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-6xl mb-4">🏋️</div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            No plans yet
          </h2>
          <p className="text-gray-600 mb-6">
            Create your first workout plan to get started
          </p>
          <Button onClick={handleCreateClick} disabled={!dbReady} size="lg">
            Create Your First Plan
          </Button>
        </div>
      )}
    </section>
  );
}
