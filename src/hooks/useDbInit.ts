// Hook to initialize the database
// Should be called once at app startup

import { useEffect, useState } from "react";
import { getDB } from "../lib/db";
import { seedSampleExercises } from "../lib/seedData";

interface UseDbInitResult {
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  ready: boolean;
  upgrading: boolean;
}

/**
 * Initializes the IndexedDB database on app startup
 * Call this hook at the root of your app
 */
export function useDbInit(): UseDbInitResult {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initializeDb() {
      try {
        setIsLoading(true);
        await getDB();

        // Seed sample exercises for testing
        await seedSampleExercises();

        if (mounted) {
          setIsInitialized(true);
          setError(null);
          console.log("[useDbInit] Database initialized successfully");
        }
      } catch (err) {
        console.error("[useDbInit] Failed to initialize database:", err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsInitialized(false);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initializeDb();

    return () => {
      mounted = false;
    };
  }, []);

  const ready = isInitialized && !isLoading && error === null;
  const upgrading = false;

  return { isInitialized, isLoading, error, ready, upgrading };
}
