---
name: pwa-setup
overview: "Concrete, staged plan to implement PWA fundamentals for Your Gym Mate: manifest, service worker, SW registration, IndexedDB wrapper and migration skeleton, icons, and acceptance tests — optimized for iOS and single-device offline-first usage."
todos:
  - id: pwa-manifest-icons
    content: Add `public/manifest.json`, icons (192/512), update `public/index.html` with manifest link and iOS meta tags.
    status: pending
  - id: pwa-sw
    content: Add `public/sw.js` minimal SW with versioned cache, static precache, and network-first dynamic fetch handling.
    status: pending
  - id: pwa-sw-register
    content: Add `src/serviceWorker/register.ts` with `onUpdate` callback and small `UpdateAvailableBanner` component.
    status: pending
  - id: pwa-idb-wrapper
    content: Implement `src/lib/db/index.ts` using `idb`, create migrations skeleton under `src/lib/db/migrations/`, and expose `useDbInit` and `withTransaction`.
    status: pending
  - id: pwa-core-hooks
    content: "Implement core hooks: `useExercises`, `usePlans`, `useSessions`, `useLoggedSets` (wire to React Query/cache and ensure optimistic updates)."
    status: pending
  - id: pwa-tests
    content: Add manual acceptance checklist `docs/ACCEPTANCE_PWA.md` and 2–3 smoke tests under `tests/pwa/` verifying offline CRUD and SW flows.
    status: pending
  - id: pwa-docs
    content: Add `docs/DEV_PWA.md` explaining local dev SW testing, HTTPS, and how to simulate updates for QA.
    status: pending
isProject: false
---

# PWA Setup Plan

## Goals

- Make the app installable on iOS and modern mobile browsers.
- Ensure offline read/write persistence using IndexedDB as single source of truth.
- Provide a minimal, deterministic service worker with an update UX and clear dev ergonomics.
- Ship developer-facing helpers (db wrapper, migrations, registration) and an acceptance checklist.

## Scope

- MVP-focused: manifest + icons, minimal hand-rolled `sw.js`, `idb`-backed DB wrapper and migrations skeleton, SW registration + update prompt UI, manual and automated smoke tests.
- Files created/updated:
  - `public/manifest.json`
  - `public/sw.js`
  - `public/icons/icon-192.png`, `public/icons/icon-512.png` (and apple-touch-icon)
  - `public/index.html` (manifest link + iOS meta)
  - `src/serviceWorker/register.ts`
  - `src/components/InstallPrompt.tsx` (optional, lightweight)
  - `src/lib/db/index.ts` (idb wrapper), `src/lib/db/migrations/*`
  - `tests/pwa/offline-smoke.spec.ts` (basic smoke tests) and a manual acceptance checklist in `docs/ACCEPTANCE_PWA.md`

## Implementation steps (concise & actionable)

1. Choose defaults (apply now):

- IndexedDB helper: use `idb` (recommended in tech stack and plans).
- SW: hand-rolled `public/sw.js` (minimal, deterministic precache). Workbox is optional for future optimization.
- Undo window: 8s default (per indexeddb plan).

1. Add Web App Manifest + icons

- Create `public/manifest.json` (start_url `/`, display `standalone`, theme/background colors).

Example manifest:

```json
{
  "name": "Your Gym Mate",
  "short_name": "GymMate",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0ea5a4",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- Update `public/index.html` to include `<link rel="manifest" href="/manifest.json">` and iOS meta tags (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`) and an `apple-touch-icon` reference.

1. Service Worker (minimal deterministic)

- Add `public/sw.js` with versioned cache name (e.g. `gymmate-static-v1`), precache main static assets produced by the build (`/index.html`, main chunk, CSS, icons) and implement:
  - Cache-first for static assets
  - Network-first for data endpoints (if any) with fallback to cache/IDB
  - Skip background sync / push
  - On `install` call `self.skipWaiting()`; on `activate` call `self.clients.claim()`

Minimal SW skeleton:

```javascript
const CACHE_NAME = "gymmate-static-v1";
const ASSETS = [
  "/index.html",
  "/styles.css",
  "/main.js",
  "/icons/icon-192.png",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/data/")) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
```

1. SW registration + update UX

- Add `src/serviceWorker/register.ts` that registers only in production and exposes an `onUpdate` callback.

Example register snippet:

```ts
export function registerServiceWorker(onUpdate: () => void) {
  if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        reg.onupdatefound = () => {
          const inst = reg.installing;
          inst?.addEventListener("statechange", () => {
            if (
              inst.state === "installed" &&
              navigator.serviceWorker.controller
            )
              onUpdate();
          });
        };
      })
      .catch(() => {});
  }
}
```

- Surface update prompt via a small banner/snackbar component (e.g. `src/components/InstallPrompt.tsx` or `UpdateAvailableBanner`). Provide one-click refresh that calls `window.location.reload()` after `postMessage({type:'SKIP_WAITING'})` if using message-based activation.

1. IndexedDB wrapper & migrations

- Implement `src/lib/db/index.ts` using `idb` and follow the schema in `.cursor/plans/indexeddb_react_hooks_plan_80ebb75f.plan.md` (object stores: `exercises`, `plans`, `sessions`, `loggedSets`, `settings`, `events`, `undo_trash`).
- Provide `useDbInit` and `withTransaction` helpers and place migrations modules in `src/lib/db/migrations/` with versioned functions.
- Default DB name: `your-gym-mate-v1`.

1. Hooks & cache integration

- Implement core hooks (in order): `useDbInit`, `useExercises`, `usePlans`, `useSessions`, `useLoggedSets`. Use React Query (recommended) for cache and optimistic updates (per indexeddb plan).
- Ensure `create/delete session` transactional semantics (delete session should delete associated loggedSets inside a transaction and use `undo_trash`).

1. Testing & Acceptance

- Manual acceptance checklist `docs/ACCEPTANCE_PWA.md` with items:
  - Installable on iOS (add to homescreen) and launches full-screen
  - Offline CRUD works (create, update, delete) and survives reload
  - SW update flow surfaces prompt and refresh works
  - Aggregates (PR & volume) computed correctly after edits/deletes
- Add 2–3 automated smoke tests (e.g., playwright or vitest + jsdom where feasible) under `tests/pwa/offline-smoke.spec.ts` covering:
  - IndexedDB write/read persists across page reload (simulate by re-instantiating DB)
  - SW registration exists (test reg only in production env) and emits `onUpdate` when installing updated SW in test harness (if possible)

1. Developer docs & local dev flow

- Document how to run locally with HTTPS or how to emulate SW in dev in `docs/DEV_PWA.md`.
- Note: SW only active on HTTPS or `localhost`. Recommend `npm run start` on `localhost` for local testing.

## Decisions & Open items (defaults chosen above)

- Use `idb` wrapper (default). If you prefer a custom wrapper, substitute and keep `useDbInit` API contract.
- Use hand-rolled `public/sw.js` for deterministic behavior and minimal build complexity. If team wants Workbox, add it as a follow-up task.

## Deliverables (what to review / test)

- PR with the files above and an acceptance checklist demonstrating manual verification on iOS Safari and Chrome mobile emulation.
- Smoke tests passing for IndexedDB read/write and basic SW registration path.
