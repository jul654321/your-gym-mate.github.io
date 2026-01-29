// UpdateAvailableBanner component
// Non-blocking banner that prompts user to refresh when SW update is available

import { useState, useEffect } from "react";
import { skipWaitingAndReload } from "../serviceWorker/register";

export function UpdateAvailableBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // This component receives visibility state from parent
    // The actual detection happens in main.tsx via registerServiceWorker callback
  }, []);

  if (!showBanner) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-teal-600 text-white p-4 shadow-lg"
      role="alert"
      aria-live="polite"
    >
      <div className="container mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <p className="font-medium">New version available!</p>
          <p className="text-sm text-teal-100">
            A new version of the app is ready. Refresh to update.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBanner(false)}
            className="px-4 py-2 text-sm font-medium text-teal-600 bg-white rounded-md hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-teal-600"
            aria-label="Dismiss update notification"
          >
            Later
          </button>
          <button
            onClick={skipWaitingAndReload}
            className="px-4 py-2 text-sm font-medium bg-teal-700 rounded-md hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-teal-600"
            aria-label="Update now"
          >
            Update Now
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook version for easier integration (if needed)
// Note: Currently using direct component in App.tsx
// Uncomment if you prefer hook-based approach
/*
export function useUpdateAvailable() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    interface WindowWithUpdateCallback extends Window {
      __setUpdateAvailable?: (value: boolean) => void;
    }
    (window as WindowWithUpdateCallback).__setUpdateAvailable = setUpdateAvailable;
    
    return () => {
      delete (window as WindowWithUpdateCallback).__setUpdateAvailable;
    };
  }, []);

  return {
    updateAvailable,
    setUpdateAvailable,
    BannerComponent: () => (
      <UpdateAvailableBanner />
    ),
  };
}
*/
