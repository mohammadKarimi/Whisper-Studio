# WhisperX Desktop

An open-source desktop boilerplate built with Electron, React, TypeScript, and Vite. The structure is designed for a VS Code-style product: native app responsibilities stay in Electron, UI work stays in React, and shared contracts keep IPC predictable.

## Stack

- Electron for cross-platform desktop runtime
- React and Vite for the renderer workbench
- shadcn/ui and Tailwind CSS for the renderer design system
- TypeScript project references for main, preload, renderer, and shared code
- Electron Builder for macOS, Windows, and Linux packaging
- ESLint and Prettier for contributor-friendly consistency

## Getting Started

```bash
npm install
npm run dev
```

## Scripts

```bash
npm run dev          # Start Electron with Vite hot reload
npm run typecheck    # Check all TypeScript projects
npm run build        # Build main, preload, and renderer
npm run preview      # Preview the packaged build locally
npm run pack         # Create an unpacked app for the current platform
npm run dist         # Build installers for the current platform
npm run dist:mac     # Build macOS artifacts
npm run dist:win     # Build Windows artifacts
npm run dist:linux   # Build Linux artifacts
npm run lint         # Run ESLint
npm run format       # Format the repository
```

## UI Components

shadcn/ui is configured for the renderer. Components live in:

```text
src/renderer/src/components/ui
```

Add more components with:

```bash
npx shadcn@latest add card
```

The `@/*` alias points to `src/renderer/src/*`, so imports look like:

```ts
import { Button } from "@/components/ui/button"
```

## Project Layout

```text
src/
  main/       Electron main process: app lifecycle, windows, menus, IPC handlers
  preload/    Context-isolated bridge exposed to the renderer
  renderer/   React workbench UI
  shared/     Types and constants shared across processes
docs/         Architecture and contributor notes
resources/    Icons and packaging resources
```

## Release Targets

Electron Builder is configured for:

- macOS: `dmg`, `zip`
- Windows: `nsis`, `portable`
- Linux: `AppImage`, `deb`

Code signing, notarization, update feeds, and platform-specific icons should be added before publishing production releases.

Tagged releases that match `v*` run `.github/workflows/release.yml` and upload platform artifacts from macOS, Windows, and Linux runners.
