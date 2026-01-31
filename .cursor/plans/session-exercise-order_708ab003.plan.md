---
name: session-exercise-order
overview: Ensure session exercise list respects plan order at creation; changing plan order affects only new sessions. Update view-model to order groups by session.exerciseOrder and add tests.
todos:
  - id: update-useSessionViewModel
    content: Update `src/hooks/useSessionViewModel.ts` to order groupedExercises by `session.exerciseOrder` and include empty groups for ordered-but-empty exercises.
    status: pending
  - id: add-tests
    content: "Add unit tests `src/hooks/__tests__/useSessionViewModel.test.ts` covering: (a) session with exerciseOrder and sets; (b) session with exerciseOrder but missing sets; (c) ad-hoc exercises appended."
    status: pending
  - id: verify-ui
    content: "Manual QA: instantiate sessions from plans before/after plan reorder and verify older sessions keep original order; check ad-hoc session behavior."
    status: pending
  - id: run-lints
    content: Run linter/tests and fix any introduced issues
    status: pending
isProject: false
---

# Apply plan order to Session View

Summary

- The DB schema already supports this: `sessions` has `exerciseOrder?: string[]` and `plans` store ordered `planExercises` (see `src/types.ts` and `.cursor/plans/indexeddb_schema_ef33b4bd.plan.md`). Instantiating a session from a plan copies the plan order into `session.exerciseOrder` (see `usePlans.ts`).
- The missing piece: the session UI currently groups `loggedSets` by exercise but does not respect `session.exerciseOrder` when rendering. We will update `useSessionViewModel` to order exercise groups using `session.exerciseOrder` (falling back to existing behavior for ad-hoc sessions).

Files to change

- `src/hooks/useSessionViewModel.ts` — change `groupedExercises` logic to respect `session.exerciseOrder` and include plan-ordered exercises even if they currently have no logged sets.
- `src/components/sessionDetail/LoggedSetsList.tsx` — (no code change expected) but verify rendering with empty groups works; adjust if the UI expects groups to always have sets.
- Add tests: `src/hooks/__tests__/useSessionViewModel.test.ts` — cover ordering when `session.exerciseOrder` present, when missing, and when there are extra ad-hoc exercises.

Why this is safe

- Plans already write ordered `planExercises`. `useInstantiateSessionFromPlan` copies that order into a new `session.exerciseOrder` at session creation — so plan reordering will affect only new sessions.
- No schema migration needed.

Implementation notes & essential snippet

Current groupedExercises block (excerpt):

```111:146:src/hooks/useSessionViewModel.ts
  const groupedExercises = useMemo(() => {
    const sets = accumulatedSets;
    const groups = new Map<string, GroupedExerciseVM>();

    for (const set of sets) {
      const key = set.exerciseId;
      const current = groups.get(key);
      const exerciseName = getDisplayName(
        key,
        exercisesById,
        set.exerciseNameSnapshot
      );

      if (current) {
        current.sets.push(set);
        continue;
      }

      groups.set(key, {
        exerciseId: key,
        exerciseName,
        sets: [set],
      });
    }

    const sortedGroups = Array.from(groups.values()).map((group) => ({
      ...group,
      sets: [...group.sets].sort((a, b) => {
        const indexA = a.setIndex ?? a.timestamp ?? 0;
        const indexB = b.setIndex ?? b.timestamp ?? 0;
        return indexA - indexB;
      }),
    }));

    return sortedGroups;
  }, [accumulatedSets, exercisesById]);
```

Replace with (proposed implementation):

```ts
// proposed replacement for groupedExercises useMemo
const groupedExercises = useMemo(() => {
  const sets = accumulatedSets;
  const groups = new Map<string, GroupedExerciseVM>();

  for (const set of sets) {
    const key = set.exerciseId;
    const current = groups.get(key);
    const exerciseName = getDisplayName(
      key,
      exercisesById,
      set.exerciseNameSnapshot
    );

    if (current) {
      current.sets.push(set);
      continue;
    }

    groups.set(key, { exerciseId: key, exerciseName, sets: [set] });
  }

  // Sort each group's sets by setIndex/timestamp
  const normalizeGroup = (group: GroupedExerciseVM) => ({
    ...group,
    sets: [...group.sets].sort(
      (a, b) =>
        (a.setIndex ?? a.timestamp ?? 0) - (b.setIndex ?? b.timestamp ?? 0)
    ),
  });

  // If session.exerciseOrder exists, use it to order groups. Include exercises in the order even if they have no sets.
  const ordered: GroupedExerciseVM[] = [];
  const sessionOrder = sessionQuery.data?.exerciseOrder ?? [];
  const seen = new Set<string>();

  for (const exId of sessionOrder) {
    seen.add(exId);
    const group = groups.get(exId);
    if (group) {
      ordered.push(normalizeGroup(group));
    } else {
      // Show an empty group entry so the UI can display exercises in plan order
      ordered.push({
        exerciseId: exId,
        exerciseName: getDisplayName(exId, exercisesById),
        sets: [],
      });
    }
  }

  // Append remaining groups that were not in session.exerciseOrder (ad-hoc exercises)
  const remaining = Array.from(groups.keys()).filter((k) => !seen.has(k));
  // stable sort remaining by first set timestamp (or name) for deterministic UI
  remaining.sort((a, b) => {
    const aFirst = groups.get(a)!.sets[0];
    const bFirst = groups.get(b)!.sets[0];
    const aTime = aFirst?.timestamp ?? 0;
    const bTime = bFirst?.timestamp ?? 0;
    if (aTime !== bTime) return aTime - bTime;
    return (groups.get(a)!.exerciseName || "").localeCompare(
      groups.get(b)!.exerciseName || ""
    );
  });

  for (const key of remaining) {
    ordered.push(normalizeGroup(groups.get(key)!));
  }

  return ordered;
}, [accumulatedSets, exercisesById, sessionQuery.data]);
```

Testing & QA

- Unit tests for new ordering behavior.
- Manual verification steps:
  1. Create/edit a plan with exercises in order A,B,C.
  2. Instantiate session from plan — verify session view shows exercises in A,B,C.
  3. Reorder plan to C,B,A and create a new session — verify new session shows C,B,A; older session remains A,B,C.
  4. Create ad-hoc session or add an ad-hoc exercise — verify ad-hoc exercises appear after ordered ones.

Rollout

- Small change confined to view-model; low risk. Ship as minor patch.

Security & Migration

- No DB schema changes required. No migration.

Todos

- update-useSessionViewModel: Update `src/hooks/useSessionViewModel.ts` to order groups by `session.exerciseOrder`.
- add-tests: Add unit tests validating ordering and edge cases.
- verify-ui: Manually verify SessionView and LoggedSetsList render correctly for instantiated and ad-hoc sessions.
- run-lints: Run linter and fix any issues introduced.
