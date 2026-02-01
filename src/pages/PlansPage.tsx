import { useState } from "react";
import { CreatePlanFAB } from "../components/plans/CreatePlanFAB";
import { PlanEditor } from "../components/plans/PlanEditor";
import { PlanList } from "../components/plans/PlanList";
import { Button } from "../components/ui/button";
import { useDbInit } from "../hooks/useDbInit";
import { usePlans } from "../hooks/usePlans";
import type { PlansQueryParams } from "../types";

export function PlansPage() {
  const { isInitialized } = useDbInit();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | undefined>();

  const queryParams: PlansQueryParams = {
    sort: "createdAt",
  };

  const { data: plans = [], isLoading, error } = usePlans(queryParams);

  const handleCreateClick = () => {
    setEditingPlanId(undefined);
    setIsEditorOpen(true);
  };

  const handleEditPlan = (planId: string) => {
    setEditingPlanId(planId);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingPlanId(undefined);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">Workout Plans</h1>
        </div>
      </header>

      <main className="flex flex-col gap-6 container mx-auto px-4 py-6">
        <Button
          className="w-full "
          onClick={handleCreateClick}
          disabled={!isInitialized}
        >
          Create New Plan
        </Button>

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
            <p className="text-red-800">
              Failed to load plans: {error.message}
            </p>
          </div>
        )}

        {/* Plans list */}
        {!isLoading && !error && (
          <PlanList
            plans={plans}
            onEdit={handleEditPlan}
            dbReady={isInitialized}
          />
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
            <Button
              onClick={handleCreateClick}
              disabled={!isInitialized}
              size="lg"
            >
              Create Your First Plan
            </Button>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <CreatePlanFAB onClick={handleCreateClick} disabled={!isInitialized} />

      {/* Plan Editor Modal */}
      {isEditorOpen && (
        <PlanEditor
          planId={editingPlanId}
          onClose={handleCloseEditor}
          onSaved={handleCloseEditor}
        />
      )}
    </div>
  );
}
