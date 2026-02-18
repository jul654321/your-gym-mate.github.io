// DashboardPage - main dashboard view with analytics and filters
// Implements US-013, US-014, US-015, US-016

import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FilterBar,
  PRTable,
  TotalsCard,
  TrendChart,
  VolumeBarChart,
} from "../components/dashboard";
import { SectionHeader } from "../components/layouts/SectionHeader";
import { SectionMain } from "../components/layouts/SectionMain";
import { Button } from "../components/ui/button";
import { useDashboardData, useDashboardFilters, useExercises } from "../hooks";

export function DashboardPage() {
  const navigate = useNavigate();
  const [trendMetric, setTrendMetric] = useState<"weight" | "volume" | "reps">(
    "volume"
  );

  // Get filters with URL sync and validation
  const { filters, setFilters, resetFilters, validation } =
    useDashboardFilters();

  // Fetch exercises for filter dropdown
  const { data: exercises = [], isLoading: exercisesLoading } = useExercises({
    sort: "name",
  });

  // Fetch dashboard data based on filters
  const {
    data: dashboardData,
    isLoading: dataLoading,
    error: dataError,
  } = useDashboardData(filters);

  const isLoading = exercisesLoading || dataLoading;

  // Navigate to session detail when clicking PR row or volume bar
  const handleNavigateToSession = (sessionId: string) => {
    navigate(`/sessions/${sessionId}`);
  };

  if (isLoading && !dashboardData) {
    return (
      <>
        <SectionHeader headerTitle="Dashboard" />
        <SectionMain>
          <div className="space-y-4">
            {/* Filter skeleton */}
            <div className="bg-card rounded-lg p-4 shadow-sm animate-pulse">
              <div className="h-8 bg-muted rounded w-32 mb-4" />
              <div className="space-y-3">
                <div className="h-11 bg-muted rounded" />
                <div className="h-11 bg-muted rounded" />
              </div>
            </div>

            {/* Grid skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-card rounded-lg p-4 shadow-sm animate-pulse h-80">
                <div className="h-6 bg-muted rounded w-40" />
              </div>
              <div className="bg-card rounded-lg p-4 shadow-sm animate-pulse h-80">
                <div className="h-6 bg-muted rounded w-40" />
              </div>
            </div>
          </div>
        </SectionMain>
      </>
    );
  }

  // Error state
  if (dataError) {
    return (
      <>
        <SectionHeader headerTitle="Dashboard" />
        <SectionMain>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Error Loading Dashboard
              </h3>
              <p className="text-sm text-red-700 mb-4">
                {dataError instanceof Error
                  ? dataError.message
                  : "Failed to load dashboard data"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          </div>
        </SectionMain>
      </>
    );
  }

  return (
    <>
      <SectionHeader headerTitle="Dashboard">
        <FilterBar
          filters={filters}
          exercises={exercises}
          onChange={setFilters}
          onReset={resetFilters}
          errors={validation.errors}
        />
      </SectionHeader>

      <SectionMain>
        {/* Dashboard Grid */}
        {dashboardData && validation.valid && (
          <div className="space-y-4">
            {/* Top Row: Totals Card (mobile) or alongside charts (desktop) */}
            <div className="lg:hidden">
              <TotalsCard totals={dashboardData.totals} />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Trend Chart - takes 2 columns on desktop */}
              <div className="lg:col-span-2">
                <TrendChart
                  points={dashboardData.trendPoints}
                  metric={trendMetric}
                  onMetricChange={setTrendMetric}
                />
              </div>

              {/* Totals Card - desktop only, shown beside chart */}
              <div className="hidden lg:block">
                <TotalsCard totals={dashboardData.totals} />
              </div>
            </div>

            {/* Volume Bar Chart */}
            <VolumeBarChart
              points={dashboardData.volumePoints}
              onSessionClick={handleNavigateToSession}
            />

            {/* PR Table */}
            <PRTable items={dashboardData.prItems} />
          </div>
        )}

        {/* Validation errors prevent display */}
        {!validation.valid && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-sm text-yellow-800">
              Please correct the filter errors above to view dashboard data.
            </p>
          </div>
        )}
      </SectionMain>
    </>
  );
}
