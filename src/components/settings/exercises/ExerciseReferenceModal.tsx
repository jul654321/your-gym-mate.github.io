import { Button } from "../../ui/button";
import { Modal } from "../../shared/Modal";
import type { ExerciseReferenceCheckResult } from "../../../types";

interface ExerciseReferenceModalProps {
  open: boolean;
  exerciseName: string;
  referenceResult: ExerciseReferenceCheckResult | null;
  onClose: () => void;
}

export function ExerciseReferenceModal({
  open,
  exerciseName,
  referenceResult,
  onClose,
}: ExerciseReferenceModalProps) {
  if (!open || !referenceResult) {
    return null;
  }

  const hasPlans = referenceResult.plans.length > 0;
  const hasSessions = referenceResult.sessions.length > 0;

  return (
    <Modal
      title={`Cannot delete ${exerciseName}`}
      onClose={onClose}
      actionButtons={[
        <Button key="close" variant="primary" onClick={onClose}>
          Got it
        </Button>,
      ]}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This exercise is still referenced by other content. Remove those
          references first, then try again.
        </p>

        <div className="rounded-2xl border border-border/50 bg-muted/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            References
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <strong>{referenceResult.plans.length}</strong> plan
              {referenceResult.plans.length === 1 ? "" : "s"} reference
            </li>
            <li>
              <strong>{referenceResult.sessions.length}</strong> session
              {referenceResult.sessions.length === 1 ? "" : "s"} touched
            </li>
            <li>
              <strong>{referenceResult.loggedSetsCount}</strong> logged-set
              {referenceResult.loggedSetsCount === 1 ? "" : "s"}
            </li>
          </ul>
        </div>

        {hasPlans && (
          <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Plans using this exercise
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {referenceResult.plans.map((plan) => (
                <li key={plan.planId} className="flex items-center justify-between">
                  <span>{plan.planName}</span>
                  <a
                    href={`/plans/${plan.planId}`}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    View
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasSessions && (
          <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Sessions affected
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {referenceResult.sessions.map((session) => (
                <li key={session.sessionId} className="flex items-center justify-between">
                  <span>{session.sessionName ?? "Untitled session"}</span>
                  <a
                    href={`/sessions/${session.sessionId}`}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    View session
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
