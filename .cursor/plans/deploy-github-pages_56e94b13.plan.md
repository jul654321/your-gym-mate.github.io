---
name: deploy-github-pages
overview: Deploy this Vite + React + TypeScript app to GitHub Pages (project site) using a GitHub Actions workflow. The plan covers required code/config changes, CI workflow file, SPA routing considerations, PWA/static assets, testing, and post-deploy checks.
todos:
  - id: set-vite-base
    content: Add or update `vite.config.ts` to set `base` to `'/your-gym-mate/'` (replace with actual repo name).
    status: pending
  - id: ensure-pwa-assets
    content: Verify `public/manifest.json`, `public/sw.js`, and `public/icons/*` exist and update `start_url`/icon paths if necessary.
    status: pending
  - id: add-404-fallback
    content: Add `public/404.html` to provide SPA fallback or convert routing to `HashRouter`.
    status: pending
  - id: add-gh-actions
    content: Create `.github/workflows/deploy-pages.yml` with the provided workflow to build and deploy `dist/` to GitHub Pages.
    status: pending
  - id: commit-and-push
    content: Commit changes and push to the publish branch (e.g. `main`) to trigger the workflow.
    status: pending
  - id: verify-and-troubleshoot
    content: Monitor Actions run, verify site at `https://<username>.github.io/<repo-name>/`, and fix any asset/route issues.
    status: pending
isProject: false
---

# Deploy to GitHub Pages

## Overview

This plan deploys the app (Vite + React + TypeScript) as a GitHub Pages _project site_ (served from //) using a GitHub Actions workflow. It sets Vite's base path for the repo, builds the production site, uploads the `dist/` artifact, and uses GitHub's Pages deployment actions to publish. It also covers SPA routing (404 fallback), PWA/public assets, and testing.

## Preconditions & assumptions

- Repo name will be used as the base path (project site). Replace `your-gym-mate` with the actual repository name if different.
- You have push access to the GitHub repository and Actions enabled.
- Node 18+ / npm installed locally for testing.
- Build output is the default `dist/` produced by `vite build` (see `package.json` scripts):

```6:11:package.json
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
```

## High-level steps

1. Set Vite `base` to your repo path so built assets load from `/<repo>/`.
2. Ensure PWA/public assets (manifest, sw, icons) are in `public/` and reference correct start_url/base.
3. Add a SPA-friendly `404.html` fallback or switch to `HashRouter` for client-side routing.
4. Create a GitHub Actions workflow that runs `npm ci`, builds, uploads the `dist/` artifact and publishes to Pages.
5. Commit and push, verify the site, and troubleshoot common issues.

---

## Detailed step-by-step instructions

### 1) Set the Vite `base` (required for project GitHub Pages path)

1. Open or create `vite.config.ts` at the project root.
2. Set `base` to `'/<repo-name>/'`. Replace `<repo-name>` with your GitHub repo name (e.g. `/your-gym-mate/`).

Example `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/your-gym-mate/", // <-- replace with your repo name and leading/trailing slashes
  plugins: [react()],
});
```

Notes:

- If you already have `vite.config.ts`, add/replace the `base` property. Using the correct base ensures static assets are resolved under the repo path.

---

### 2) Ensure PWA and static assets are in `public/`

1. Confirm `public/manifest.json`, `public/sw.js`, and `public/icons/*` exist as required by the PWA rules.
2. Ensure the manifest `start_url` and icons use the repo base if necessary. Example manifest `start_url` can be `"/your-gym-mate/"` for a project site.

Example manifest change to check:

```json
{
  "name": "Your Gym Mate",
  "short_name": "GymMate",
  "start_url": "/your-gym-mate/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0ea5a4",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

If you want the app to be portable between local dev (/) and GitHub Pages (/repo/), use a small runtime prefix helper in code or set paths relative to `process.env.BASE_URL` if you have build-time templating.

---

### 3) SPA routing: add a `404.html` fallback (recommended) or switch to HashRouter

GitHub Pages returns 404 for deep routes (e.g. `/your-gym-mate/session/123`) unless you provide a fallback. Two options:

Option A — Add `404.html` that redirects to `index.html` (recommended quick fix):
Create `public/404.html` with this content (it will be copied to `dist/404.html` by Vite):

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0; URL=/your-gym-mate/" />
    <script>
      // SPA fallback: load index.html and let router handle route
      (function () {
        var path = window.location.pathname;
        var base = "/your-gym-mate/";
        // If path is under base, re-write URL to base and use History API
        if (path.indexOf(base) === 0) {
          var newUrl = base + "index.html";
          window.location.replace(
            newUrl + window.location.search + window.location.hash
          );
        } else {
          window.location.replace(base);
        }
      })();
    </script>
  </head>
  <body></body>
</html>
```

Option B — Switch to `HashRouter` in your React app so routes include `#` (no server config needed):

```tsx
import { HashRouter as Router } from "react-router-dom";
// wrap your App with <Router> instead of BrowserRouter
```

Choose one. If you prefer clean URLs and a production SPA, use the `404.html` fallback.

---

### 4) Add GitHub Actions workflow to build & deploy to Pages

Create the workflow file at `.github/workflows/deploy-pages.yml` with the following content (official GitHub Pages deployment actions):

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch: {}

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Configure GitHub Pages
        uses: actions/configure-pages@v3

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v1
        with:
          path: ./dist

      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v1
```

Notes:

- This workflow builds `dist/` and deploys it via GitHub's Pages system — no gh-pages branch required.
- The workflow runs on pushes to `main`. Adjust branch name as needed.

---

### 5) Commit, push, and enable Pages if required

1. Add and commit the changed files:

- `vite.config.ts`
- `public/404.html` (if used)
- `.github/workflows/deploy-pages.yml`
- any updates to `public/manifest.json` or PWA files

Commands:

```bash
git add vite.config.ts public/404.html .github/workflows/deploy-pages.yml public/manifest.json
git commit -m "chore: configure GitHub Pages deployment (Vite base, workflow, SPA fallback)"
git push origin main
```

1. After the push the GitHub Actions workflow will run. Open the repository actions page to monitor the build and deploy job.
2. The site will be available at `https://<username>.github.io/<repo-name>/` after deployment. It may take a minute to publish.

---

## Testing & verification (local and production)

1. Local build test:

```bash
npm ci
npm run build
npx serve -s dist -l 5000  # or `npm i -g serve` then serve -s dist
# then visit http://localhost:5000/your-gym-mate/
```

1. Verify assets load from `/<repo-name>/` (check the network tab for 404s).
2. Verify routing works for deep links (enter a nested route directly).
3. Verify PWA installability and service worker (open DevTools > Application > Service Workers).

---

## Troubleshooting

- 404s for assets: confirm `base` in `vite.config.ts` is `'/<repo-name>/'` and build is re-run.
- SPA deep-route 404: ensure `public/404.html` is present or use `HashRouter`.
- Actions failing on permissions: confirm `pages: write` and `id-token: write` are present in workflow `permissions` and Actions are enabled in repo settings.
- Incorrect manifest paths: ensure `manifest.json` uses absolute paths with base prefix or relative paths that work from deployed root.

---

## Optional improvements

- Add caching headers via a custom `deploy` strategy (only relevant for custom hosting).
- Add a `preview` workflow for PRs to validate builds before merging.
- Add automated tests to the workflow before the build step.

---

## Relevant files to change (summary)

- `vite.config.ts` — set `base` to `'/your-gym-mate/'`
- `public/manifest.json` — set `start_url` to `'/your-gym-mate/'` (if needed)
- `public/404.html` — SPA fallback (or switch to `HashRouter`)
- `.github/workflows/deploy-pages.yml` — CI workflow
