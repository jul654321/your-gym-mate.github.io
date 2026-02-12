// DashboardPage - main dashboard view with analytics and filters
// Implements US-013, US-014, US-015, US-016

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SectionHeader } from "../components/layouts/SectionHeader";
import { SectionMain } from "../components/layouts/SectionMain";
import {
  FilterBar,
  TrendChart,
  VolumeBarChart,
  PRTable,
  TotalsCard,
} from "../components/dashboard";
import { useDbInit } from "../hooks/useDbInit";
import {
  useDashboardFilters,
  useDashboardData,
  useExercises,
} from "../hooks";
import { AlertCircle, BarChart3 } from "lucide-react";
import { Button } from "../components/ui/button";

export function DashboardPage() {
  const navigate = useNavigate();
  const { ready, upgrading } = useDbInit();
  const [trendMetric, setTrendMetric] = useState<"weight" | "volume">("volume");

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
  const disableActions = !ready || upgrading;

  // Navigate to session detail when clicking PR row or volume bar
  const handleNavigateToSession = (sessionId: string) => {
    navigate(`/sessions/${sessionId}`);
  };

  // Navigate to session detail and scroll to set (for PR table)
  const handleNavigateToSet = (setId: string) => {
    // For now, just navigate to sessions page
    // In a full implementation, we'd query the set to get its sessionId
    // and then navigate to that session with a hash/scroll to the set
    console.log("Navigate to set:", setId);
    // TODO: Implement set lookup and navigation
    navigate("/sessions");
  };

  // Loading skeleton
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
        <BarChart3 className="h-5 w-5 text-primary" />
      </SectionHeader>

      <SectionMain>
        {/* Filter Bar */}
        <FilterBar
          filters={filters}
          exercises={exercises}
          onChange={setFilters}
          onReset={resetFilters}
          errors={validation.errors}
        />

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
            <PRTable
              items={dashboardData.prItems}
              onRowClick={handleNavigateToSet}
            />
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

        {/* Empty state when no data matches filters */}
        {dashboardData &&
          validation.valid &&
          dashboardData.totals.totalSessions === 0 && (
            <div className="bg-muted/30 border border-border rounded-lg p-12 text-center">
              <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Data Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                No workout data matches your current filters. Try adjusting your
                filter settings or reset to defaults.
              </p>
              <Button variant="outline" onClick={resetFilters}>
                Reset Filters
              </Button>
            </div>
          )}
      </SectionMain>
    </>
  );
}
