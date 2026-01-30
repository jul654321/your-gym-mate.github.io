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

interface PlanRowProps {
  plan: PlanDTO;
  onEdit: (planId: string) => void;
  dbReady: boolean;
}

export function PlanRow({ plan, onEdit, dbReady }: PlanRowProps) {
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const instantiateMutation = useInstantiateSessionFromPlan();
  const deleteMutation = useDeletePlan();

  const handleInstantiate = async () => {
    try {
      const sessionId = uuidv4();
      const result = await instantiateMutation.mutateAsync({
        id: sessionId,
        planId: plan.id,
        createdAt: Date.now(),
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
      <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <span className="font-medium">{exerciseCount}</span>
                  <span>{exerciseCount === 1 ? "exercise" : "exercises"}</span>
                </span>
                {plan.notes && (
                  <span className="text-secondary0" title={plan.notes}>
                    📝 Notes
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleInstantiate}
                  disabled={!dbReady || instantiateMutation.isPending}
                  variant="ghost"
                  size="icon"
                  aria-label={`Start workout from ${plan.name}`}
                >
                  <Play className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  onClick={() => {
                    setShowMenu(false);
                    onEdit(plan.id);
                  }}
                  variant="ghost"
                  size="icon"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  onClick={() => {
                    setShowMenu(false);
                    setShowDeleteModal(true);
                  }}
                  variant="ghost"
                  size="icon"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

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
