# Whisper Studio

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

<img width="3840" height="2280" alt="image 36" src="https://github.com/user-attachments/assets/a483f97f-30b6-4722-b0ee-83c139244f91" />

A cross-platform desktop application for AI-powered audio and video transcription using [OpenAI Whisper](https://github.com/openai/whisper). Built with Electron, React, TypeScript, and Vite.

Whisper Studio runs entirely on your machine — no cloud services, no data leaves your device. Transcribe audio or video files, edit the resulting transcript, and export to SRT, VTT, TXT, TSV, or JSON.

## Features

- Transcribe audio and video files locally using OpenAI Whisper
- GPU (CUDA) and CPU compute modes
- Real-time transcription progress and live log output
- Interactive transcript editor with search and replace
- Export to SRT, VTT, TXT, TSV, and JSON
- Model manager — download and delete Whisper models in-app
- Prerequisite checker for Python, FFmpeg, CUDA, and pip packages
- Dark / light theme

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
import { Button } from '@/components/ui/button'
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
