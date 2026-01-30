import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useInstantiateSessionFromPlan,
  useDeletePlan,
} from "../../hooks/usePlans";
import { ConfirmDeleteModal } from "../shared/ConfirmDeleteModal";
import { v4 as uuidv4 } from "uuid";
import type { PlanDTO } from "../../types";

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
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <span className="font-medium">{exerciseCount}</span>
                <span>{exerciseCount === 1 ? "exercise" : "exercises"}</span>
              </span>
              {plan.notes && (
                <span className="text-gray-500" title={plan.notes}>
                  📝 Notes
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Instantiate button */}
            <button
              onClick={handleInstantiate}
              disabled={!dbReady || instantiateMutation.isPending}
              className="px-4 py-2 bg-teal-600 text-white rounded-md font-medium hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              aria-label={`Start workout from ${plan.name}`}
            >
              {instantiateMutation.isPending ? "Starting..." : "Start Workout"}
            </button>

            {/* Overflow menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="More options"
                aria-expanded={showMenu}
                aria-haspopup="true"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </button>

              {/* Dropdown menu */}
              {showMenu && (
                <>
                  {/* Backdrop to close menu */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 py-1 border border-gray-200">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onEdit(plan.id);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowDeleteModal(true);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
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
