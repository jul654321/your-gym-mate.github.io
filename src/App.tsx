import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./App.css";
import { useDbInit } from "./hooks/useDbInit";
import { UpdateAvailableBanner } from "./components/UpdateAvailableBanner";
import { PlansPage } from "./pages/PlansPage";
import { Button } from "./components/ui/button";
import { PageShell } from "./components/layouts/PageShell";
import { SessionsPage } from "./pages/SessionsPage";
import { SessionView } from "./pages/SessionView";
import { SettingsPage } from "./pages/SettingsPage";
import { SettingsMain } from "./pages/settings/SettingsMain";
import { ExercisesListPage } from "./pages/settings/ExercisesListPage";
import { BackupPage } from "./pages/settings/BackupPage";
import { AdvancedSettingsPage } from "./pages/settings/AdvancedSettingsPage";
import { DashboardPage } from "./pages/DashboardPage";

function App() {
  const { isInitialized, isLoading, error } = useDbInit();
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  // Listen for update notifications from service worker
  useEffect(() => {
    interface WindowWithUpdateCallback extends Window {
      __setUpdateAvailable?: (value: boolean) => void;
    }
    (window as WindowWithUpdateCallback).__setUpdateAvailable =
      setShowUpdateBanner;
    return () => {
      delete (window as WindowWithUpdateCallback).__setUpdateAvailable;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Initializing database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center max-w-md p-6 bg-card rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-destructive mb-4">
            Database Error
          </h1>
          <p className="text-muted-foreground mb-4">
            Failed to initialize the database:
          </p>
          <p className="text-sm text-muted-foreground bg-gray-100 p-4 rounded">
            {error.message}
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2"
          >
            Reload App
          </Button>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground text-center">
          Database not initialized
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen ios-scroll overscroll-contain">
      <Router basename="/your-gym-mate.github.io">
        {/* Update notification banner */}
        {showUpdateBanner && <UpdateAvailableBanner />}

        <PageShell>
          <Routes>
            <Route path="/" element={<Navigate to="/sessions" />} />
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/sessions/:sessionId" element={<SessionView />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/settings/*" element={<SettingsPage />}>
              <Route index element={<SettingsMain />} />
              <Route path="exercises" element={<ExercisesListPage />} />
              <Route path="backup" element={<BackupPage />} />
              <Route path="advanced" element={<AdvancedSettingsPage />} />
              <Route path="*" element={<Navigate to="exercises" replace />} />
            </Route>
          </Routes>
        </PageShell>
      </Router>
    </div>
  );
}

export default App;
