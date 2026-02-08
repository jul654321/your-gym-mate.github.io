import { PlanRow } from "./PlanRow";
import type { PlanDTO } from "../../types";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

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
      <h2 className="text-lg font-semibold text-muted-foreground">
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
      {!isLoading && !error && plans.length > 0 && (
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
        <Card theme="secondary" className="text-center mt-4">
          <div className="text-6xl mb-4">🏋️</div>
          <h2 className="text-lg font-semibold text-muted-foreground mb-2">
            No plans logged yet
          </h2>
          <p className="text-muted-foreground mb-6">
            Start your first workout plan
          </p>
        </Card>
      )}
    </section>
  );
}
