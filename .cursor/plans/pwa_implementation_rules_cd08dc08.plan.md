---
name: PWA implementation rules
overview: Create a concise, project-wide set of implementation rules and examples to ensure the app is a proper PWA (installable, offline-capable, iOS-friendly) using React + TypeScript + Tailwind + shadcn UI + IndexedDB.
todos:
  - id: create-pwa-rule
    content: "Create `.cursor/rules/pwa.mdc` with frontmatter `alwaysApply: true` and include the rules and examples above."
    status: pending
  - id: add-manifest-icons
    content: Add `public/manifest.json` and icons and update `public/index.html` with manifest link and iOS meta tags.
    status: pending
  - id: implement-sw
    content: Add `public/sw.js` and register it via `src/serviceWorker/register.ts` and add update prompt UI.
    status: pending
  - id: idb-wrapper
    content: Implement `src/lib/db` using `idb`, versioned schema, and migrations skeleton.
    status: pending
  - id: offline-tests
    content: Create acceptance tests (manual checklist + smoke tests) for installability, offline CRUD, persistence, and SW update flow.
    status: pending
isProject: false
---

# PWA Implementation Rules

## Purpose

Provide clear, actionable rules and examples so all frontend engineers implement features in a consistent, secure, and testable way that satisfies the PRD's PWA, offline, and persistence requirements.

## Scope (proposed defaults)

- Apply project-wide (alwaysApply: true). If you prefer file-scoped rules, use globs: `**/*.tsx`, `**/*.ts`, `public/**`.
- Rule file to create: `.cursor/rules/pwa.mdc` (alwaysApply: true)

## High-level rules (summary)

- Manifest & icons: ship a standards-compliant `manifest.json` and iOS meta/icons in `public/`.
- Service worker: provide a carefully-scoped service worker (no background sync/push for MVP). Use a cache-first strategy for static assets and network-first for API-like reads when appropriate.
- Offline data: use IndexedDB as the single source of truth for app data (use `idb` or a small wrapper). All CRUD flows must work offline and persist across restarts.
- Register SW defensively: only register in production, guard against unsupported browsers, and add an update UX (toast prompting user to refresh when new SW activates).
- iOS installability: include apple-touch-icon, meta tags, and ensure start_url + display are configured; test add-to-home-screen flow on Safari.
- Storage & migrations: version your IndexedDB schema and include a deterministic migration strategy.
- Privacy/security: keep all data local, no external analytics by default; if any telemetry added later, require opt-in and docs.
- UX: ensure fast logging (<20s target), accessible touch targets, and offline fallbacks with clear indicators when offline vs sync pending.

## Concrete rules and guidance (to place in `.cursor/rules/pwa.mdc`)

1. Manifest & icons

- Create `public/manifest.json` with name, short_name, icons (192/512), background_color, theme_color, display: 'standalone', start_url.
- Add `<link rel="manifest" href="/manifest.json">` in `public/index.html` and iOS meta tags (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`) and an `apple-touch-icon`.

Example manifest:

```json
{
  "name": "Your Gym Mate",
  "short_name": "GymMate",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#fccb21",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

1. Service Worker (SW)

- Place `public/sw.js` (or generate via Workbox) and keep it minimal and deterministic.
- Cache strategy:
  - Static assets (JS/CSS/fonts/icons): cache-first with versioned cache name.
  - API/data fetches: network-first with a fallback to IndexedDB or cache for reads where fresh data isn't critical.
- Do NOT rely on background sync or push for MVP (iOS limitations). Implement short-window undo UI instead of relying on background retry.
- SW update UX: when new SW activates, show a non-blocking prompt to refresh.

Example SW skeleton:

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

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Network-first for dynamic data (IndexedDB is preferred source when offline)
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/data/")) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // Cache-first for static assets
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
```

1. SW registration & update handling (React/TS)

- Register SW only in production and in browsers that support it. Provide an `onUpdate` handler to surface a refresh prompt.

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
            ) {
              onUpdate();
            }
          });
        };
      })
      .catch(() => {});
  }
}
```

1. Offline-first data & IndexedDB rules

- Use IndexedDB for all app data; prefer the `idb` library or a small wrapper exposing async CRUD and migrations.
- Patterns:
  - Single source of truth: read UI state from IDs -> IndexedDB queries (or in-memory cache synchronized to IDB).
  - Optimistic writes: write to IndexedDB immediately on create/edit/delete so UI reflects changes offline.
  - Schema versioning: use a `db.version` and migrations in `src/lib/db/migrations.ts`.
  - Exports: provide a CSV export utility that reads from IDB and generates a file shareable by the OS.

Example idb usage:

```ts
import { openDB } from "idb";
const DB_NAME = "your-gym-mate-v1";
const storeNames = {
  exercises: "exercises",
  sessions: "sessions",
  sets: "sets",
};
export async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(storeNames.exercises, { keyPath: "id" });
      db.createObjectStore(storeNames.sessions, { keyPath: "id" });
      db.createObjectStore(storeNames.sets, { keyPath: "id" });
    },
  });
}
```

1. Data integrity & migrations

- Always bump DB version on schema change and include migration code that transforms records safely.
- Keep migration code under `src/lib/db/migrations/` and include tests for migrations.

1. Sync & conflict behavior

- MVP: single-device, local-only — no sync concerns. If future sync added, design deterministic merge strategy and server-side timestamps.

1. Testing, QA & acceptance

- Acceptance tests (manual or automated) must validate:
  - Installable on iOS (add to homescreen) and launches full-screen.
  - CRUD operations work offline and persist after reloads.
  - PR and volume aggregations are computed correctly after data edits/deletes.
  - SW update flow triggers user prompt and refresh behaves correctly.

1. UX & accessibility

- Ensure tappable elements meet mobile target sizes and labels.
- Provide clear offline indicators and undo affordances for destructive actions.

1. Developer ergonomics

- Preferred libraries: `idb` for IndexedDB, lightweight charting lib (e.g., Chart.js or tiny alternatives), avoid heavy Workbox unless you want automatic precaching (fine to use if team is comfortable).
- Document local dev flow: how to run locally with HTTPS or in a dev mode that simulates SW (note: SW only works on HTTPS or localhost).

## Files to add or standardize

- `.cursor/rules/pwa.mdc` (this rule file)
- `public/manifest.json`, `public/sw.js`, `public/icons/*`
- `src/serviceWorker/register.ts` (registration + update handler)
- `src/lib/db/*` (db wrapper, migrations, types)
- `src/components/InstallPrompt.tsx` (optional install UX)

## Todos

- id: create-pwa-rule
  content: Create `.cursor/rules/pwa.mdc` with frontmatter `alwaysApply: true` and include the rules above plus short examples.
- id: add-manifest-icons
  content: Add `public/manifest.json` and required icons + iOS meta tags to `public/index.html`.
- id: implement-sw
  content: Add `public/sw.js` with caching strategies and register in `src/serviceWorker/register.ts` with onUpdate handler.
- id: idb-wrapper
  content: Implement `src/lib/db` with `idb` wrapper, versioned schema, and migration skeleton.
- id: offline-tests
  content: Add manual acceptance test checklist and at least 3 smoke tests verifying offline CRUD and persistence.

## Notes / open decisions

- Use `idb` library vs custom wrapper (recommended: `idb` for speed). Decision needed.
- Use Workbox for precache vs hand-rolled SW (both acceptable; Workbox reduces chance of cache mistakes but adds build complexity).

---

Place this content into `.cursor/rules/pwa.mdc` as the canonical project rule. If you want file-scoped rules instead, tell me which globs to use and I will produce a variant targeted to those patterns.
