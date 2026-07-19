# Model Management

This document covers where Whisper models are stored and how the download pipeline works.

## Storage Location

Models are stored inside the app's `userData` directory, isolated from the user's global HuggingFace cache.

| OS | Path |
|---|---|
| **Windows** | `%APPDATA%\Whisper Studio\models\` |
| **macOS** | `~/Library/Application Support/Whisper Studio/models/` |
| **Linux** | `~/.config/Whisper Studio/models/` |

> Override by setting the `HF_HUB_CACHE` environment variable before launching the app.

### Directory Structure

Each model is a HuggingFace hub snapshot directory created by `faster-whisper`:

```
{userData}/models/
  models--Systran--faster-whisper-base/
    blobs/          ← actual model weights and config files
    refs/           ← branch pointer (e.g. "main")
    snapshots/
      {commit-hash}/
        config.json     → symlink to ../../blobs/{hash}
        model.bin       → symlink to ../../blobs/{hash}
        tokenizer/
        vocabulary.txt  → symlink to ../../blobs/{hash}
```

`blobs/` holds the real data. `snapshots/` contains only symlinks into `blobs/`, so size is calculated from `blobs/` alone to avoid double-counting.

## Download Pipeline

The download is triggered from the Models page and runs through a sequential pipeline in `src/main/ipc/system/model-handlers.ts`.

```
Renderer calls desktop.downloadModel(modelId)
  │
  ▼  IPC: model:download
Main: downloadModel(modelId, emitProgress)
  │
  ├─ 1. validateModelId()
  │       Rejects any ID not in WHISPER_DOWNLOADABLE_IDS.
  │
  ├─ 2. resolvePython()
  │       Calls findPython() → getActiveRuntime() → runtime Python binary.
  │       Returns null (→ error) if no runtime is installed.
  │
  ├─ 3. resolvePaths()
  │       cacheDir  = {userData}/models
  │       modelDir  = {cacheDir}/models--Systran--faster-whisper-{modelId}
  │
  ├─ 4. createProgressController()
  │       Starts a 750 ms interval that stats {modelDir}/blobs/ and emits
  │       WhisperModelDownloadProgress over IPC_CHANNELS.modelDownloadProgress.
  │
  ├─ 5. executeDownload()
  │       Runs the Python download script (see below) via execFile.
  │       On TLS failure, installs truststore/certifi and retries once.
  │
  └─ 6. buildResult()
          Maps the raw exit code / stderr into WhisperModelActionResult.
```

### Python Download Script

The script is assembled in `buildDownloadScript()` and run as `python -c "..."`:

```python
import json, logging
logging.disable(logging.CRITICAL)       # silence speechbrain / whisperx noise
try:
    import truststore
    truststore.inject_into_ssl()        # system cert store (managed networks)
except Exception:
    try:
        import os, certifi
        os.environ.setdefault("SSL_CERT_FILE", certifi.where())
    except Exception:
        pass
from faster_whisper import WhisperModel
WhisperModel(
    "<modelId>",
    device='cpu',
    compute_type='int8',
    download_root="<cacheDir>"          # pins download to app userData
)
print(json.dumps({"ok": True}))
```

`WhisperModel` fetches the model from `Systran/faster-whisper-<modelId>` on HuggingFace and stores it under `download_root`. The model is not loaded into memory beyond initialisation.

### TLS Self-Healing

On corporate or managed networks, SSL certificate verification sometimes fails. The pipeline detects this pattern in stderr:

```
CERTIFICATE_VERIFY_FAILED | SSLCertVerificationError |
self-signed certificate | unable to get local issuer
```

When detected it installs `truststore` (system cert store bridge) and `certifi` via `pip`, then retries the download once.

### Progress Reporting

While the download runs, a 750 ms interval reads the size of `{modelDir}/blobs/` and pushes a `WhisperModelDownloadProgress` event over IPC:

```ts
{
  repoId: string          // model ID (e.g. "large-v2")
  downloadedBytes: number // running total from blobs/
  state: 'active' | 'complete' | 'error'
}
```

The renderer's `useModelDownloadProgress` hook subscribes to this channel and drives the progress bar in the Models UI.

## Scanning Downloaded Models

`scanDownloadedModels()` lists the `{userData}/models` directory and collects every entry whose name matches `models--Systran--faster-whisper-{name}` where `name` is a key in `WHISPER_KNOWN_MODELS`. Size is computed by summing files in the `blobs/` subdirectory.

## Deletion

`deleteModel(id)` removes `{userData}/models/models--Systran--faster-whisper-{id}` recursively with `rm({ recursive: true, force: true })`.

## Runtime Dependency

Model downloading requires the Whisper Runtime to be installed. `resolvePython()` uses `getActiveRuntime()` to locate the runtime Python binary (`python/bin/python` on macOS/Linux, `python\python.exe` on Windows). If no runtime is active, the download is rejected immediately with:

> "Whisper Runtime is not ready. Install or repair the Runtime before downloading models."

## Transcription Integration

When `whisperx` is invoked for transcription (`src/main/ipc/asr/engines/whisperx.ts`), the Python environment includes:

```
HF_HUB_CACHE = {userData}/models
```

This tells `huggingface_hub` (used internally by `faster-whisper`) to look for models in the same location where they were downloaded, rather than the default `~/.cache/huggingface/hub`.
