# Your Gym Mate 🏋️

A Progressive Web App (PWA) for tracking your workouts offline-first. Built with React, TypeScript, and IndexedDB.
 
Live demo: https://jul654321.github.io/your-gym-mate.github.io/sessions

## Features

✅ **Offline-First** - Works completely offline using IndexedDB  
✅ **Installable** - Install as an app on iOS/Android  
✅ **Fast** - Service worker caching for instant loads  
✅ **Private** - All data stays on your device  
✅ **iOS Optimized** - Designed for Safari on iPhone  

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview

# Open http://localhost:4173
```

### Linting

```bash
# Check for linting errors
npm run lint
```

## Tech Stack

- **React 19** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **IndexedDB** - Client-side database (via `idb`)
- **React Query** - Data fetching and caching
- **Tailwind CSS** - Utility-first CSS (ready to configure)
- **Service Workers** - Offline support and caching

## PWA Architecture

### Core Components

1. **Service Worker** (`public/sw.js`)
   - Caches static assets for offline access
   - Cache-first strategy for fast loading
   - Network-first for dynamic data

2. **IndexedDB** (`src/lib/db/`)
   - Full offline data storage
   - 7 object stores: exercises, plans, sessions, loggedSets, settings, events, undo_trash
   - Comprehensive indexes for fast queries
   - Migration system for schema changes

3. **React Hooks** (`src/hooks/`)
   - `useDbInit` - Initialize database
   - `useExercises` - Exercise CRUD
   - `usePlans` - Workout plan CRUD
   - `useSessions` - Session CRUD
   - `useLoggedSets` - Set logging CRUD

4. **Update Notifications**
   - Non-blocking banner when updates are available
   - One-click update and reload

## Project Structure

```
your-gym-mate/
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service worker
│   └── icons/                  # App icons (192, 512, apple)
├── src/
│   ├── lib/
│   │   └── db/                 # IndexedDB wrapper + migrations
│   ├── hooks/                  # React hooks for data operations
│   ├── components/             # React components
│   ├── serviceWorker/          # SW registration
│   ├── types.ts                # TypeScript definitions
│   ├── main.tsx                # App entry point
│   └── App.tsx                 # Root component
├── docs/
│   ├── PWA_SETUP.md            # PWA architecture guide
│   ├── ACCEPTANCE_PWA.md       # Testing checklist
│   └── DEV_PWA.md              # Development guide
└── index.html                  # HTML entry + PWA meta tags
```

## Development Guide

### Testing PWA Features

Service workers only work in production builds or on `localhost`. To test PWA features:

1. Build the app: `npm run build`
2. Preview: `npm run preview`
3. Open DevTools → Application tab
4. Verify Service Worker is registered
5. Verify IndexedDB is created
6. Test offline (Network tab → Offline)

See [docs/DEV_PWA.md](./docs/DEV_PWA.md) for detailed debugging guide.

### Database Development

In development mode, database helpers are exposed on `window`:

```javascript
// Get database instance
const db = await window.__getDB()

// View all exercises
const exercises = await db.getAll('exercises')

// Export all data as JSON
const data = await window.__exportData()

// Clear all data (careful!)
await window.__clearAllData()
```

### Adding Database Migrations

When changing the schema:

1. Increment `DB_VERSION` in `src/lib/db/index.ts`
2. Add migration in `src/lib/db/migrations/index.ts`
3. Test thoroughly before deploying

See [src/lib/db/migrations/README.md](./src/lib/db/migrations/README.md) for migration guide.

## Testing

### Manual Acceptance Testing

See [docs/ACCEPTANCE_PWA.md](./docs/ACCEPTANCE_PWA.md) for comprehensive checklist.

**Quick test:**
1. Build and preview: `npm run build && npm run preview`
2. Open browser DevTools
3. Check Application → Service Workers (should be registered)
4. Check Application → IndexedDB (should see `your-gym-mate`)
5. Go offline (Network → Offline)
6. Reload - app should still work

### iOS Testing

1. Deploy to HTTPS server (or use ngrok)
2. Open in Safari on iPhone
3. Tap Share → Add to Home Screen
4. Launch installed app
5. Verify standalone mode (no browser UI)
6. Test offline functionality

## Configuration

### PWA Manifest

Edit `public/manifest.json` to customize:
- App name and short name
- Theme color
- Background color
- Icons
- Display mode

### Service Worker Cache

Edit cache version in `public/sw.js`:

```javascript
const CACHE_NAME = "gymmate-static-v1"; // Increment when updating
```

### Database Schema

See [.cursor/plans/indexeddb_schema_ef33b4bd.plan.md](./.cursor/plans/indexeddb_schema_ef33b4bd.plan.md) for complete schema.

## Browser Support

**Primary Target:**
- iOS Safari 14+

**Supported:**
- Chrome 90+
- Edge 90+
- Safari 14+

**Not Supported:**
- IE11 (no PWA support)

## Performance

**Targets:**
- Initial load: < 2s on 3G
- Cached load: < 500ms
- DB queries: < 100ms

**Optimizations:**
- Service worker precaches critical assets
- IndexedDB uses indexes for fast queries
- React Query minimizes re-fetches
- Optimistic updates for instant UI feedback

## Documentation

- [PWA Setup Guide](./docs/PWA_SETUP.md) - Architecture and setup
- [Development Guide](./docs/DEV_PWA.md) - Local development and debugging
- [Acceptance Tests](./docs/ACCEPTANCE_PWA.md) - Testing checklist
- [IndexedDB Schema](./.cursor/plans/indexeddb_schema_ef33b4bd.plan.md) - Database schema
- [Tech Stack](./.ai/tech-stack.md) - Technology choices

## Troubleshooting

### Service Worker Not Updating

- Change `CACHE_NAME` in `public/sw.js`
- Hard reload (Cmd+Shift+R or Ctrl+Shift+R)
- DevTools → Application → Service Workers → Unregister

### App Not Working Offline

- Ensure you're testing production build (`npm run build`)
- Check Service Worker is registered (DevTools → Application)
- Verify assets are cached (DevTools → Cache Storage)

### Database Errors

- Check browser console for errors
- Clear database: DevTools → IndexedDB → Delete
- Use `window.__clearAllData()` in dev mode

### Installation Issues (iOS)

- Verify `manifest.json` is served correctly
- Check icons are accessible
- Ensure HTTPS (required for PWA on iOS)
- Verify `apple-mobile-web-app-capable` meta tag

## Future Enhancements

- [ ] Background sync for data
- [ ] Push notifications
- [ ] Workbox for advanced caching
- [ ] Share API integration
- [ ] Export to CSV
- [ ] Chart visualizations
- [ ] Exercise library with images

## Contributing

This is a personal project, but if you'd like to contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure linting passes: `npm run lint`
5. Test PWA features: `npm run build && npm run preview`
6. Submit a pull request

## License

MIT License - See LICENSE file for details

## Resources

- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [React Query Docs](https://tanstack.com/query/latest)
- [IDB Library](https://github.com/jakearchibald/idb)

---

**Built with ❤️ for offline-first workout tracking**

Version: 1.0.0 | Last Updated: 2026-01-29
