# PWA Acceptance Test Checklist

This document provides a manual acceptance test checklist for verifying PWA functionality in Your Gym Mate.

## Prerequisites

- Test on a real device (iOS Safari recommended as primary target)
- Test on latest Chrome/Edge for desktop verification
- Ensure you're testing a production build (`npm run build && npm run preview`)

## Test Checklist

### 1. Installation & Manifest

- [ ] **iOS Safari - Add to Home Screen**
  - Open app in Safari
  - Tap Share button
  - Tap "Add to Home Screen"
  - Verify icon appears on home screen
  - Verify app name is "GymMate" or "Your Gym Mate"
- [ ] **Launch Behavior**
  - Tap installed icon
  - App launches in standalone mode (no browser UI)
  - Verify splash screen shows (if configured)
  - Verify status bar color matches theme (#fccb21)
- [ ] **Manifest Properties**
  - Open DevTools → Application → Manifest
  - Verify all properties are present and correct
  - Verify icons are loaded (192x192, 512x512)
  - Verify theme color is #fccb21

### 2. Service Worker Registration

- [ ] **SW Registration (Production Only)**
  - Build for production: `npm run build`
  - Preview: `npm run preview`
  - Open DevTools → Application → Service Workers
  - Verify service worker is registered
  - Verify status is "activated and running"
- [ ] **SW Not in Development**
  - Run `npm run dev`
  - Open DevTools console
  - Verify message: "Service worker not registered in development mode"

### 3. Offline Functionality

- [ ] **IndexedDB Initialization**
  - Open app
  - Open DevTools → Application → IndexedDB
  - Verify database "your-gym-mate" exists
  - Verify all object stores are created:
    - exercises
    - plans
    - sessions
    - loggedSets
    - settings
    - events
    - undo_trash
- [ ] **Offline Access**

  - Load the app online
  - Open DevTools → Network
  - Set throttling to "Offline"
  - Reload the page
  - Verify app loads successfully (from cache)
  - Verify "Database initialized and ready" message appears

- [ ] **Offline Data Persistence**
  - Create test data while online (once CRUD UI is implemented)
  - Go offline (airplane mode or DevTools)
  - Refresh the page
  - Verify data persists and is accessible
  - Create/update/delete data offline
  - Go back online
  - Verify data is still present after reconnecting

### 4. Service Worker Update Flow

- [ ] **Update Detection**
  - With app running, make a change to `public/sw.js`
  - Increment CACHE_NAME (e.g., v1 → v2)
  - Rebuild: `npm run build`
  - In running app, wait for SW to check for updates
  - Or manually: DevTools → Application → Service Workers → Update
- [ ] **Update Notification**
  - Verify update banner appears at bottom of screen
  - Verify banner shows: "New version available!"
  - Verify banner has "Later" and "Update Now" buttons
- [ ] **Update Action**

  - Click "Update Now"
  - Verify page reloads
  - Verify new service worker is active
  - Verify updated content is loaded

- [ ] **Dismiss Update**
  - Trigger update again
  - Click "Later"
  - Verify banner dismisses
  - Verify app continues to work normally

### 5. Caching Strategy

- [ ] **Static Assets Cached**
  - Load app online
  - Open DevTools → Application → Cache Storage
  - Verify "gymmate-static-v1" cache exists
  - Verify cache contains:
    - /index.html
    - /manifest.json
    - Icons
    - JS/CSS bundles
- [ ] **Runtime Cache**
  - Navigate app and load various resources
  - Verify "gymmate-runtime-v1" cache is created
  - Verify dynamically loaded assets are cached

### 6. Database Operations (Once UI Implemented)

- [ ] **Create Exercise**
  - Create a new exercise
  - Verify it appears in UI immediately
  - Refresh page
  - Verify exercise persists
- [ ] **Update Exercise**
  - Edit an exercise
  - Verify changes appear immediately
  - Refresh page
  - Verify changes persist
- [ ] **Delete Exercise**

  - Delete an exercise
  - Verify it's removed from UI
  - Refresh page
  - Verify deletion persists

- [ ] **Create Session**

  - Create a new workout session
  - Verify session appears in list
  - Refresh page
  - Verify session persists

- [ ] **Log Sets**
  - Add sets to a session
  - Verify sets appear immediately
  - Go offline
  - Add more sets
  - Verify sets are added while offline
  - Go online
  - Refresh page
  - Verify all sets (online + offline) persist

### 7. Performance

- [ ] **Initial Load Time**
  - Clear cache
  - Measure time to first meaningful paint
  - Should be < 2 seconds on 3G
- [ ] **Subsequent Loads**
  - With cache, load time should be < 500ms
- [ ] **Database Query Performance**
  - With realistic data (100+ exercises, 50+ sessions, 1000+ sets)
  - Verify queries complete in < 100ms
  - Verify UI remains responsive

### 8. iOS-Specific Checks

- [ ] **Status Bar**
  - Verify status bar style is appropriate
  - Verify status bar doesn't overlap content
- [ ] **Viewport**
  - Verify app fills entire screen
  - Verify no horizontal scrolling
  - Test on different iOS devices (if available)
- [ ] **Touch Targets**
  - Verify all buttons are at least 44x44 pixels
  - Verify buttons are easily tappable
- [ ] **Orientation**
  - Test in portrait mode (primary)
  - Verify landscape mode works (if supported)

### 9. Error Handling

- [ ] **Database Error**
  - Simulate DB initialization failure (if possible)
  - Verify error message is shown
  - Verify reload button is present
- [ ] **Network Error**
  - Go offline while performing network operation
  - Verify graceful degradation
  - Verify appropriate error message

### 10. Browser Compatibility

- [ ] **iOS Safari** (Primary)
  - Version: Latest
  - All tests pass
- [ ] **Chrome Mobile**
  - Version: Latest
  - All tests pass
- [ ] **Desktop Chrome**
  - Version: Latest
  - All tests pass
- [ ] **Desktop Safari**
  - Version: Latest
  - All tests pass

## Pass Criteria

For PWA acceptance:

- [ ] App is installable on iOS Safari
- [ ] App launches in standalone mode
- [ ] All CRUD operations work offline
- [ ] Data persists across page reloads
- [ ] Service worker caches assets properly
- [ ] Update flow works correctly
- [ ] No console errors in production build
- [ ] Performance meets targets

## Notes

- Document any issues found during testing
- Include device/browser versions where issues occur
- Screenshot any visual bugs
- Note any performance bottlenecks

## Testing Date

- Date: ****\_\_\_****
- Tester: ****\_\_\_****
- Build Version: ****\_\_\_****
- Result: [ ] Pass / [ ] Fail

## Issues Found

1. ***
2. ***
3. ***
