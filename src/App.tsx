import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import "./App.css";
import { useDbInit } from "./hooks/useDbInit";
import { UpdateAvailableBanner } from "./components/UpdateAvailableBanner";
import { PlansPage } from "./pages/PlansPage";
import { Button } from "./components/ui/button";
import { PageShell } from "./components/layouts/PageShell";
import { SessionsPage } from "./pages/SessionsPage";
import { SessionView } from "./pages/SessionView";

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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Initializing database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Database Error
          </h1>
          <p className="text-gray-700 mb-4">
            Failed to initialize the database:
          </p>
          <p className="text-sm text-gray-600 bg-gray-100 p-4 rounded">
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-600">Database not initialized</p>
      </div>
    );
  }

  return (
    <Router>
      {/* Update notification banner */}
      {showUpdateBanner && <UpdateAvailableBanner />}

      <PageShell>
        <Routes>
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/" element={<PlansPage />} />
          {/* <Route path="/" element={<HomePage />} /> */}
          <Route path="/sessions/:sessionId" element={<SessionView />} />
        </Routes>
      </PageShell>
    </Router>
  );
}

// Home page component
function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Your Gym Mate</h1>
          <p className="text-teal-100 mt-1">Your personal workout companion</p>
        </div>{" "}
        <Link
          to="/plans"
          className="inline-block px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary transition-colors"
        >
          View Workout Plans →
        </Link>
      </header>

      <footer className="container mx-auto px-4 py-6 text-center text-gray-600 text-sm">
        <p>Built with React + TypeScript + IndexedDB</p>
      </footer>
    </div>
  );
}

export default App;
