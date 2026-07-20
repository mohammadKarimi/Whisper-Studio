# Whisper Runtime artifacts

Whisper Studio does not install Python or packages globally. Each release publishes private,
versioned Runtime ZIP files selected by operating system, CPU architecture, and accelerator.

## Build one artifact

Run the build on the same operating system as the target artifact. Start with a relocatable Python
3.12 distribution and an FFmpeg directory containing `ffmpeg` and `ffprobe` (`.exe` on Windows).

```sh
npm run runtime:build -- \
  --python-root /path/to/portable-python \
  --ffmpeg-dir /path/to/ffmpeg/bin \
  --accelerator cpu \
  --version 1.0.0 \
  --base-url https://github.com/mohammadKarimi/Whisper-Studio/releases/download/runtime-v1.0.0
```

The builder downloads and embeds NLTK's `punkt_tab` tokenizer, which WhisperX uses during
alignment. If Python downloads are blocked, download and extract the NLTK data separately and pass
its root directory to the builder:

```sh
curl -fL \
  https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/tokenizers/punkt_tab.zip \
  -o /tmp/punkt_tab.zip
mkdir -p /tmp/whisper-runtime-nltk/tokenizers
ditto -x -k /tmp/punkt_tab.zip /tmp/whisper-runtime-nltk/tokenizers

npm run runtime:build -- \
  --python-root /path/to/portable-python \
  --ffmpeg-dir /path/to/ffmpeg/bin \
  --nltk-data-dir /tmp/whisper-runtime-nltk \
  --accelerator cpu \
  --version 1.0.0
```

The build fails before packaging unless the Python imports succeed and the English sentence
tokenizer can be loaded entirely from the Runtime.

Use `--accelerator cuda` on Windows or Linux to build the CUDA 12.8/PyTorch artifact. Build CPU and
CUDA independently because their PyTorch wheels and native libraries differ.
CUDA artifacts record NVIDIA's CUDA 12.8 GA minimum driver by default (`570.65` on Windows and
`570.26` on Linux). Override it with `--minimum-nvidia-driver` only when the packaged stack has been
tested against a different compatibility floor.

## Create the manifest

Collect every generated `.artifact.json` file into `runtime-dist`, then run:

```sh
npm run runtime:manifest -- --input runtime-dist --output runtime-dist/runtime-manifest.json --version 1.0.0
```

Upload the ZIP files and `runtime-manifest.json` to the same GitHub release. The application reads
the latest release manifest by default. For local testing, set:

```text
WHISPER_STUDIO_RUNTIME_MANIFEST_URL=https://example.test/runtime-manifest.json
```

Required artifact matrix:

- `win32-x64-cpu`
- `win32-x64-cuda`
- `darwin-arm64-cpu`
- `darwin-x64-cpu`
- `linux-x64-cpu`
- `linux-x64-cuda`

Models are intentionally excluded from Runtime archives and remain managed by the Models page.
