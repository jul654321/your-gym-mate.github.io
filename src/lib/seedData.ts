import { v4 as uuidv4 } from "uuid";
import { getDB, STORE_NAMES } from "./db";
import type { ExerciseDTO } from "../types";

/**
 * Seeds the database with sample exercises for testing
 */
export async function seedSampleExercises(): Promise<void> {
  const db = await getDB();

  // Check if exercises already exist
  const existingExercises = await db.getAll(STORE_NAMES.exercises);
  if (existingExercises.length > 0) {
    console.log("[SeedData] Exercises already exist, skipping seed");
    return;
  }

  const now = Date.now();

  const sampleExercises: ExerciseDTO[] = [
    // Push exercises
    {
      id: uuidv4(),
      name: "Bench Press",
      category: "Push",
      equipment: ["Barbell", "Bench"],
      notes: "Compound chest exercise",
      createdAt: now,
    },
    {
      id: uuidv4(),
      name: "Dumbbell Shoulder Press",
      category: "Push",
      equipment: ["Dumbbells"],
      notes: "Overhead pressing movement",
      createdAt: now,
    },
    {
      id: uuidv4(),
      name: "Push-ups",
      category: "Push",
      equipment: ["Bodyweight"],
      notes: "Classic bodyweight exercise",
      createdAt: now,
    },
    {
      id: uuidv4(),
      name: "Tricep Dips",
      category: "Push",
      equipment: ["Bodyweight", "Parallel Bars"],
      notes: "Tricep isolation",
      createdAt: now,
    },

    // Pull exercises
    {
      id: uuidv4(),
      name: "Pull-ups",
      category: "Pull",
      equipment: ["Bodyweight", "Pull-up Bar"],
      notes: "Upper body compound",
      createdAt: now,
    },
    {
      id: uuidv4(),
      name: "Barbell Row",
      category: "Pull",
      equipment: ["Barbell"],
      notes: "Back compound movement",
      createdAt: now,
    },
    {
      id: uuidv4(),
      name: "Dumbbell Bicep Curl",
      category: "Pull",
      equipment: ["Dumbbells"],
      notes: "Bicep isolation",
      createdAt: now,
    },
    {
      id: uuidv4(),
      name: "Lat Pulldown",
      category: "Pull",
      equipment: ["Cable Machine"],
      notes: "Alternative to pull-ups",
      createdAt: now,
    },

    // Leg exercises
    {
      id: uuidv4(),
      name: "Barbell Squat",
      category: "Legs",
      equipment: ["Barbell", "Squat Rack"],
      notes: "King of leg exercises",
      createdAt: now,
    },
    {
      id: uuidv4(),
      name: "Deadlift",
      category: "Legs",
      equipment: ["Barbell"],
      notes: "Full body compound",
      createdAt: now,
    },
    {
      id: uuidv4(),
      name: "Leg Press",
      category: "Legs",
      equipment: ["Leg Press Machine"],
      notes: "Machine-based leg work",
      createdAt: now,
    },
    {
      id: uuidv4(),
      name: "Romanian Deadlift",
      category: "Legs",
      equipment: ["Barbell"],
      notes: "Hamstring focused",
      createdAt: now,
    },
    {
      id: uuidv4(),
      name: "Lunges",
      category: "Legs",
      equipment: ["Bodyweight", "Dumbbells"],
      notes: "Unilateral leg exercise",
      createdAt: now,
    },

    // Core exercises
    {
      id: uuidv4(),
      name: "Plank",
      category: "Core",
      equipment: ["Bodyweight"],
      notes: "Isometric core hold",
      createdAt: now,
    },
    {
      id: uuidv4(),
      name: "Hanging Leg Raise",
      category: "Core",
      equipment: ["Pull-up Bar"],
      notes: "Advanced ab exercise",
      createdAt: now,
    },
  ];

  // Add all exercises to the database
  const tx = db.transaction(STORE_NAMES.exercises, "readwrite");
  const store = tx.objectStore(STORE_NAMES.exercises);

  for (const exercise of sampleExercises) {
    await store.add(exercise);
  }

  await tx.done;

  console.log(`[SeedData] Seeded ${sampleExercises.length} sample exercises`);
}
