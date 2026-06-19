# Contributing

Thanks for helping improve WhisperX Desktop.

## Local Workflow

```bash
npm install
npm run dev
```

Before opening a pull request, run:

```bash
npm run typecheck
npm run lint
npm run build
```

## Code Organization

- Put native desktop behavior in `src/main`.
- Put renderer-facing bridge methods in `src/preload`.
- Put shared IPC contracts in `src/shared`.
- Put React features in `src/renderer/src/features`.
- Keep reusable renderer UI in `src/renderer/src/components`.

## Pull Requests

Good pull requests are focused, include a short description of the user-visible change, and call out platform-specific behavior when it matters.
