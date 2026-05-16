# Matshikes

Modern Progressive Web App (PWA) for hiking route planning with offline support.

## Features

- 🗺️ **Multiple map layers**: OpenTopoMap (contours), OSM, CyclOSM, Satellite
- 🥾 **Waymarked Trails overlay**: See marked hiking routes
- ✏️ **Smart path drawing**: Tap to draw paths that snap to real footpaths via [BRouter](https://brouter.de)
- 📊 **Live statistics**: Distance, ascent, and descent calculated in real-time
- 💾 **Dual storage**: localStorage for offline use, Google Drive sync for cross-device access
- 📍 **GPS locate**: Find your current position
- 📱 **PWA support**: Install on your phone for an app-like experience with offline caching
- 🌙 **Dark theme**: Easy on the eyes in all conditions

## Tech Stack

- **Framework**: Vite + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Map**: Leaflet + react-leaflet
- **Routing**: wouter
- **PWA**: vite-plugin-pwa with Workbox
- **Storage**: localStorage + Google Drive API

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Format and lint
npm run fix
```

## Deployment

This app deploys to GitHub Pages via GitHub Actions.

### Setup

1. Enable GitHub Pages in repository settings
2. Set **Source** to "GitHub Actions"
3. Push to `main` branch or trigger manually

The workflow:

- Builds the app with `npm run build`
- Uploads the `dist/` folder
- Deploys to GitHub Pages

### Base Path

The app is configured to run at `/matshikes/` (the repository name). This is set in `vite.config.ts` via the `base` option.

## Project Structure

```
src/
  routes/          # Page components (MapPage, RoutesPage, SettingsPage)
  components/      # Reusable components (MapCanvas, AppShell, AuthBadge)
    ui/           # shadcn/ui components
  lib/            # Core logic (auth, store, brouter, stats)
  hooks/          # React hooks (useAuth, useStore)
  types.ts        # TypeScript types
  App.tsx         # Root component with routing
  main.tsx        # Entry point
```

## License

MIT
