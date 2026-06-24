# Architecture

Whisper Studio Desktop uses a process-first architecture. Each runtime has a clear job and communicates through typed contracts.

## Main Process

`src/main` owns privileged desktop behavior:

- Application lifecycle
- Native windows
- Application menus
- External links
- IPC handlers
- Future integrations such as file system access, auto-updates, and native dialogs

Renderer code should not import from `src/main`.

## Preload

`src/preload` is the only bridge between Electron and React. It exposes a narrow API through `contextBridge` while `contextIsolation`, `sandbox`, and `nodeIntegration: false` remain enabled.

Add new renderer-facing capabilities by:

1. Defining request and response types in `src/shared`.
2. Registering an IPC handler in `src/main/ipc`.
3. Exposing a small function from `src/preload`.
4. Calling that function from React.

## Renderer

`src/renderer` owns UI and product workflows. It is organized around a workbench shell:

- `components` for reusable layout and controls
- `features` for product-specific screens
- `lib` for renderer-only data and helpers

Keep OS access out of this layer. Use `window.desktop` for native capabilities.

## Shared Contracts

`src/shared` contains IPC channel names and TypeScript interfaces used by more than one process. Keep this layer dependency-free so it can be imported anywhere.

## Packaging

Electron Builder reads release settings from `package.json`. Generated artifacts are written to `release/`, while compiled app code is written to `out/`.

Before a public release, add:

- Real application icons in `resources/`
- macOS signing and notarization
- Windows code signing
- Auto-update configuration
- CI release jobs with protected secrets
