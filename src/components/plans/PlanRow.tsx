import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useInstantiateSessionFromPlan,
  useDeletePlan,
} from "../../hooks/usePlans";
import { ConfirmDeleteModal } from "../shared/ConfirmDeleteModal";
import { v4 as uuidv4 } from "uuid";
import type { PlanDTO } from "../../types";
import { Button } from "../ui/button";
import { Pencil, Play, Trash2 } from "lucide-react";
import { inferSessionName } from "../../lib/utils/sessionName";
import { Card } from "../ui/card";

interface PlanRowProps {
  plan: PlanDTO;
  onEdit: (planId: string) => void;
  dbReady: boolean;
}

export function PlanRow({ plan, onEdit, dbReady }: PlanRowProps) {
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const instantiateMutation = useInstantiateSessionFromPlan();
  const deleteMutation = useDeletePlan();

  const handleInstantiate = async () => {
    try {
      const sessionId = uuidv4();
      const result = await instantiateMutation.mutateAsync({
        id: sessionId,
        planId: plan.id,
        createdAt: Date.now(),
        overrides: { name: inferSessionName(undefined, plan.name, Date.now()) },
      });

      // Navigate to the new session
      navigate(`/sessions/${result.id}`);
    } catch (error) {
      console.error("Failed to instantiate session:", error);
      // TODO: Show error toast
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ id: plan.id });
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Failed to delete plan:", error);
      // TODO: Show error toast
    }
  };

  const exerciseCount = plan.planExercises.length;

  return (
    <>
      <Card
        role="listitem"
        cardHeader={
          <>
            <span className="text-md font-semibold text-slate-900 whitespace-nowrap text-ellipsis overflow-hidden">
              {plan.name || "Untitled Plan"}
            </span>
            <Button
              onClick={handleInstantiate}
              disabled={!dbReady || instantiateMutation.isPending}
              variant="primary"
              size="icon-small"
              aria-label={`Start workout from ${plan.name}`}
            >
              <Play className="h-4 w-4" aria-hidden />
            </Button>
          </>
        }
        cardFooter={
          <>
            <span className="flex items-center gap-1">
              <span className="font-medium">{exerciseCount}</span>
              <span>{exerciseCount === 1 ? "exercise" : "exercises"}</span>
            </span>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  onEdit(plan.id);
                }}
                variant="secondary"
                size="icon-small"
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                onClick={() => {
                  setShowDeleteModal(true);
                }}
                variant="destructive"
                size="icon-small"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </>
        }
      >
        {plan.notes && (
          <span className="text-secondary0" title={plan.notes}>
            📝 Notes
          </span>
        )}
      </Card>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <ConfirmDeleteModal
          itemName={plan.name}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </>
  );
}
