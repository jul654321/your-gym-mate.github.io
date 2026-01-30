import { Link, useParams } from "react-router-dom";
import { useDbInit } from "../hooks/useDbInit";
import { useSessionViewModel } from "../hooks/useSessionViewModel";
import { SessionHeader } from "../components/sessionDetail/SessionHeader";

export function SessionView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { ready } = useDbInit();
  const viewModel = useSessionViewModel(sessionId);

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

  const { totals, groupedExercises, session } = viewModel;
  const totalVolume = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(totals.totalVolume);

  return (
    <div className="min-h-screen bg-slate-50 py-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4">
        <SessionHeader
          session={session}
          isBusy={viewModel.isMutating}
          onRename={viewModel.actions.renameSession}
          onToggleStatus={viewModel.actions.toggleStatus}
          onDelete={viewModel.actions.deleteSession}
        />

        <section className="rounded-2xl bg-white p-5 shadow">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Total volume
              </p>
              <p className="text-3xl font-semibold text-slate-900">
                {totalVolume}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Sets logged
              </p>
              <p className="text-3xl font-semibold text-slate-900">
                {totals.totalSets}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Logged Sets
              </p>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                {groupedExercises.length} exercises
              </p>
            </div>
          </div>

          {groupedExercises.length === 0 ? (
            <p className="text-sm text-slate-500">
              No sets logged yet. Use Quick Add to capture your first set.
            </p>
          ) : (
            <div className="space-y-4">
              {groupedExercises.map((group) => (
                <div
                  key={group.exerciseId}
                  className="rounded-2xl border border-slate-100 p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-base font-semibold text-slate-900">
                      {group.exerciseName}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      {group.sets.length} sets
                    </p>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    {group.sets.map((set) => (
                      <div
                        key={set.id}
                        className="flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <p className="font-medium text-slate-900">
                            {set.setIndex != null
                              ? `Set ${set.setIndex + 1}`
                              : "Set"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Intl.DateTimeFormat("en-US", {
                              hour: "numeric",
                              minute: "numeric",
                            }).format(set.timestamp)}
                          </p>
                        </div>
                        <p className="font-semibold text-slate-900">
                          {set.weight ?? 0}
                          {set.weightUnit ?? "kg"} × {set.reps}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
