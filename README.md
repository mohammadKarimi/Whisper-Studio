# Whisper Studio

<p align="center">
  
<img width="120" height="120" alt="Whisper Studio" src="/src/renderer/src/logo.svg" />

</p>

<h1 align="center">Whisper Studio</h1>

<p align="center">
  <strong>Whisper Studio is an independent desktop interface for OpenAI Whisper.</strong><br/>
	<span>complete with apps for macOS, Windows, Linux</span>
</p>

<img alt="image 36" src="/screenshots/first.png" />
<img  alt="Screenshot 2026-06-29 191632" src="/screenshots/second.png" />
<img width="3840" height="2280" alt="image 38" src="/screenshots/fifth.png" />
<img width="3840" height="2280" alt="image 38" src="/screenshots/forth.png" />

<br/>
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
