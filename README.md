# Whisper Studio

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

<img width="3840" height="2280" alt="image 36" src="https://github.com/user-attachments/assets/a483f97f-30b6-4722-b0ee-83c139244f91" />

<img width="3840" height="2280" alt="image 38" src="https://github.com/user-attachments/assets/0f9000bf-19b5-4d27-b1fe-e90e1b5bdb70" />

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

## Release Targets

Electron Builder is configured for:

- macOS: `dmg`, `zip`
- Windows: `nsis`, `portable`
- Linux: `AppImage`, `deb`

Code signing, notarization, update feeds, and platform-specific icons should be added before publishing production releases.

Tagged releases that match `v*` run `.github/workflows/release.yml` and upload platform artifacts from macOS, Windows, and Linux runners.
