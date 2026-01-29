# PWA Development Guide

This guide explains how to develop, test, and debug PWA features in Your Gym Mate.

## Local Development

### Development Mode

Service workers are **NOT** registered in development mode to avoid caching issues during development.

```bash
npm run dev
```

**Development behavior:**
- Hot Module Replacement (HMR) works normally
- No service worker active
- IndexedDB still works for testing data persistence
- Console log: "Service worker not registered in development mode"

### Testing PWA Features Locally

To test PWA features (service worker, offline mode, etc.), you must build and preview:

```bash
# Build for production
npm run build

# Preview the production build
npm run preview
```

**Preview behavior:**
- Service worker is registered (if in production mode)
- All PWA features work
- Served over HTTP on localhost (service workers work on localhost even without HTTPS)

### HTTPS for Testing

Service workers require HTTPS in production, but work on `localhost` without it.

**Options for HTTPS testing:**

1. **Use ngrok or similar tunnel:**
   ```bash
   npm run preview
   # In another terminal:
   ngrok http 4173
   ```

2. **Use local HTTPS server:**
   ```bash
   # Install mkcert
   brew install mkcert  # macOS
   choco install mkcert # Windows
   
   # Create local CA
   mkcert -install
   
   # Generate certificate
   mkcert localhost
   
   # Update vite.config.ts to use HTTPS
   ```

3. **Use Vite's HTTPS option:**
   ```typescript
   // vite.config.ts
   export default defineConfig({
     server: {
       https: true
     }
   })
   ```

## Debugging Service Workers

### Chrome DevTools

1. **View Service Workers:**
   - Open DevTools
   - Go to Application tab → Service Workers
   - View status, scope, and controls

2. **Update Service Worker:**
   - Click "Update" to check for new version
   - Click "Unregister" to remove SW (useful for testing)
   - Check "Update on reload" during development

3. **View Cache:**
   - Application tab → Cache Storage
   - Inspect cached assets
   - Clear cache if needed

4. **Console Logs:**
   - Service worker logs appear in console
   - Look for `[SW]` prefix

### Testing Service Worker Updates

1. **Make a change:**
   - Edit `public/sw.js`
   - Change `CACHE_NAME` version (e.g., v1 → v2)

2. **Rebuild:**
   ```bash
   npm run build
   npm run preview
   ```

3. **Trigger update:**
   - With app open, wait for automatic check (every hour)
   - Or: DevTools → Application → Service Workers → Update
   - Or: Hard reload (Cmd+Shift+R / Ctrl+Shift+R)

4. **Verify update banner:**
   - Should see "New version available!" banner
   - Click "Update Now" to activate new SW

### Simulating Offline Mode

**Chrome DevTools:**
- Network tab → Throttling → Offline
- Or: Application tab → Service Workers → Offline checkbox

**System:**
- Enable Airplane Mode
- Disconnect from Wi-Fi

**Test checklist:**
- [ ] App loads from cache
- [ ] IndexedDB data accessible
- [ ] CRUD operations work
- [ ] Appropriate offline indicators shown

## Debugging IndexedDB

### Chrome DevTools

1. **View Database:**
   - Application tab → IndexedDB → your-gym-mate
   - Expand to see object stores

2. **Inspect Data:**
   - Click on object store to view records
   - View indexes and their data

3. **Clear Data:**
   - Right-click database → Delete database
   - Or use dev helper: `clearAllData()` from console

### Programmatic Access

Open browser console and use the DB wrapper:

```javascript
// Get DB instance
const db = await window.__getDB()

// View all exercises
const exercises = await db.getAll('exercises')
console.table(exercises)

// View all sessions
const sessions = await db.getAll('sessions')
console.table(sessions)

// Clear all data (dev only!)
await window.__clearAllData()
```

### Database Migrations

When changing schema:

1. **Increment DB_VERSION:**
   ```typescript
   // src/lib/db/index.ts
   export const DB_VERSION = 2; // was 1
   ```

2. **Add migration:**
   ```typescript
   // src/lib/db/migrations/index.ts
   export const migrations: Record<number, MigrationFunction> = {
     1: async () => { /* initial schema */ },
     2: async (db) => {
       // Your migration here
       const tx = db.transaction('plans', 'readwrite');
       // ... migration logic
       await tx.done;
     },
   };
   ```

3. **Test migration:**
   - Create test data with old schema
   - Update code with new schema and migration
   - Reload app
   - Verify migration runs successfully
   - Verify data integrity

## Common Issues & Solutions

### Service Worker Not Updating

**Problem:** Old service worker stays active

**Solutions:**
- Hard reload (Cmd+Shift+R / Ctrl+Shift+R)
- Unregister in DevTools
- Clear site data
- Check `skipWaiting()` is called in SW

### Cache Not Clearing

**Problem:** Old cached assets still served

**Solutions:**
- Change `CACHE_NAME` in sw.js
- Clear cache in DevTools
- Unregister service worker
- Check cache cleanup in `activate` event

### IndexedDB Not Working

**Problem:** Database operations fail

**Solutions:**
- Check browser console for errors
- Verify browser supports IndexedDB
- Check for quota exceeded errors
- Clear database and start fresh
- Check if DB is blocked by another tab

### Update Banner Not Showing

**Problem:** SW updates but no notification

**Solutions:**
- Check `onUpdate` callback is registered
- Verify `window.__setUpdateAvailable` exists
- Check console for SW lifecycle events
- Ensure new SW is actually different

## Performance Optimization

### Service Worker Cache Strategy

**Current implementation:**
- **Static assets:** Cache-first (fast, offline-ready)
- **Dynamic data:** Network-first (fresh when online)

**Optimization tips:**
- Keep precache list small (only critical assets)
- Use runtime cache for lazy-loaded resources
- Set cache expiration for runtime cache
- Clean up old caches in activate event

### IndexedDB Performance

**Best practices:**
- Use indexes for common queries
- Batch operations in transactions
- Use compound indexes for multi-field queries
- Limit query result size with pagination
- Use cursor for large datasets

**Monitoring:**
```javascript
// Measure query performance
console.time('query');
const results = await db.getAll('loggedSets');
console.timeEnd('query');
```

## Testing Checklist

Before committing PWA changes:

- [ ] Build succeeds: `npm run build`
- [ ] Preview works: `npm run preview`
- [ ] Service worker registers in preview
- [ ] App works offline
- [ ] Update flow works
- [ ] No console errors
- [ ] IndexedDB migrations work
- [ ] Data persists across reloads

## Useful Commands

```bash
# Development
npm run dev                    # Start dev server

# Production testing
npm run build                  # Build for production
npm run preview                # Preview production build

# Linting
npm run lint                   # Check for errors

# Database helpers (in browser console)
await window.__getDB()         # Get DB instance
await window.__clearAllData()  # Clear all data
await window.__exportData()    # Export as JSON
```

## Additional Resources

- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Workbox](https://developers.google.com/web/tools/workbox) (optional future enhancement)
- [IDB Library](https://github.com/jakearchibald/idb)
- [React Query Docs](https://tanstack.com/query/latest)

## Support

For issues or questions:
1. Check browser console for errors
2. Review this guide
3. Check service worker status in DevTools
4. Inspect IndexedDB in DevTools
5. Test in production build (not dev)
