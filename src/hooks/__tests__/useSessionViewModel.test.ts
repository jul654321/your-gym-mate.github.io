import { describe, expect, it } from "vitest";
import type { LoggedSetDTO } from "../../types";
import { buildGroupedExercises } from "../useSessionViewModel";

const createSet = (
  overrides: Partial<LoggedSetDTO> & {
    id: string;
    exerciseId: string;
    timestamp: number;
  }
): LoggedSetDTO => {
  const { id, exerciseId, timestamp, ...rest } = overrides;
  return {
    id,
    sessionId: rest.sessionId ?? "session-a",
    exerciseId,
    timestamp,
    weight: rest.weight ?? 0,
    reps: rest.reps ?? 0,
    createdAt: rest.createdAt ?? timestamp,
    exerciseIds: rest.exerciseIds ?? [exerciseId],
    exerciseNameSnapshot: rest.exerciseNameSnapshot,
    setIndex: rest.setIndex,
    weightUnit: rest.weightUnit,
    setType: rest.setType ?? "main",
    notes: rest.notes,
    alternative: rest.alternative ?? null,
    updatedAt: rest.updatedAt,
  };
};

describe("buildGroupedExercises", () => {
  it("orders groups using the session exercise order and sorts sets per group", () => {
    const sets = [
      createSet({
        id: "set-plan-2",
        exerciseId: "ex-plan",
        timestamp: 200,
        setIndex: 2,
        exerciseNameSnapshot: "Planified",
      }),
      createSet({
        id: "set-plan-1",
        exerciseId: "ex-plan",
        timestamp: 100,
        setIndex: 1,
        exerciseNameSnapshot: "Planified",
      }),
      createSet({
        id: "set-extra",
        exerciseId: "ex-extra",
        timestamp: 150,
        exerciseNameSnapshot: "Extra",
      }),
    ];

    const exercisesById = new Map([
      ["ex-plan", "Ordered Exercise"],
      ["ex-extra", "Ad-hoc Exercise"],
    ]);

    const grouped = buildGroupedExercises({
      sets,
      exercisesById,
      exerciseOrder: ["ex-plan", "ex-extra"],
      planExercises: [],
    });

    expect(grouped.map((group) => group.exerciseId)).toEqual([
      "ex-plan",
      "ex-extra",
    ]);
    expect(grouped[0].sets.map((set) => set.id)).toEqual([
      "set-plan-1",
      "set-plan-2",
    ]);
  });

  it("adds placeholders for ordered exercises that have no logged sets yet", () => {
    const sets = [
      createSet({
        id: "set-plan-1",
        exerciseId: "ex-plan",
        timestamp: 100,
        exerciseNameSnapshot: "Planified",
      }),
    ];

    const exercisesById = new Map([
      ["ex-plan", "Plan Exercise"],
      ["ex-empty", "Future Exercise"],
    ]);

    const grouped = buildGroupedExercises({
      sets,
      exercisesById,
      exerciseOrder: ["ex-plan", "ex-empty"],
      planExercises: [],
    });

    expect(grouped[1]).toMatchObject({
      exerciseId: "ex-empty",
      exerciseName: "Future Exercise",
      sets: [],
    });
  });

  it("appends ad-hoc exercises after the ordered list when they appear in logged sets", () => {
    const sets = [
      createSet({
        id: "set-plan",
        exerciseId: "ex-plan",
        timestamp: 100,
      }),
      createSet({
        id: "set-adhoc",
        exerciseId: "ex-adhoc",
        timestamp: 200,
      }),
    ];

    const exercisesById = new Map([
      ["ex-plan", "Plan Exercise"],
      ["ex-adhoc", "Ad-hoc Exercise"],
    ]);

    const grouped = buildGroupedExercises({
      sets,
      exercisesById,
      planExercises: [],
      exerciseOrder: ["ex-plan"],
    });

    expect(grouped.map((group) => group.exerciseId)).toEqual([
      "ex-plan",
      "ex-adhoc",
    ]);
  });

  it("aligns alternative exercises with their main plan order", () => {
    const sets = [
      createSet({
        id: "set-alt",
        exerciseId: "ex-alt",
        timestamp: 80,
      }),
      createSet({
        id: "set-main",
        exerciseId: "ex-main",
        timestamp: 100,
      }),
    ];

    const exercisesById = new Map([
      ["ex-main", "Main Exercise"],
      ["ex-alt", "Alternative Exercise"],
    ]);

    const altToMainMap = new Map([["ex-alt", "ex-main"]]);

    const grouped = buildGroupedExercises({
      sets,
      exercisesById,
      planExercises: [],
      exerciseOrder: ["ex-main"],
      altToMainMap,
    });

    expect(grouped.map((group) => group.exerciseId)).toEqual([
      "ex-main",
      "ex-alt",
    ]);
    expect(grouped[1].sets[0].id).toBe("set-alt");
  });
});
