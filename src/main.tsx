import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.scss";
import App from "./App.tsx";
import { registerServiceWorker } from "./serviceWorker/register";
import { exposeDevHelpers } from "./lib/db/dev-helpers";

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Cache data for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed queries
      retry: 1,
      // Refetch on window focus
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});

// Expose dev helpers in development mode
exposeDevHelpers();

// Register service worker
interface WindowWithUpdateCallback extends Window {
  __setUpdateAvailable?: (value: boolean) => void;
}

registerServiceWorker({
  onUpdate: () => {
    console.log("[App] Service worker update available");
    // Signal the UpdateAvailableBanner to show
    const windowWithCallback = window as WindowWithUpdateCallback;
    if (windowWithCallback.__setUpdateAvailable) {
      windowWithCallback.__setUpdateAvailable(true);
    }
  },
  onSuccess: () => {
    console.log("[App] Content cached for offline use");
  },
  onError: (error) => {
    console.error("[App] Service worker registration failed:", error);
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
