import { describe, expect, it } from "vitest";
import { migrations } from "../index";
import type { PlanDTO } from "../../../../types";

function createMockCursor(plans: PlanDTO[]) {
  let index = 0;
  if (plans.length === 0) {
    return null;
  }

  const cursor: {
    value: PlanDTO;
    update: (updated: PlanDTO) => Promise<void>;
    continue: () => Promise<typeof cursor | null>;
  } = {
    value: plans[index],
    async update(updated) {
      plans[index] = updated;
      cursor.value = updated;
    },
    async continue() {
      index += 1;
      if (index >= plans.length) {
        return null;
      }
      cursor.value = plans[index];
      return cursor;
    },
  };

  return cursor;
}

function createMockDb(plans: PlanDTO[]) {
  return {
    transaction: () => ({
      objectStore: () => ({
        openCursor: async () => createMockCursor(plans),
      }),
      done: Promise.resolve(),
    }),
  };
}

describe("Migration v3 (workoutType)", () => {
  it("backfills missing workoutType fields without touching existing values", async () => {
    const plans: PlanDTO[] = [
      {
        id: "plan-no-type",
        name: "No type",
        createdAt: 1,
        planExercises: [],
        exerciseIds: [],
        notes: "",
      },
      {
        id: "plan-with-type",
        name: "Has type",
        createdAt: 2,
        planExercises: [],
        exerciseIds: [],
        workoutType: "Cardio",
        notes: "",
      },
    ];

    const db = createMockDb(plans);
    await migrations[3](db as any, 2, 3);

    expect(plans[0].workoutType).toBeNull();
    expect(plans[1].workoutType).toBe("Cardio");
  });

  it("is idempotent when run multiple times", async () => {
    const plans: PlanDTO[] = [
      {
        id: "plan-idempotent",
        name: "Idempotent",
        createdAt: 3,
        planExercises: [],
        exerciseIds: [],
        notes: "",
      },
    ];

    const db = createMockDb(plans);
    await migrations[3](db as any, 2, 3);
    expect(plans[0].workoutType).toBeNull();

    await migrations[3](db as any, 2, 3);
    expect(plans[0].workoutType).toBeNull();
  });
});
