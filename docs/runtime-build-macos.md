# Building the macOS Runtime

This guide walks through building a Whisper Studio Runtime artifact on macOS.
The build must run **on a Mac** — the resulting archive is not cross-compilable.

macOS supports the **CPU accelerator only** (no CUDA). Two separate artifacts are
required for the full release matrix:

| Artifact ID                              | Target machine                    |
| ---------------------------------------- | --------------------------------- |
| `whisper-runtime-darwin-arm64-cpu-1.0.0` | Apple Silicon (M1 / M2 / M3 / M4) |
| `whisper-runtime-darwin-x64-cpu-1.0.0`   | Intel Mac                         |

---

## Prerequisites

Install the following once on the build machine.

### Homebrew

```zsh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### uv (portable Python manager)

```zsh
brew install uv
```

### FFmpeg

```zsh
brew install ffmpeg
```

Verify the binaries are available:

```zsh
which ffmpeg ffprobe
# /opt/homebrew/bin/ffmpeg
# /opt/homebrew/bin/ffprobe
```

### Node.js 20+

```zsh
brew install node
```

---

## Step 1 — Create a portable Python 3.12 environment

The runtime embeds its own Python so the user's system Python is never touched.
`uv` creates a self-contained virtual environment that the build script copies in full.

```zsh
uv venv --python 3.12 /tmp/whisper-py312
```

Verify the binary path the build script expects:

```zsh
/tmp/whisper-py312/bin/python3.12 --version
# Python 3.12.x
```

---

## Step 2 — Prepare the FFmpeg directory

The build script copies a directory that must contain `ffmpeg` and `ffprobe`.
Create a dedicated folder with symlinks to the Homebrew binaries:

```zsh
mkdir -p /tmp/whisper-ffmpeg
ln -sf "$(which ffmpeg)" /tmp/whisper-ffmpeg/ffmpeg
ln -sf "$(which ffprobe)" /tmp/whisper-ffmpeg/ffprobe
```

---

## Step 3 — Install project dependencies

Run this from the repository root:

```zsh
npm install
```

---

## Step 4 — Run the build script

Run on **Apple Silicon**:

```zsh
npm run runtime:build -- \
  --python-root /tmp/whisper-py312 \
  --ffmpeg-dir /tmp/whisper-ffmpeg \
  --accelerator cpu \
  --version 1.0.0 \
  --base-url https://github.com/mohammadKarimi/Whisper-Studio/releases/download/runtime-v1.0.0
```

Run on **Intel Mac** (same command — `process.arch` is detected automatically):

```zsh
npm run runtime:build -- \
  --python-root /tmp/whisper-py312 \
  --ffmpeg-dir /tmp/whisper-ffmpeg \
  --accelerator cpu \
  --version 1.0.0 \
  --base-url https://github.com/mohammadKarimi/Whisper-Studio/releases/download/runtime-v1.0.0
```

The script will:

1. Copy the portable Python and FFmpeg into a staging directory.
2. Install `torch`, `torchaudio`, `torchvision` (CPU wheels), `whisperx==3.8.6`, and dependencies.
3. Download and embed the NLTK `punkt_tab` tokenizer.
4. Validate all imports and tokenizer availability.
5. Package everything into `runtime-dist/whisper-runtime-darwin-<arch>-cpu-1.0.0.zip`.
6. Write `runtime-dist/whisper-runtime-darwin-<arch>-cpu-1.0.0.zip.artifact.json`.

> **Offline / restricted networks**
> If `nltk.downloader` is blocked, download the tokenizer manually and pass it in:
>
> ```zsh
> curl -fL \
>   https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/tokenizers/punkt_tab.zip \
>   -o /tmp/punkt_tab.zip
> mkdir -p /tmp/whisper-nltk/tokenizers
> ditto -x -k /tmp/punkt_tab.zip /tmp/whisper-nltk/tokenizers
>
> npm run runtime:build -- \
>   --python-root /tmp/whisper-py312 \
>   --ffmpeg-dir /tmp/whisper-ffmpeg \
>   --nltk-data-dir /tmp/whisper-nltk \
>   --accelerator cpu \
>   --version 1.0.0
> ```

---

## Step 5 — Generate the manifest

After collecting all `.artifact.json` files in `runtime-dist`, run:

```zsh
npm run runtime:manifest -- \
  --input runtime-dist \
  --output runtime-dist/runtime-manifest.json \
  --version 1.0.0
```

---

## Step 6 — Upload to GitHub release

Upload the ZIP archive and `runtime-manifest.json` to the GitHub release tagged
`runtime-v1.0.0`. The application fetches the manifest from the latest release
by default.

For local testing without a GitHub release, set this environment variable before
starting the app:

```zsh
export WHISPER_STUDIO_RUNTIME_MANIFEST_URL=file:///absolute/path/to/runtime-manifest.json
npm run dev
```

---

## Compute type

The macOS CPU runtime always uses `int8` compute type — `float16` is not
supported on CPU. The application passes `--compute_type int8` automatically.
You do not need to set this manually when using the app.

If you run `whisperx` directly on the command line, always include the flag:

```zsh
whisperx "audio.m4a" \
  --model large-v3-turbo \
  --language fa \
  --device cpu \
  --compute_type int8 \
  --output_format srt
```

### Apple Silicon — optional MPS acceleration

On M-series chips you can substitute `--device mps --compute_type float16` for
faster GPU-accelerated inference. The bundled runtime uses `cpu`/`int8` for
maximum compatibility across all macOS hardware.

---

## Quarantine

macOS Gatekeeper quarantines files downloaded from the internet. The application
automatically removes the quarantine attribute from the extracted runtime
directory using `xattr -r -d com.apple.quarantine`. No manual action is needed.

If you extract the ZIP manually and try to run the Python binary directly, clear
the attribute yourself:

```zsh
xattr -r -d com.apple.quarantine /path/to/extracted/runtime
```

---

## Troubleshooting

| Symptom                                      | Fix                                                                                                |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `ValueError: Requested float16 compute type` | Add `--compute_type int8` to your command.                                                         |
| `zsh: command not found: --model`            | The command is split across lines without `\`. Put it on one line or add backslash continuations.  |
| `Permission denied` running Python           | Run `chmod +x /path/to/runtime/python/bin/python3.12`. The app does this automatically on install. |
| `CUDA artifacts are not supported on macOS`  | You passed `--accelerator cuda` on a Mac. Use `--accelerator cpu`.                                 |
| Import errors during build                   | Ensure uv created the venv with Python 3.12: `uv venv --python 3.12`.                              |
