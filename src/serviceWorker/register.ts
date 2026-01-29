// Service Worker Registration
// Only registers in production builds and provides update notification

export type ServiceWorkerUpdateCallback = () => void;

interface ServiceWorkerConfig {
  onUpdate?: ServiceWorkerUpdateCallback;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Registers the service worker only in production builds
 * Provides callbacks for update, success, and error events
 */
export function registerServiceWorker(config: ServiceWorkerConfig = {}): void {
  // Only register in production and when service workers are supported
  if (
    import.meta.env.PROD &&
    "serviceWorker" in navigator
  ) {
    // Wait for page load to avoid competing with initial page load
    window.addEventListener("load", () => {
      const swUrl = "/sw.js";

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log("[SW] Registration successful:", registration);

          // Check for updates periodically (every hour)
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);

          // Handle updates
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (!installingWorker) {
              return;
            }

            installingWorker.onstatechange = () => {
              if (installingWorker.state === "installed") {
                if (navigator.serviceWorker.controller) {
                  // New update available
                  console.log("[SW] New content available; please refresh.");
                  config.onUpdate?.();
                } else {
                  // Content cached for offline use
                  console.log("[SW] Content cached for offline use.");
                  config.onSuccess?.();
                }
              }
            };
          };
        })
        .catch((error) => {
          console.error("[SW] Registration failed:", error);
          config.onError?.(error);
        });
    });
  } else if (!import.meta.env.PROD) {
    console.log("[SW] Service worker not registered in development mode");
  } else if (!("serviceWorker" in navigator)) {
    console.warn("[SW] Service workers are not supported in this browser");
  }
}

/**
 * Unregisters all service workers
 * Useful for debugging or when migrating away from PWA
 */
export function unregisterServiceWorker(): void {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error("[SW] Error unregistering:", error);
      });
  }
}

/**
 * Tells the waiting service worker to skip waiting and activate immediately
 * Should be called when user clicks "Update" on the update notification
 */
export function skipWaitingAndReload(): void {
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
    
    // Listen for the new service worker to take control
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // Reload the page when the new service worker takes control
      window.location.reload();
    });
  }
}
