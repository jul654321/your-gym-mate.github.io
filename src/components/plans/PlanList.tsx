import { PlanRow } from "./PlanRow";
import type { PlanDTO } from "../../types";

interface PlanListProps {
  plans: PlanDTO[];
  onEdit: (planId: string) => void;
  dbReady: boolean;
}

export function PlanList({ plans, onEdit, dbReady }: PlanListProps) {
  return (
    <div className="space-y-4">
      {plans.map((plan) => (
        <PlanRow key={plan.id} plan={plan} onEdit={onEdit} dbReady={dbReady} />
      ))}
    </div>
  );
}
