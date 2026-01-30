import { Button } from "../ui/button";
import { LoggedSetRow } from "./LoggedSetRow";
import type { GroupedExerciseVM } from "../../hooks/useSessionViewModel";

interface LoggedSetsListProps {
  groupedSets: GroupedExerciseVM[];
  onOpenQuickAdd: (exerciseId: string) => void;
  onEditSet: (setId: string) => void;
  onDeleteSet: (setId: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading?: boolean;
  isFetchingMore?: boolean;
}

export function LoggedSetsList({
  groupedSets,
  onOpenQuickAdd,
  onEditSet,
  onDeleteSet,
  onLoadMore,
  hasMore,
  isLoading = false,
  isFetchingMore = false,
}: LoggedSetsListProps) {
  if (isLoading && !groupedSets.length) {
    return <p className="text-sm text-slate-500">Loading logged sets…</p>;
  }

  if (!groupedSets.length && !isLoading) {
    return (
      <p className="text-sm text-slate-500">
        No sets logged yet. Tap Quick Add to capture your first set.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {groupedSets.map((group) => (
        <article
          key={group.exerciseId}
          className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
        >
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {group.exerciseName}
              </p>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                {group.sets.length} sets
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onOpenQuickAdd(group.exerciseId)}
            >
              Quick add
            </Button>
          </div>
          <div className="space-y-3">
            {group.sets.map((set) => (
              <LoggedSetRow
                key={set.id}
                set={set}
                onEdit={onEditSet}
                onDelete={onDeleteSet}
              />
            ))}
          </div>
        </article>
      ))}

      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoading || isFetchingMore}
            className="px-6"
          >
            {isFetchingMore ? "Loading…" : "Load more sets"}
          </Button>
        </div>
      )}
    </div>
  );
}
