import { useState } from "react";
import { SectionHeader } from "../components/layouts/SectionHeader";
import { CreatePlanFAB } from "../components/plans/CreatePlanFAB";
import { PlanEditor } from "../components/plans/PlanEditor";
import { PlanList } from "../components/plans/PlanList";
import { Button } from "../components/ui/button";
import { useDbInit } from "../hooks/useDbInit";
import { usePlans } from "../hooks/usePlans";
import type { PlansQueryParams } from "../types";
import { Plus } from "lucide-react";
import { SectionMain } from "../components/layouts/SectionMain";

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
    <div className="min-h-screen bg-background">
      <SectionHeader headerTitle="Workout Plans"></SectionHeader>

      <SectionMain>
        <PlanList
          plans={plans}
          onEdit={handleEditPlan}
          dbReady={isInitialized}
          isLoading={isLoading}
          error={error}
          handleCreateClick={handleCreateClick}
        />
        <Button
          onClick={handleCreateClick}
          disabled={!isInitialized}
          variant="primary"
          size="md"
          className="w-full"
        >
          <Plus className="h-4 w-4" aria-hidden /> Create New Plan
        </Button>
      </SectionMain>

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
