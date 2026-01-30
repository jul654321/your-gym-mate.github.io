import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { useDbInit } from "../hooks/useDbInit";
import { useSessionViewModel } from "../hooks/useSessionViewModel";
import { SessionHeader } from "../components/sessionDetail/SessionHeader";
import { LoggedSetsList } from "../components/sessionDetail/LoggedSetsList";
import { EditSetModal } from "../components/sessionDetail/EditSetModal.tsx";
import type { LoggedSetDTO } from "../types";

export function SessionView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { ready } = useDbInit();
  const viewModel = useSessionViewModel(sessionId);
  const [editingSet, setEditingSet] = useState<LoggedSetDTO | null>(null);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="rounded-2xl bg-white p-6 text-center shadow">
          <p className="text-lg font-semibold text-slate-900">
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-6 shadow">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-slate-600">Loading session details…</p>
        </div>
      </div>
    );
  }

  if (viewModel.isSessionMissing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md space-y-4 rounded-2xl bg-white p-6 text-center shadow">
          <p className="text-xl font-semibold text-slate-900">
            Session not found
          </p>
          <p className="text-sm text-slate-500">
            The session you are trying to open either was deleted or does not
            exist.
          </p>
          <Link
            to="/sessions"
            className="inline-flex rounded-md bg-secondary px-4 py-2 text-sm font-semibold text-slate-900"
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
    isFetchingMoreSets: fetchingMoreSets,
    hasMoreSets,
    isMutating,
  } = viewModel;

  const handleAddSet = (exerciseId: string) => {
    actions.addSet(exerciseId);
  };

  const handleEditSet = (_setId: string, set: LoggedSetDTO) => {
    setEditingSet(set);
  };

  const handleDeleteSet = (setId: string) => {
    actions.deleteSet(setId);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SessionHeader
        key={session?.id}
        session={session}
        isBusy={viewModel.isMutating}
        onRename={actions.renameSession}
      />
      <div className="mx-auto mt-6 flex max-w-5xl flex-col gap-6 px-4">
        <LoggedSetsList
          groupedSets={groupedExercises}
          onAddSet={handleAddSet}
          onEditSet={handleEditSet}
          onDeleteSet={handleDeleteSet}
          onLoadMore={actions.loadMoreSets}
          hasMore={hasMoreSets}
          isLoading={loadingSets}
          isFetchingMore={fetchingMoreSets}
          isMutating={isMutating}
        />
        {editingSet && (
          <EditSetModal
            key={editingSet.id}
            set={editingSet}
            onClose={() => setEditingSet(null)}
          />
        )}
      </div>
    </div>
  );
}
