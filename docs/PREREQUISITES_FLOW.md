# Prerequisites Flow

Whisper Studio checks and installs five prerequisites before transcription is available.
This document describes the full check and install pipeline across all supported platforms.

---

## 1 · Check Pipeline

Every time the Models page is opened (or refreshed), the app runs all checks in parallel after resolving Python.

```mermaid
flowchart TD
    A([App starts / Refresh]) --> B[checkPrerequisites]

    B --> C[checkPython]

    C --> D{System Python found?\npython3.12 / py -3.12 / python / python3}
    D -- No --> E[python ❌ missing\nAll package checks return missing]
    D -- Yes --> F{Version ≥ 3.8\nand < 3.13?}
    F -- No --> G[python ⚠ attention\nunsupported version message]
    F -- Yes --> H{Venv exists?\n%APPDATA%/Whisper Studio/\nwhisper-studio-venv}
    H -- No --> I[Create venv\npython -m venv whisper-studio-venv\ntimeout 60 s]
    I --> J[Re-resolve → venv Python]
    H -- Yes --> J
    J --> K[python ✅ ok]

    K --> L & M & N
    E --> O([Merge results\nin display order])
    G --> O

    L[checkCommandVersion\nffmpeg -version] --> O
    M[checkPythonPackages\nimportlib.metadata\nwhisperx + torch ≥ 2.0] --> O
    N[checkCudaWithTorch\ntorch.cuda.is_available\ntorch.version.cuda] --> P{macOS?}
    P -- Yes --> Q[cuda 🚫 unsupported\nhidden from UI]
    P -- No --> R{torch GPU available?}
    R -- Yes --> S[cuda ✅ ok\nreturns CUDA version]
    R -- No --> T[detectCudaToolkit\nnvidia-smi / nvcc]
    T --> U{Toolkit found?}
    U -- Yes --> V[cuda ⚠ attention\nCUDA detected but PyTorch is CPU-only]
    U -- No --> W[cuda ❌ missing]

    Q --> O
    S --> O
    V --> O
    W --> O

    O --> X([Render prerequisite cards\nHide: unsupported\nHide: torch when cuda = ok/attention/installing])
```

---

## 2 · Install Pipeline — per prerequisite

### 2a · Python

```mermaid
flowchart TD
    A([Install Python]) --> B{Platform?}

    B -- Windows --> C{winget available?}
    C -- Yes --> D["winget install Python.Python.3.12\n--accept-source-agreements"]
    D --> E{Exit 0?}
    E -- Yes --> F[Refresh Windows PATH\nfrom registry via PowerShell]
    F --> G([✅ Done — trigger re-check])
    E -- No --> H([❌ Failed])
    C -- No --> I[Open browser\npython.org/downloads/windows]

    B -- macOS --> J{brew available?}
    J -- Yes --> K[brew install python@3.12]
    K --> G
    J -- No --> L[Open browser\npython.org/downloads/macos]

    B -- Linux --> M{apt-get available?}
    M -- Yes --> N["sudo apt-get install -y\npython3.12 python3.12-venv python3-pip"]
    N --> G
    M -- No --> O{dnf available?}
    O -- Yes --> P["sudo dnf install -y\npython3.12 python3.12-pip"]
    P --> G
    O -- No --> Q[Open browser\npython.org/downloads/source]
```

### 2b · FFmpeg

```mermaid
flowchart TD
    A([Install FFmpeg]) --> B{Platform?}

    B -- Windows --> C{winget available?}
    C -- Yes --> D["winget install Gyan.FFmpeg\n--accept-source-agreements"]
    D --> E{Exit 0?}
    E -- Yes --> F[Refresh Windows PATH]
    F --> G([✅ Done])
    E -- No --> H([❌ Failed])
    C -- No --> I[Open browser\ngyan.dev/ffmpeg/builds]

    B -- macOS --> J{brew available?}
    J -- Yes --> K[brew install ffmpeg]
    K --> G
    J -- No --> L[Open browser\nffmpeg.org/download — macOS]

    B -- Linux --> M{apt-get available?}
    M -- Yes --> N[sudo apt-get install -y ffmpeg]
    N --> G
    M -- No --> O{dnf available?}
    O -- Yes --> P[sudo dnf install -y ffmpeg]
    P --> G
    O -- No --> Q[Open browser\nffmpeg.org/download — Linux]
```

### 2c · CUDA + PyTorch (GPU)

> This installer handles **torch, torchvision, and torchaudio** together.
> The standalone PyTorch card is hidden from the UI when CUDA is detected.

```mermaid
flowchart TD
    A([Install CUDA / GPU PyTorch]) --> B{macOS?}
    B -- Yes --> Z([❌ Not supported on macOS])

    B -- No --> C[Resolve Python\nvenv Python preferred]
    C --> D{Python found?}
    D -- No --> E[Open browser\ndeveloper.nvidia.com/cuda-downloads]

    D -- Yes --> F["Upgrade pip\npip install --upgrade pip\ntimeout 60 s"]
    F --> G["Clean broken distributions\nRemove ~ -prefixed dirs\nfrom site-packages\ntimeout 15 s"]
    G --> H["pip install torch torchvision torchaudio\n--index-url https://download.pytorch.org/whl/cu124\n--upgrade --retries 5 --timeout 120\n⏱ timeout 2 hours\n(~2.5 GB download, cache-enabled for resume)"]
    H --> I{Exit 0?}
    I -- No --> J([❌ Failed — normalized error shown])
    I -- Yes --> K["Verify GPU\ntorch.cuda.is_available()\ntimeout 90 s"]
    K --> L{cuda status = ok?}
    L -- Yes --> M([✅ Done])
    L -- No --> N([⚠ Packages installed\nbut GPU still unavailable\ncheck NVIDIA drivers])
```

### 2d · whisperx

```mermaid
flowchart TD
    A([Install whisperx]) --> B[Resolve Python\nvenv Python preferred]
    B --> C{Python found\nand version ok?}
    C -- No --> D([❌ Install Python first])
    C -- Yes --> E["pip install whisperx\n--upgrade --retries 5 --timeout 120\n--no-cache-dir\n⏱ timeout 30 min"]
    E --> F{Exit 0?}
    F -- Yes --> G([✅ Done])
    F -- No --> H([❌ Failed — error shown])
```

### 2e · PyTorch CPU (shown only when CUDA is unsupported / missing)

```mermaid
flowchart TD
    A([Install PyTorch CPU]) --> B[Resolve Python\nvenv Python preferred]
    B --> C{Python found\nand version ok?}
    C -- No --> D([❌ Install Python first])
    C -- Yes --> E["pip install torch\n--upgrade --retries 5 --timeout 120\n--no-cache-dir\n⏱ timeout 30 min"]
    E --> F{Exit 0?}
    F -- Yes --> G([✅ Done])
    F -- No --> H([❌ Failed — error shown])
```

---

## 3 · Fix All Order

When the user clicks **Fix All**, prerequisites are installed sequentially in dependency order:

```mermaid
flowchart LR
    A[python] --> B[ffmpeg] --> C{CUDA will\nbe installed?}
    C -- Yes --> D[skip torch\nCUDA installer handles it]
    C -- No --> E[torch]
    D --> F[whisperx]
    E --> F
    F --> G[cuda]
```

> **CUDA will be installed** when `cuda.status` is `missing` or `attention` (hardware detected).

---

## 4 · Venv Isolation

All package installs and the `whisper` CLI run inside an app-managed venv, isolated from the user's system Python.

```mermaid
flowchart TD
    A([checkPython]) --> B{Venv Python\nresponds to --version?}
    B -- Yes --> C[Return venv Python\nAll checks use it]
    B -- No --> D[Find system Python\npython3.12 / py -3.12 / python …]
    D --> E{Found?}
    E -- No --> F([python ❌ missing])
    E -- Yes --> G["Create venv\nsystemPython -m venv whisper-studio-venv\ntimeout 60 s"]
    G --> H[Return venv Python]
    H --> C

    C --> I["pip installs go into venv\n(installViaPip + installCuda\nboth call findPython → venv)"]
    C --> J["Transcription: spawn whisper …\nenv PATH = venv/Scripts:… (win32)\n       or venv/bin:…  (unix)"]
```

| Platform | Venv location                                                      |
| -------- | ------------------------------------------------------------------ |
| Windows  | `%APPDATA%\Whisper Studio\whisper-studio-venv`                     |
| macOS    | `~/Library/Application Support/Whisper Studio/whisper-studio-venv` |
| Linux    | `~/.config/Whisper Studio/whisper-studio-venv`                     |
