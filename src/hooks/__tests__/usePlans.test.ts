import { describe, expect, it } from "vitest";
import {
  buildPlanToCreate,
  buildPlanUpdate,
  buildSessionFromPlan,
} from "../usePlans";
import type {
  CreatePlanCmd,
  UpdatePlanCmd,
  PlanDTO,
  InstantiateSessionFromPlanCmd,
} from "../../types";

const basePlanExercise = {
  id: "plan-exercise-1",
  exerciseId: "exercise-1",
};

const createPlanCmd: CreatePlanCmd = {
  id: "plan-create",
  name: "Test Plan",
  createdAt: 1,
  planExercises: [basePlanExercise],
  exerciseIds: [basePlanExercise.exerciseId],
  weekday: null,
  notes: "",
  workoutType: undefined,
};

const existingPlan: PlanDTO = {
  ...createPlanCmd,
  updatedAt: 2,
  notes: "existing",
  workoutType: "Strength",
};

const instantiateCmd: InstantiateSessionFromPlanCmd = {
  id: "session-from-plan",
  planId: existingPlan.id,
};

describe("usePlans helpers", () => {
  it("defaults workoutType to null when creating a plan without a type", () => {
    const result = buildPlanToCreate(createPlanCmd);
    expect(result.workoutType).toBeNull();
  });

  it("keeps the provided workoutType when creating a plan", () => {
    const cmdWithType: CreatePlanCmd = {
      ...createPlanCmd,
      id: "plan-with-type",
      workoutType: "Cardio",
    };
    const result = buildPlanToCreate(cmdWithType);
    expect(result.workoutType).toBe("Cardio");
  });

  it("merges workoutType updates correctly", () => {
    const updateCmd: UpdatePlanCmd = {
      id: existingPlan.id,
      name: existingPlan.name,
      workoutType: "Cardio",
    };
    const updated = buildPlanUpdate(existingPlan, updateCmd);
    expect(updated.workoutType).toBe("Cardio");

    const clearCmd: UpdatePlanCmd = {
      id: existingPlan.id,
      workoutType: null,
    };
    const cleared = buildPlanUpdate(existingPlan, clearCmd);
    expect(cleared.workoutType).toBeNull();

    const noChangeCmd: UpdatePlanCmd = {
      id: existingPlan.id,
      name: "No change",
    };
    const noChange = buildPlanUpdate(existingPlan, noChangeCmd);
    expect(noChange.workoutType).toBe(existingPlan.workoutType);
  });

  it("copies the plan's workoutType when instantiating a session", () => {
    const session = buildSessionFromPlan(existingPlan, instantiateCmd);
    expect(session.workoutType).toBe(existingPlan.workoutType);
  });
});
