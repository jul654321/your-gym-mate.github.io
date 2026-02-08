import { useReducer, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import type { UUID } from "../types";

// Form model types as defined in the plan
export type PlanExerciseAlternativeDefaultsFormModel = {
  sets?: number;
  reps?: number;
  weight?: number;
  notes?: string;
};

export type PlanExerciseFormModel = {
  id: UUID; // planExercise id
  exerciseId?: UUID; // selected exercise id (required before save)
  nameSnapshot?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultWeight?: number;
  optionalAlternativeExerciseId?: UUID | null;
  alternativeDefaults?: PlanExerciseAlternativeDefaultsFormModel;
  notes?: string;
};

export type PlanFormModel = {
  id?: UUID; // undefined for create until saved
  name: string;
  planExercises: PlanExerciseFormModel[]; // ordered
  notes?: string;
  weekday?: number | null;
};

// Validation errors
export type PlanFormErrors = {
  name?: string;
  planExercises?: Record<
    string,
    {
      exerciseId?: string;
      defaultSets?: string;
      defaultReps?: string;
      defaultWeight?: string;
      optionalAlternativeExerciseId?: string;
      alternativeDefaults?: {
        sets?: string;
        reps?: string;
        weight?: string;
      };
    }
  >;
};

// Action types
type PlanFormAction =
  | { type: "SET_NAME"; payload: string }
  | { type: "SET_NOTES"; payload: string }
  | { type: "ADD_EXERCISE" }
  | { type: "REMOVE_EXERCISE"; payload: { index: number } }
  | {
      type: "UPDATE_EXERCISE";
      payload: { index: number; exercise: Partial<PlanExerciseFormModel> };
    }
  | { type: "MOVE_EXERCISE"; payload: { fromIndex: number; toIndex: number } }
  | { type: "SET_WEEKDAY"; payload: number | null }
  | { type: "SET_FORM"; payload: PlanFormModel };

// Reducer
function planFormReducer(
  state: PlanFormModel,
  action: PlanFormAction
): PlanFormModel {
  switch (action.type) {
    case "SET_NAME":
      return { ...state, name: action.payload };

    case "SET_NOTES":
      return { ...state, notes: action.payload };

    case "ADD_EXERCISE":
      return {
        ...state,
        planExercises: [
          ...state.planExercises,
          {
            id: uuidv4(),
            exerciseId: undefined,
            defaultSets: undefined,
            defaultReps: undefined,
            defaultWeight: undefined,
            optionalAlternativeExerciseId: null,
            alternativeDefaults: {
              sets: undefined,
              reps: undefined,
              weight: undefined,
              notes: "",
            },
            notes: "",
          },
        ],
      };

    case "REMOVE_EXERCISE":
      return {
        ...state,
        planExercises: state.planExercises.filter(
          (_, i) => i !== action.payload.index
        ),
      };

    case "UPDATE_EXERCISE":
      return {
        ...state,
        planExercises: state.planExercises.map((exercise, i) =>
          i === action.payload.index
            ? { ...exercise, ...action.payload.exercise }
            : exercise
        ),
      };

    case "MOVE_EXERCISE": {
      const { fromIndex, toIndex } = action.payload;
      const newExercises = [...state.planExercises];
      const [movedExercise] = newExercises.splice(fromIndex, 1);
      newExercises.splice(toIndex, 0, movedExercise);
      return { ...state, planExercises: newExercises };
    }

    case "SET_FORM":
      return {
        ...action.payload,
        weekday:
          action.payload.weekday === undefined ? null : action.payload.weekday,
      };

    case "SET_WEEKDAY":
      return { ...state, weekday: action.payload };

    default:
      return state;
  }
}

// Validation function
export function validatePlanForm(form: PlanFormModel): PlanFormErrors {
  const errors: PlanFormErrors = {};

  // Validate name
  if (!form.name || form.name.trim().length === 0) {
    errors.name = "Name is required";
  }

  // Validate plan exercises
  const exerciseErrors: Record<
    string,
    {
      exerciseId?: string;
      defaultSets?: string;
      defaultReps?: string;
      defaultWeight?: string;
      optionalAlternativeExerciseId?: string;
      alternativeDefaults?: {
        sets?: string;
        reps?: string;
        weight?: string;
      };
    }
  > = {};

  form.planExercises.forEach((exercise, index) => {
    const exErrors: {
      exerciseId?: string;
      defaultSets?: string;
      defaultReps?: string;
      defaultWeight?: string;
      optionalAlternativeExerciseId?: string;
      alternativeDefaults?: {
        sets?: string;
        reps?: string;
        weight?: string;
      };
    } = {};

    // Exercise ID required
    if (!exercise.exerciseId) {
      exErrors.exerciseId = "Exercise is required";
    }

    // Validate numeric fields
    if (exercise.defaultSets !== undefined && exercise.defaultSets < 1) {
      exErrors.defaultSets = "Sets must be at least 1";
    }

    if (exercise.defaultReps !== undefined && exercise.defaultReps < 0) {
      exErrors.defaultReps = "Reps must be 0 or greater";
    }

    if (exercise.defaultWeight !== undefined && exercise.defaultWeight < 0) {
      exErrors.defaultWeight = "Weight must be 0 or greater";
    }

    // Alternative must not equal primary
    if (
      exercise.optionalAlternativeExerciseId &&
      exercise.optionalAlternativeExerciseId === exercise.exerciseId
    ) {
      exErrors.optionalAlternativeExerciseId =
        "Alternative cannot be the same as primary exercise";
    }

    if (exercise.alternativeDefaults) {
      const altErrors: {
        sets?: string;
        reps?: string;
        weight?: string;
      } = {};

      if (
        exercise.alternativeDefaults.sets !== undefined &&
        exercise.alternativeDefaults.sets < 1
      ) {
        altErrors.sets = "Sets must be at least 1";
      }

      if (
        exercise.alternativeDefaults.reps !== undefined &&
        exercise.alternativeDefaults.reps < 0
      ) {
        altErrors.reps = "Reps must be 0 or greater";
      }

      if (
        exercise.alternativeDefaults.weight !== undefined &&
        exercise.alternativeDefaults.weight < 0
      ) {
        altErrors.weight = "Weight must be 0 or greater";
      }

      if (Object.keys(altErrors).length > 0) {
        exErrors.alternativeDefaults = altErrors;
      }
    }

    if (Object.keys(exErrors).length > 0) {
      exerciseErrors[index] = exErrors;
    }
  });

  if (Object.keys(exerciseErrors).length > 0) {
    errors.planExercises = exerciseErrors;
  }

  return errors;
}

// Hook
export function usePlanFormReducer(initialForm?: PlanFormModel) {
  const [form, dispatch] = useReducer(
    planFormReducer,
    initialForm || {
      name: "",
      planExercises: [],
      notes: "",
      weekday: null,
    }
  );

  const setName = useCallback((name: string) => {
    dispatch({ type: "SET_NAME", payload: name });
  }, []);

  const setNotes = useCallback((notes: string) => {
    dispatch({ type: "SET_NOTES", payload: notes });
  }, []);

  const addExercise = useCallback(() => {
    dispatch({ type: "ADD_EXERCISE" });
  }, []);

  const removeExercise = useCallback((index: number) => {
    dispatch({ type: "REMOVE_EXERCISE", payload: { index } });
  }, []);

  const updateExercise = useCallback(
    (index: number, exercise: Partial<PlanExerciseFormModel>) => {
      dispatch({ type: "UPDATE_EXERCISE", payload: { index, exercise } });
    },
    []
  );

  const moveExercise = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: "MOVE_EXERCISE", payload: { fromIndex, toIndex } });
  }, []);

  const setForm = useCallback((newForm: PlanFormModel) => {
    dispatch({ type: "SET_FORM", payload: newForm });
  }, []);

  const setWeekday = useCallback((weekday: number | null) => {
    dispatch({ type: "SET_WEEKDAY", payload: weekday });
  }, []);

  const validate = useCallback(() => {
    return validatePlanForm(form);
  }, [form]);

  return {
    form,
    setName,
    setNotes,
    addExercise,
    removeExercise,
    updateExercise,
    moveExercise,
    setForm,
    setWeekday,
    validate,
  };
}
