// Development helpers for debugging IndexedDB
// These are exposed on window in development mode only

import { getDB, clearAllData, exportData } from "./index";

interface WindowWithDevHelpers extends Window {
  __getDB?: typeof getDB
  __clearAllData?: typeof clearAllData
  __exportData?: typeof exportData
}

/**
 * Expose database helpers on window for console debugging
 * Only available in development mode
 */
export function exposeDevHelpers(): void {
  if (import.meta.env.DEV) {
    const windowWithHelpers = window as WindowWithDevHelpers
    windowWithHelpers.__getDB = getDB
    windowWithHelpers.__clearAllData = clearAllData
    windowWithHelpers.__exportData = exportData
    
    console.log("[Dev Helpers] Database utilities available:");
    console.log("  - window.__getDB() - Get database instance");
    console.log("  - window.__clearAllData() - Clear all data");
    console.log("  - window.__exportData() - Export data as JSON");
  }
}
