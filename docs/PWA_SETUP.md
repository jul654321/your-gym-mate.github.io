# PWA Setup Documentation

This document describes the PWA (Progressive Web App) setup for Your Gym Mate.

## Overview

Your Gym Mate is configured as a fully offline-capable PWA with the following features:

- ✅ **Installable** - Can be installed on iOS/Android home screens
- ✅ **Offline-first** - Works completely offline using IndexedDB
- ✅ **Service Worker** - Caches assets for fast loading and offline access
- ✅ **Update notifications** - Alerts users when new versions are available
- ✅ **iOS optimized** - Includes iOS-specific meta tags and icons

## Architecture

### Components

1. **Service Worker** (`public/sw.js`)
   - Handles asset caching and offline support
   - Cache-first strategy for static assets
   - Network-first for dynamic data
   - Automatic cache cleanup

2. **IndexedDB** (`src/lib/db/`)
   - Local-first data storage
   - Full schema with migrations support
   - Object stores: exercises, plans, sessions, loggedSets, settings, events, undo_trash
   - Comprehensive indexes for efficient queries

3. **React Hooks** (`src/hooks/`)
   - `useDbInit` - Initializes database on app start
   - `useExercises` - Exercise CRUD operations
   - `usePlans` - Plan CRUD operations
   - `useSessions` - Session CRUD operations
   - `useLoggedSets` - Logged set CRUD operations
   - All hooks use React Query for caching and optimistic updates

4. **Service Worker Registration** (`src/serviceWorker/register.ts`)
   - Registers SW only in production
   - Provides update callbacks
   - Handles SW lifecycle events

5. **Update UI** (`src/components/UpdateAvailableBanner.tsx`)
   - Non-blocking update notification
   - Allows user to defer updates
   - One-click update and reload

## File Structure

```
your-gym-mate/
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service worker
│   └── icons/                  # App icons
│       ├── icon-192.png
│       ├── icon-512.png
│       └── apple-touch-icon.png
├── src/
│   ├── lib/
│   │   └── db/
│   │       ├── index.ts        # IndexedDB wrapper
│   │       ├── dev-helpers.ts  # Dev debugging tools
│   │       └── migrations/
│   │           ├── index.ts    # Migration registry
│   │           └── README.md   # Migration guide
│   ├── hooks/
│   │   ├── useDbInit.ts        # DB initialization
│   │   ├── useExercises.ts     # Exercise hooks
│   │   ├── usePlans.ts         # Plan hooks
│   │   ├── useSessions.ts      # Session hooks
│   │   ├── useLoggedSets.ts    # Logged set hooks
│   │   └── index.ts            # Barrel export
│   ├── components/
│   │   └── UpdateAvailableBanner.tsx
│   ├── serviceWorker/
│   │   └── register.ts         # SW registration
│   └── main.tsx                # App entry (registers SW & DB)
├── docs/
│   ├── ACCEPTANCE_PWA.md       # Acceptance test checklist
│   ├── DEV_PWA.md              # Developer guide
│   └── PWA_SETUP.md            # This file
└── index.html                  # PWA meta tags
```

## Key Technologies

- **idb** - Promise-based IndexedDB wrapper
- **@tanstack/react-query** - Data fetching and caching
- **uuid** - Generating unique IDs
- **Service Worker API** - Offline and caching
- **IndexedDB API** - Client-side storage

## Configuration

### Manifest (`public/manifest.json`)

```json
{
  "name": "Your Gym Mate",
  "short_name": "GymMate",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#0ea5a4",
  "background_color": "#ffffff"
}
```

### Service Worker Cache

- **Static cache**: `gymmate-static-v1`
  - Contains precached assets (index.html, JS, CSS, icons)
  
- **Runtime cache**: `gymmate-runtime-v1`
  - Dynamically caches assets as they're fetched

### Database Schema

**Database name**: `your-gym-mate`  
**Version**: 1

**Object Stores**:
- `exercises` - Exercise definitions
- `plans` - Workout plans
- `sessions` - Workout sessions
- `loggedSets` - Individual set records
- `settings` - App settings (key-value)
- `events` - Analytics events
- `undo_trash` - Soft-deleted records for undo

See [IndexedDB Schema Plan](../.cursor/plans/indexeddb_schema_ef33b4bd.plan.md) for detailed schema.

## Usage

### Development

```bash
# Start dev server (SW not registered)
npm run dev
```

### Testing PWA Features

```bash
# Build and preview
npm run build
npm run preview
```

### Debugging

In browser console (development mode only):

```javascript
// Get database instance
const db = await window.__getDB()

// View all exercises
const exercises = await db.getAll('exercises')

// Export all data
const data = await window.__exportData()

// Clear all data (dev only!)
await window.__clearAllData()
```

## Guidelines

### Service Worker Updates

When updating the service worker:

1. Change `CACHE_NAME` in `public/sw.js`
2. Rebuild: `npm run build`
3. Users will see update banner on next visit
4. Clicking "Update Now" reloads with new SW

### Database Migrations

When changing schema:

1. Increment `DB_VERSION` in `src/lib/db/index.ts`
2. Add migration function in `src/lib/db/migrations/index.ts`
3. Test migration thoroughly before deploying

See [Migration README](../src/lib/db/migrations/README.md) for details.

### Adding New Features

When adding new hooks:

1. Create hook in `src/hooks/`
2. Use React Query for caching
3. Implement optimistic updates where appropriate
4. Export from `src/hooks/index.ts`
5. Add tests

## Testing

See [ACCEPTANCE_PWA.md](./ACCEPTANCE_PWA.md) for comprehensive test checklist.

**Quick test:**
1. Build: `npm run build && npm run preview`
2. Open in browser
3. Check Application tab → Service Workers (should be registered)
4. Check Application tab → IndexedDB (should see database)
5. Go offline (DevTools → Network → Offline)
6. Reload - app should still work

## Performance

### Targets

- Initial load: < 2s on 3G
- Cached load: < 500ms
- Database queries: < 100ms

### Optimization

- Service worker caches critical assets
- IndexedDB uses indexes for fast queries
- React Query minimizes re-fetches
- Code splitting with React.lazy (future)

## Browser Support

**Primary target**: iOS Safari (latest)

**Supported**:
- iOS Safari 14+
- Chrome 90+
- Edge 90+
- Safari 14+

**Not supported**:
- IE11 (no IndexedDB or Service Worker support)
- Very old browsers

## Resources

- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [IDB Library](https://github.com/jakearchibald/idb)
- [React Query](https://tanstack.com/query/latest)

## Troubleshooting

See [DEV_PWA.md](./DEV_PWA.md) for detailed debugging guide.

**Common issues**:

- **SW not updating**: Change cache version and hard reload
- **DB not working**: Check browser console, clear DB and retry
- **App not installing**: Check manifest.json and icons
- **Offline not working**: Ensure production build (`npm run build`)

## Next Steps

Future enhancements:

- [ ] Background sync for data
- [ ] Push notifications
- [ ] Advanced caching strategies (Workbox)
- [ ] Share API integration
- [ ] Periodic background sync
- [ ] File System Access API for exports

## Maintenance

**Regular tasks**:
- Update dependencies monthly
- Test PWA features after major updates
- Monitor browser compatibility
- Update cache version when deploying

**Before each release**:
- [ ] Run `npm run build` successfully
- [ ] Test on iOS Safari
- [ ] Verify offline functionality
- [ ] Check service worker registration
- [ ] Test update flow
- [ ] Run acceptance tests

---

**Last Updated**: 2026-01-29  
**Version**: 1.0.0
