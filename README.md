# matshikes

Mobile-friendly hiking map for the hills around Dreisel / Windeck (and anywhere else).

**Live:** https://mvhenten.github.io/matshikes/

- OpenTopoMap base with contours + hill shading
- Waymarked hiking trails overlay
- Tap-to-draw paths that snap to real footpaths via [BRouter](https://brouter.de) (`hiking-mountain` profile)
- Live distance / ascent / descent stats
- Save/load routes: `localStorage` by default, Google Drive (`appDataFolder`) when signed in
- GPS locate
- Installable PWA with offline tile cache

Open the live URL on a phone and "Add to Home Screen" for an app-like feel.

## Stack

Vite · React 19 · TypeScript · Tailwind v4 · shadcn/ui · wouter · react-leaflet · vite-plugin-pwa

## Development

```bash
npm install
npm run dev       # dev server
npm run build     # production build
npm run preview   # serve the built app
npm run fix       # prettier + eslint --fix
```

## Deployment

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml`.

One-time setup: repo Settings → Pages → Source = **GitHub Actions**.

Vite `base` is set to `/matshikes/` to match the repo name.

## Project layout

```
src/
  routes/          MapPage, RoutesPage, SettingsPage
  components/      MapCanvas, AppShell, AuthBadge, ui/*
  lib/             auth, store, brouter, stats
  hooks/           useAuth, useStore
```
