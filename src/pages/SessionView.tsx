import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { useDbInit } from "../hooks/useDbInit";
import { useSessionViewModel } from "../hooks/useSessionViewModel";
import { SessionHeader } from "../components/sessionDetail/SessionHeader";
import { LoggedSetsList } from "../components/sessionDetail/LoggedSetsList";
import { EditSetModal } from "../components/sessionDetail/EditSetModal.tsx";
import type { LoggedSetDTO } from "../types";
import { SectionMain } from "../components/layouts/SectionMain.tsx";

export function SessionView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { ready } = useDbInit();
  const viewModel = useSessionViewModel(sessionId);
  const [editingSet, setEditingSet] = useState<LoggedSetDTO | null>(null);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="rounded-2xl p-6 text-center shadow">
          <p className="text-lg font-semibold text-muted-foreground">
            No session selected
          </p>
          <p className="text-sm text-slate-500">
            Please go back to the sessions list and pick one to view its
            details.
          </p>
          <Link
            to="/sessions"
            className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Back to sessions
          </Link>
        </div>
      </div>
    );
  }

  if (!ready || viewModel.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 rounded-2xl p-6 shadow">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-slate-600">Loading session details…</p>
        </div>
      </div>
    );
  }

  if (viewModel.isSessionMissing) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md space-y-4 rounded-2xl p-6 text-center shadow">
          <p className="text-xl font-semibold text-muted-foreground">
            Session not found
          </p>
          <p className="text-sm text-slate-500">
            The session you are trying to open either was deleted or does not
            exist.
          </p>
          <Link
            to="/sessions"
            className="inline-flex rounded-md bg-secondary px-4 py-2 text-sm font-semibold text-muted-foreground"
          >
            Return to sessions
          </Link>
        </div>
      </div>
    );
  }

  const {
    groupedExercises,
    session,
    actions,
    isLoadingSets: loadingSets,
    isMutating,
  } = viewModel;

  const handleAddSet = (exerciseId: string) => {
    actions.addSet(exerciseId);
  };

  const handleCopySet = (setId: string) => {
    actions.copySet(setId);
  };

  const handleEditSet = (_setId: string, set: LoggedSetDTO) => {
    setEditingSet(set);
  };

  const handleDeleteSet = (setId: string) => {
    actions.deleteSet(setId);
  };

  const handleToggleSetStatus = (setId: string) => {
    actions.toggleSetStatus(setId);
  };

  return (
    <>
      <SessionHeader
        key={session?.id}
        session={session}
        isBusy={viewModel.isMutating}
        onRename={actions.renameSession}
      />
      <SectionMain>
        <LoggedSetsList
          groupedSets={groupedExercises}
          onAddSet={handleAddSet}
          onCopySet={handleCopySet}
          onEditSet={handleEditSet}
          onDeleteSet={handleDeleteSet}
          onToggleSetStatus={handleToggleSetStatus}
          isLoading={loadingSets}
          isMutating={isMutating}
        />
        {editingSet && (
          <EditSetModal
            key={editingSet.id}
            set={editingSet}
            onClose={() => setEditingSet(null)}
          />
        )}
      </SectionMain>
    </>
  );
}
