import { Link2, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  useDeletePlan,
  useInstantiateSessionFromPlan,
} from "../../hooks/usePlans";
import {
  getWeekdayLongName,
  getWeekdayShortName,
} from "../../lib/utils/weekdays";
import { getWorkoutTypeLabel } from "../../lib/utils/workoutTypes";
import type { PlanDTO, PlanExerciseGuideLinkDTO } from "../../types";
import { ConfirmDeleteModal } from "../shared/ConfirmDeleteModal";
import { GuideLinksModal } from "../shared/GuideLinksModal";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

interface PlanRowProps {
  plan: PlanDTO;
  onEdit: (planId: string) => void;
  dbReady: boolean;
}

export function PlanRow({ plan, onEdit, dbReady }: PlanRowProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedGuideLinks, setSelectedGuideLinks] = useState<
    PlanExerciseGuideLinkDTO[] | null
  >(null);
  const weekdayShort = getWeekdayShortName(plan.weekday ?? null);
  const weekdayLong = getWeekdayLongName(plan.weekday ?? null);
  const workoutTypeLabel = getWorkoutTypeLabel(plan.workoutType ?? null);

  const instantiateMutation = useInstantiateSessionFromPlan();
  const deleteMutation = useDeletePlan();

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
            <div className="flex items-center gap-3 min-w-0">
              <span className="whitespace-nowrap text-ellipsis overflow-hidden">
                {plan.name || "Untitled Plan"} {weekdayLong ?? weekdayShort}
              </span>
            </div>
          </>
        }
        cardFooter={
          <>
            <div className="flex flex-col">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>{exerciseCount}</span>
                <span>{exerciseCount === 1 ? "exercise" : "exercises"}</span>
              </span>
              {workoutTypeLabel && (
                <span
                  className="text-xs text-primary"
                  aria-label={`Workout type: ${workoutTypeLabel}`}
                >
                  {workoutTypeLabel}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {plan.planExercises.some(
                (pe) => pe.guideLinks?.length ?? 0 > 0
              ) && (
                <Button
                  variant="secondary"
                  size="icon-small"
                  onClick={() => {
                    setSelectedGuideLinks(
                      plan.planExercises.flatMap((pe) => pe.guideLinks ?? [])
                    );
                  }}
                  disabled={!dbReady || instantiateMutation.isPending}
                  aria-label={`Start workout from ${plan.name}`}
                >
                  <Link2 className="h-4 w-4" aria-hidden />
                </Button>
              )}
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

      {!!selectedGuideLinks && selectedGuideLinks.length > 0 && (
        <GuideLinksModal
          guideLinks={selectedGuideLinks}
          onClose={() => {
            setSelectedGuideLinks(null);
          }}
        />
      )}
    </>
  );
}
