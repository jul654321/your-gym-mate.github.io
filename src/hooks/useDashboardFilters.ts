// Hook for managing dashboard filter state with URL synchronization and debouncing
// Implements filter validation and preset date range calculations

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type { DashboardFilters, DatePreset } from "../types";

const DEFAULT_FILTERS: DashboardFilters = {
  exerciseIds: [],
  planIds: [],
  includeAlternatives: false,
  preset: "30d",
};

/**
 * Calculates date range from preset
 */
function getDateRangeFromPreset(preset: DatePreset): {
  from?: string;
  to?: string;
} {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "7d": {
      const from = new Date(today);
      from.setDate(from.getDate() - 7);
      return {
        from: from.toISOString().split("T")[0],
        to: today.toISOString().split("T")[0],
      };
    }
    case "30d": {
      const from = new Date(today);
      from.setDate(from.getDate() - 30);
      return {
        from: from.toISOString().split("T")[0],
        to: today.toISOString().split("T")[0],
      };
    }
    case "90d": {
      const from = new Date(today);
      from.setDate(from.getDate() - 90);
      return {
        from: from.toISOString().split("T")[0],
        to: today.toISOString().split("T")[0],
      };
    }
    case "all":
      return {};
    case "custom":
      return {};
    default:
      return {};
  }
}

/**
 * Validates filter parameters
 */
function validateFilters(filters: DashboardFilters): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate date range
  if (filters.dateFrom && filters.dateTo) {
    if (new Date(filters.dateFrom) > new Date(filters.dateTo)) {
      errors.push("Start date must be before end date");
    }
  }

  // Validate weight range
  if (
    filters.minWeight !== undefined &&
    filters.maxWeight !== undefined &&
    filters.minWeight > filters.maxWeight
  ) {
    errors.push("Minimum weight must be less than or equal to maximum weight");
  }

  // Validate reps range
  if (
    filters.minReps !== undefined &&
    filters.maxReps !== undefined &&
    filters.minReps > filters.maxReps
  ) {
    errors.push("Minimum reps must be less than or equal to maximum reps");
  }

  // Validate numeric inputs are non-negative
  if (filters.minWeight !== undefined && filters.minWeight < 0) {
    errors.push("Minimum weight must be non-negative");
  }
  if (filters.maxWeight !== undefined && filters.maxWeight < 0) {
    errors.push("Maximum weight must be non-negative");
  }
  if (filters.minReps !== undefined && filters.minReps < 0) {
    errors.push("Minimum reps must be non-negative");
  }
  if (filters.maxReps !== undefined && filters.maxReps < 0) {
    errors.push("Maximum reps must be non-negative");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Custom hook for managing dashboard filters with URL synchronization
 */
export function useDashboardFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [debouncedFilters, setDebouncedFilters] =
    useState<DashboardFilters>(DEFAULT_FILTERS);

  // Parse filters from URL
  const filtersFromUrl = useMemo((): DashboardFilters => {
    const exerciseIdsParam = searchParams.get("exercises");
    const preset = (searchParams.get("preset") as DatePreset) || "30d";
    const includeAlternatives =
      searchParams.get("includeAlternatives") !== "false";
    const planIdsParam = searchParams.get("plans");

    const filters: DashboardFilters = {
      exerciseIds: exerciseIdsParam ? exerciseIdsParam.split(",") : [],
      planIds: planIdsParam ? planIdsParam.split(",") : [],
      includeAlternatives,
      preset,
      dateFrom: searchParams.get("from") || undefined,
      dateTo: searchParams.get("to") || undefined,
      minWeight: searchParams.get("minWeight")
        ? Number(searchParams.get("minWeight"))
        : undefined,
      maxWeight: searchParams.get("maxWeight")
        ? Number(searchParams.get("maxWeight"))
        : undefined,
      minReps: searchParams.get("minReps")
        ? Number(searchParams.get("minReps"))
        : undefined,
      maxReps: searchParams.get("maxReps")
        ? Number(searchParams.get("maxReps"))
        : undefined,
    };

    // Apply preset date range if no custom dates
    if (preset && preset !== "custom" && !filters.dateFrom && !filters.dateTo) {
      const dateRange = getDateRangeFromPreset(preset);

      filters.dateFrom = dateRange.from;
      filters.dateTo = dateRange.to;
    }

    return filters;
  }, [searchParams]);

  // Debounce filter updates (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filtersFromUrl);
    }, 300);

    return () => clearTimeout(timer);
  }, [filtersFromUrl]);

  // Update filters and sync to URL
  const setFilters = useCallback(
    (updates: Partial<DashboardFilters>) => {
      const newParams = new URLSearchParams(searchParams);

      const newFilters = { ...filtersFromUrl, ...updates };

      // Update exercise IDs
      if (updates.exerciseIds !== undefined) {
        if (updates.exerciseIds.length > 0) {
          newParams.set("exercises", updates.exerciseIds.join(","));
        } else {
          newParams.delete("exercises");
        }
      }

      if (updates.planIds !== undefined) {
        if (updates.planIds.length > 0) {
          newParams.set("plans", updates.planIds.join(","));
        } else {
          newParams.delete("plans");
        }
      }

      // Update preset
      if (updates.preset !== undefined) {
        newParams.set("preset", updates.preset);

        // Apply preset date range
        if (updates.preset !== "custom") {
          const dateRange = getDateRangeFromPreset(updates.preset);
          if (dateRange.from) {
            newParams.set("from", dateRange.from);
          } else {
            newParams.delete("from");
          }
          if (dateRange.to) {
            newParams.set("to", dateRange.to);
          } else {
            newParams.delete("to");
          }
        }
      }

      // Update custom dates (only when preset is 'custom')
      if (updates.dateFrom !== undefined && newFilters.preset === "custom") {
        if (updates.dateFrom) {
          newParams.set("from", updates.dateFrom);
        } else {
          newParams.delete("from");
        }
      }
      if (updates.dateTo !== undefined && newFilters.preset === "custom") {
        if (updates.dateTo) {
          newParams.set("to", updates.dateTo);
        } else {
          newParams.delete("to");
        }
      }

      // Update includeAlternatives
      if (updates.includeAlternatives !== undefined) {
        if (updates.includeAlternatives) {
          newParams.delete("includeAlternatives");
        } else {
          newParams.set("includeAlternatives", "false");
        }
      }

      // Update weight range
      if (updates.minWeight !== undefined) {
        if (updates.minWeight !== null && updates.minWeight >= 0) {
          newParams.set("minWeight", String(updates.minWeight));
        } else {
          newParams.delete("minWeight");
        }
      }
      if (updates.maxWeight !== undefined) {
        if (updates.maxWeight !== null && updates.maxWeight >= 0) {
          newParams.set("maxWeight", String(updates.maxWeight));
        } else {
          newParams.delete("maxWeight");
        }
      }

      // Update reps range
      if (updates.minReps !== undefined) {
        if (updates.minReps !== null && updates.minReps >= 0) {
          newParams.set("minReps", String(updates.minReps));
        } else {
          newParams.delete("minReps");
        }
      }
      if (updates.maxReps !== undefined) {
        if (updates.maxReps !== null && updates.maxReps >= 0) {
          newParams.set("maxReps", String(updates.maxReps));
        } else {
          newParams.delete("maxReps");
        }
      }

      setSearchParams(newParams, { replace: true });
    },
    [searchParams, filtersFromUrl, setSearchParams]
  );

  // Reset filters to defaults
  const resetFilters = useCallback(() => {
    setSearchParams(
      new URLSearchParams(Object.fromEntries(Object.entries(DEFAULT_FILTERS))),
      { replace: true }
    );
    setDebouncedFilters(DEFAULT_FILTERS);
  }, [setSearchParams, setDebouncedFilters]);

  // Validation
  const validation = useMemo(
    () => validateFilters(debouncedFilters),
    [debouncedFilters]
  );

  return {
    filters: debouncedFilters,
    setFilters,
    resetFilters,
    validation,
    // Expose immediate filters for UI to show what user has typed
    immediateFilters: filtersFromUrl,
  };
}
