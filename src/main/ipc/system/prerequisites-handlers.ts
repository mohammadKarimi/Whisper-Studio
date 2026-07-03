import { ipcMain, shell } from 'electron'
import { execFile, spawn } from 'node:child_process'
import type {
  PrerequisiteCheck,
  PrerequisiteCheckId,
  PrerequisiteInstallProgress,
  PrerequisiteInstallResult
} from '../../../shared/ipc'
import { IPC_CHANNELS } from '../../../shared/ipc'
import { MODEL_FETCHING_CACHE_DURATION_MS, PYTHON_TARGET_VERSION } from '../../../shared/constants'
import { createScopedCache } from '../../cache'
import {
  CommandCandidate,
  CommandResult,
  findPython,
  runCommand,
  runCommandCandidate
} from '../command'
import { compareVersions, parseVersion, stripAnsi } from '../utils'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

type DetailedCommandResult = {
  exitCode: number | null
  stderr: string
  stdout: string
}

// ---------------------------------------------------------------------------
// Constants / config
// ---------------------------------------------------------------------------

export const prerequisiteIds: readonly PrerequisiteCheckId[] = [
  'python',
  'ffmpeg',
  'cuda',
  'openai-whisper',
  'torch'
]

const pipInstallPackages: Partial<Record<PrerequisiteCheckId, string>> = {
  'openai-whisper': 'openai-whisper',
  torch: 'torch'
}

const PYTHON_PACKAGE_MAX_EXCLUSIVE = [3, 13] as const

const unsupportedPythonMessage = `Python 3.13 was detected, but Whisper dependencies are not reliable with it yet. Install Python ${PYTHON_TARGET_VERSION}, then retry.`

const installerUrls: Partial<Record<PrerequisiteCheckId, string>> = {
  python: 'https://www.python.org/downloads/',
  ffmpeg: 'https://www.gyan.dev/ffmpeg/builds/',
  cuda: 'https://developer.nvidia.com/cuda-downloads'
}

// Platform-specific fallback download pages used when no package manager is available.
const fallbackInstallerUrls: Record<
  'darwin' | 'linux' | 'win32',
  Partial<Record<PrerequisiteCheckId, string>>
> = {
  win32: {
    python: 'https://www.python.org/downloads/windows/',
    ffmpeg: 'https://www.gyan.dev/ffmpeg/builds/'
  },
  darwin: {
    python: 'https://www.python.org/downloads/macos/',
    ffmpeg: 'https://ffmpeg.org/download.html#build-mac'
  },
  linux: {
    python: 'https://www.python.org/downloads/source/',
    ffmpeg: 'https://ffmpeg.org/download.html#build-linux'
  }
}

// A single package-manager install attempt: probe the manager, then run the install command.
type SystemInstallCandidate = {
  probe: string
  command: string
  args: readonly string[]
  label: string
}

// Per-platform install commands for system-level prerequisites. Ordered by preference;
// the first candidate whose `probe` binary exists is used.
const systemInstallers: Record<
  'darwin' | 'linux' | 'win32',
  Partial<Record<PrerequisiteCheckId, readonly SystemInstallCandidate[]>>
> = {
  win32: {
    python: [
      {
        probe: 'winget',
        command: 'winget',
        args: [
          'install',
          '-e',
          '--id',
          `Python.Python.${PYTHON_TARGET_VERSION}`,
          '--accept-source-agreements',
          '--accept-package-agreements'
        ],
        label: 'winget'
      }
    ],
    ffmpeg: [
      {
        probe: 'winget',
        command: 'winget',
        args: [
          'install',
          '-e',
          '--id',
          'Gyan.FFmpeg',
          '--accept-source-agreements',
          '--accept-package-agreements'
        ],
        label: 'winget'
      }
    ]
  },
  darwin: {
    python: [
      {
        probe: 'brew',
        command: 'brew',
        args: ['install', `python@${PYTHON_TARGET_VERSION}`],
        label: 'Homebrew'
      }
    ],
    ffmpeg: [{ probe: 'brew', command: 'brew', args: ['install', 'ffmpeg'], label: 'Homebrew' }]
  },
  linux: {
    python: [
      {
        probe: 'apt-get',
        command: 'sudo',
        args: [
          'apt-get',
          'install',
          '-y',
          `python${PYTHON_TARGET_VERSION}`,
          `python${PYTHON_TARGET_VERSION}-venv`,
          'python3-pip'
        ],
        label: 'apt-get'
      },
      {
        probe: 'dnf',
        command: 'sudo',
        args: [
          'dnf',
          'install',
          '-y',
          `python${PYTHON_TARGET_VERSION}`,
          `python${PYTHON_TARGET_VERSION}-pip`
        ],
        label: 'dnf'
      }
    ],
    ffmpeg: [
      {
        probe: 'apt-get',
        command: 'sudo',
        args: ['apt-get', 'install', '-y', 'ffmpeg'],
        label: 'apt-get'
      },
      { probe: 'dnf', command: 'sudo', args: ['dnf', 'install', '-y', 'ffmpeg'], label: 'dnf' }
    ]
  }
}

function getInstallPlatform(): 'darwin' | 'linux' | 'win32' | null {
  if (
    process.platform === 'win32' ||
    process.platform === 'darwin' ||
    process.platform === 'linux'
  ) {
    return process.platform
  }

  return null
}

// Pure resolver (no side effects) so platform install selection is unit-testable.
export function resolveSystemInstallCandidates(
  platform: NodeJS.Platform,
  id: PrerequisiteCheckId
): readonly SystemInstallCandidate[] {
  if (platform === 'win32' || platform === 'darwin' || platform === 'linux') {
    return systemInstallers[platform][id] ?? []
  }

  return []
}

export function resolveFallbackInstallerUrl(
  platform: NodeJS.Platform,
  id: PrerequisiteCheckId
): string | null {
  const platformUrl =
    platform === 'win32' || platform === 'darwin' || platform === 'linux'
      ? fallbackInstallerUrls[platform]?.[id]
      : undefined

  return platformUrl ?? installerUrls[id] ?? null
}

const CUDA_TORCH_INDEX_URL = 'https://download.pytorch.org/whl/cu124'

// torch CUDA is ~2.5 GB; allow up to 2 hours so slow connections can complete.
// The pip --timeout flag only covers per-connection idle time (60 s), not total
// download duration — the process-level timeout here is the actual guard.
const CUDA_INSTALL_TIMEOUT_MS = 2 * 60 * 60 * 1000

// Smaller pip packages (openai-whisper, CPU torch) rarely exceed a few hundred MB;
// 30 minutes is a comfortable upper bound even on a slow connection.
const PIP_INSTALL_TIMEOUT_MS = 30 * 60 * 1000

// ---------------------------------------------------------------------------
// Module-level cache
// ---------------------------------------------------------------------------

const prerequisitesCache = createScopedCache(checkPrerequisites, MODEL_FETCHING_CACHE_DURATION_MS)

function clearPrerequisiteCache(): void {
  prerequisitesCache.invalidate()
}

// ---------------------------------------------------------------------------
// IPC registration
// ---------------------------------------------------------------------------

export function registerPrerequisiteHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.prerequisites, async (): Promise<PrerequisiteCheck[]> => {
    return getCachedPrerequisites()
  })

  ipcMain.handle(
    IPC_CHANNELS.prerequisiteInstall,
    async (event, id: PrerequisiteCheckId): Promise<PrerequisiteInstallResult> => {
      if (!prerequisiteIds.includes(id)) {
        return { action: 'opened', id, ok: false, stderr: 'Unknown prerequisite.' }
      }

      const onLine = (line: string): void => {
        const parsed = parsePipProgressLine(line)
        const progress: PrerequisiteInstallProgress = { id, line, ...parsed }
        event.sender.send(IPC_CHANNELS.prerequisiteInstallProgress, progress)
      }

      return installPrerequisite(id, onLine)
    }
  )
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getCachedPrerequisites(): Promise<PrerequisiteCheck[]> {
  return prerequisitesCache.get()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runDetailedCommand(
  command: string,
  args: readonly string[],
  timeoutMs = 10 * 60 * 1000
): Promise<DetailedCommandResult> {
  return new Promise((resolve) => {
    execFile(
      command,
      [...args],
      { timeout: timeoutMs, windowsHide: true },
      (error, stdout, stderr) => {
        const exitCode =
          typeof error === 'object' && error && 'code' in error && typeof error.code === 'number'
            ? error.code
            : error
              ? 1
              : 0

        resolve({
          exitCode,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        })
      }
    )
  })
}

// Streaming variant of runDetailedCommand: calls onLine for every non-empty
// output line so the renderer can show live pip progress.
function runStreamingCommand(
  command: string,
  args: readonly string[],
  onLine: (line: string) => void,
  timeoutMs = 10 * 60 * 1000
): Promise<DetailedCommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, [...args], {
      timeout: timeoutMs,
      windowsHide: true,
      shell: false
    })

    const stdoutChunks: string[] = []
    const stderrChunks: string[] = []
    let stdoutBuf = ''
    let stderrBuf = ''

    const flushLines = (buf: string, store: string[]): string => {
      const parts = buf.split(/[\r\n]/)
      for (let i = 0; i < parts.length - 1; i++) {
        const line = stripAnsi(parts[i]).trim()
        if (line) {
          store.push(line)
          onLine(line)
        }
      }
      return parts[parts.length - 1] ?? ''
    }

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBuf += chunk.toString('utf8')
      stdoutBuf = flushLines(stdoutBuf, stdoutChunks)
    })

    child.stderr.on('data', (chunk: Buffer) => {
      stderrBuf += chunk.toString('utf8')
      stderrBuf = flushLines(stderrBuf, stderrChunks)
    })

    child.on('close', (code) => {
      // Flush any remaining partial line.
      const remainingOut = stripAnsi(stdoutBuf).trim()
      if (remainingOut) {
        stdoutChunks.push(remainingOut)
        onLine(remainingOut)
      }
      const remainingErr = stripAnsi(stderrBuf).trim()
      if (remainingErr) {
        stderrChunks.push(remainingErr)
        onLine(remainingErr)
      }

      resolve({
        exitCode: code,
        stdout: stdoutChunks.join('\n'),
        stderr: stderrChunks.join('\n')
      })
    })

    child.on('error', (err) => {
      resolve({
        exitCode: 1,
        stdout: stdoutChunks.join('\n'),
        stderr: err.message
      })
    })
  })
}

function checkVersion(
  id: PrerequisiteCheckId,
  installed: string | null,
  minimum?: readonly number[]
): PrerequisiteCheck {
  return {
    id,
    installed,
    status: installed && (!minimum || compareVersions(installed, minimum) >= 0) ? 'ok' : 'missing'
  }
}

function isUnsupportedPythonForPackages(version: string | null): boolean {
  return Boolean(version && compareVersions(version, PYTHON_PACKAGE_MAX_EXCLUSIVE) >= 0)
}

function normalizePipInstallError(stderr: string): string {
  if (/DECRYPTION_FAILED_OR_BAD_RECORD_MAC|SSLError|ssl/i.test(stderr)) {
    return [
      'pip failed while downloading packages over SSL.',
      'Check your network/VPN/proxy and retry; the installer now retries and bypasses pip cache.'
    ].join(' ')
  }

  // Keep only lines that carry real error information; strip all informational
  // pip progress/status output so the user sees a concise error message.
  const informationalPrefixes =
    /^\s*(WARNING:|Collecting |Downloading |Requirement already satisfied:|Looking in indexes:|Defaulting to user installation|Installing collected packages:|Successfully installed|Preparing metadata|Building wheel|Using cached |Obtaining |Note:|DEPRECATION:)/i
  const progressBar = /^\s*[-\s]*$/
  const downloadProgress = /[\d.]+\s*\/\s*[\d.]+ ?(TB|GB|MB|kB|B)/i

  const meaningful = stderr
    .split(/\r?\n/)
    .filter(
      (line) =>
        line.trim() &&
        !informationalPrefixes.test(line) &&
        !progressBar.test(line) &&
        !downloadProgress.test(line)
    )
    .join('\n')
    .trim()

  // If nothing meaningful remains the caller will surface a generic failure message.
  return meaningful
}

// ---------------------------------------------------------------------------
// Check pipeline
// ---------------------------------------------------------------------------

async function checkPython(): Promise<{ check: PrerequisiteCheck; python: CommandResult | null }> {
  const python = await findPython()
  const installed = python ? parseVersion(python.output) : null

  if (isUnsupportedPythonForPackages(installed)) {
    return {
      check: {
        id: 'python',
        installed,
        status: 'attention',
        detail: unsupportedPythonMessage
      },
      python
    }
  }

  return { check: checkVersion('python', installed, [3, 8]), python }
}

async function checkCommandVersion(
  id: PrerequisiteCheckId,
  candidates: readonly CommandCandidate[],
  minimum?: readonly number[]
): Promise<PrerequisiteCheck> {
  const result = await runCommandCandidate(candidates)
  const installed = result ? parseVersion(result.output) : null

  return checkVersion(id, installed, minimum)
}

async function checkPythonPackages(python: CommandResult | null): Promise<PrerequisiteCheck[]> {
  const packages: readonly {
    id: PrerequisiteCheckId
    minimum?: readonly number[]
    packageName: string
  }[] = [
    { id: 'openai-whisper', packageName: 'openai-whisper' },
    { id: 'torch', packageName: 'torch', minimum: [2, 0] }
  ]

  if (!python) {
    return packages.map((entry) => checkVersion(entry.id, null, entry.minimum))
  }

  const packageNames = JSON.stringify(packages.map((entry) => entry.packageName))
  const code = [
    'import importlib.metadata as m',
    `packages = ${packageNames}`,
    'for package in packages:',
    '    try:',
    '        print(f"{package}={m.version(package)}")',
    '    except m.PackageNotFoundError:',
    '        print(f"{package}=")'
  ].join('\n')
  const output = await runCommand(python.command, [...python.prefixArgs, '-c', code], 3000)
  const versions = new Map(
    (output ?? '')
      .split(/\r?\n/)
      .map((line) => line.split('='))
      .filter(([packageName]) => packageName)
      .map(([packageName, version]) => [packageName, parseVersion(version ?? '')])
  )

  return packages.map((entry) =>
    checkVersion(entry.id, versions.get(entry.packageName) ?? null, entry.minimum)
  )
}

type CudaToolkitInfo = {
  source: 'nvidia-smi' | 'nvcc'
  version: string | null
}

// Detects an installed NVIDIA driver / CUDA toolkit independently of PyTorch.
// `nvidia-smi` reports the driver's max supported CUDA version; `nvcc` reports
// the installed CUDA Toolkit compiler version.
async function detectCudaToolkit(): Promise<CudaToolkitInfo | null> {
  if (process.platform === 'darwin') {
    return null
  }

  const smi = await runCommand('nvidia-smi', [], 4000)

  if (smi) {
    return { source: 'nvidia-smi', version: smi.match(/CUDA Version:\s*([\d.]+)/i)?.[1] ?? null }
  }

  const nvcc = await runCommand('nvcc', ['--version'], 4000)

  if (nvcc) {
    return { source: 'nvcc', version: nvcc.match(/release\s*([\d.]+)/i)?.[1] ?? null }
  }

  return null
}

// Builds a CUDA check result when PyTorch cannot use the GPU. If a toolkit/driver
// is present, surface an actionable hint instead of a flat "missing".
function cudaResultFromToolkit(toolkit: CudaToolkitInfo | null): PrerequisiteCheck {
  if (!toolkit) {
    return { id: 'cuda', installed: null, status: 'missing' }
  }

  return {
    id: 'cuda',
    installed: toolkit.version ?? 'detected',
    status: 'attention',
    detail:
      'CUDA detected, but PyTorch is CPU-only. Reinstall the CUDA build of PyTorch to enable GPU acceleration.'
  }
}

const TORCH_PROBE_TIMEOUT_MS = 30_000
const TORCH_PROBE_TIMEOUT_AFTER_INSTALL_MS = 90_000

async function checkCudaWithTorch(
  python: CommandResult | null,
  torchProbeTimeoutMs = TORCH_PROBE_TIMEOUT_MS
): Promise<PrerequisiteCheck> {
  const toolkit = await detectCudaToolkit()

  if (!python) {
    return cudaResultFromToolkit(toolkit)
  }

  const code = [
    'import json',
    'result = {"available": False, "cuda": None}',
    'try:',
    '    import torch',
    '    result["available"] = bool(torch.cuda.is_available())',
    '    result["cuda"] = getattr(torch.version, "cuda", None)',
    'except Exception:',
    '    pass',
    'print(json.dumps(result))'
  ].join('\n')

  const output = await runCommand(
    python.command,
    [...python.prefixArgs, '-c', code],
    torchProbeTimeoutMs
  )
  const jsonLine =
    output
      ?.split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.startsWith('{') && line.endsWith('}')) ?? null

  if (!jsonLine) {
    return cudaResultFromToolkit(toolkit)
  }

  try {
    const parsed = JSON.parse(jsonLine) as { available?: boolean; cuda?: string | null }

    if (!parsed.available) {
      return cudaResultFromToolkit(toolkit)
    }

    return {
      id: 'cuda',
      installed: parsed.cuda ?? toolkit?.version ?? 'detected',
      status: 'ok'
    }
  } catch {
    return cudaResultFromToolkit(toolkit)
  }
}

// Parses a pip progress line such as:
//   "874.5/2.6 GB 1.2 MB/s eta 0:25:42"
// and returns byte values the UI can use to render a determinate progress bar.
function parsePipProgressLine(
  line: string
): Pick<
  PrerequisiteInstallProgress,
  'downloadedBytes' | 'totalBytes' | 'speedBytesPerSec' | 'etaSeconds'
> | null {
  const match = line.match(
    /([\d.]+)\s*\/\s*([\d.]+)\s*(TB|GB|MB|kB|B)\s+([\d.]+)\s*(TB|GB|MB|kB|B)\/s\s+eta\s+([\d:]+)/i
  )
  if (!match) return null

  const toBytes = (value: number, unit: string): number => {
    switch (unit.toLowerCase()) {
      case 'tb':
        return value * 1024 ** 4
      case 'gb':
        return value * 1024 ** 3
      case 'mb':
        return value * 1024 ** 2
      case 'kb':
        return value * 1024
      default:
        return value
    }
  }

  const etaParts = (match[6] ?? '0').split(':').map(Number)
  const etaSeconds =
    etaParts.length === 3
      ? (etaParts[0] ?? 0) * 3600 + (etaParts[1] ?? 0) * 60 + (etaParts[2] ?? 0)
      : etaParts.length === 2
        ? (etaParts[0] ?? 0) * 60 + (etaParts[1] ?? 0)
        : (etaParts[0] ?? 0)

  return {
    downloadedBytes: toBytes(parseFloat(match[1] ?? '0'), match[3] ?? 'B'),
    totalBytes: toBytes(parseFloat(match[2] ?? '0'), match[3] ?? 'B'),
    speedBytesPerSec: toBytes(parseFloat(match[4] ?? '0'), match[5] ?? 'B'),
    etaSeconds
  }
}

// Runs all prerequisite checks in parallel and merges results in display order.
async function checkPrerequisites(): Promise<PrerequisiteCheck[]> {
  const { check: pythonCheck, python } = await checkPython()
  const [ffmpegCheck, pythonPackageChecks, cudaByTorchCheck] = await Promise.all([
    checkCommandVersion('ffmpeg', [{ command: 'ffmpeg', args: ['-version'], timeoutMs: 1500 }]),
    checkPythonPackages(python),
    checkCudaWithTorch(python)
  ])

  // For Whisper GPU execution, runtime CUDA availability in torch is the source of truth.
  // CUDA is not available on macOS (no NVIDIA GPUs on Apple Silicon / modern Macs).
  const cudaCheck: PrerequisiteCheck =
    process.platform === 'darwin'
      ? { id: 'cuda', installed: null, status: 'unsupported' }
      : cudaByTorchCheck
  const checks = [pythonCheck, ffmpegCheck, cudaCheck, ...pythonPackageChecks]

  return prerequisiteIds.map(
    (id) => checks.find((check) => check.id === id) ?? { id, installed: null, status: 'missing' }
  )
}

// ---------------------------------------------------------------------------
// Install pipeline
// Install strategies — one function per prerequisite type.
// To add a new prerequisite: add its id to `prerequisiteIds`, add a check to
// `checkPrerequisites`, and add one entry to `INSTALLERS` below.
// ---------------------------------------------------------------------------

async function installViaPip(
  id: PrerequisiteCheckId,
  pipPackage: string,
  onLine?: (line: string) => void
): Promise<PrerequisiteInstallResult> {
  const python = await findPython()

  if (!python) {
    return {
      action: 'installed',
      id,
      ok: false,
      stderr: 'Python was not found. Install Python first.'
    }
  }

  const pythonVersion = parseVersion(python.output)

  if (isUnsupportedPythonForPackages(pythonVersion)) {
    return {
      action: 'installed',
      id,
      ok: false,
      stderr: unsupportedPythonMessage
    }
  }

  const args = [
    ...python.prefixArgs,
    '-m',
    'pip',
    'install',
    '--upgrade',
    '--retries',
    '5',
    '--timeout',
    '120',
    '--disable-pip-version-check',
    '--no-cache-dir',
    pipPackage
  ]
  const result = onLine
    ? await runStreamingCommand(python.command, args, onLine, PIP_INSTALL_TIMEOUT_MS)
    : await runDetailedCommand(python.command, args, PIP_INSTALL_TIMEOUT_MS)
  clearPrerequisiteCache()

  return {
    action: 'installed',
    command: `${python.command} ${args.join(' ')}`,
    id,
    ok: result.exitCode === 0,
    stderr: normalizePipInstallError(result.stderr),
    stdout: result.stdout
  }
}

async function installViaUrl(
  id: PrerequisiteCheckId,
  url: string
): Promise<PrerequisiteInstallResult> {
  await shell.openExternal(url)
  return { action: 'opened', id, ok: true }
}

function getFallbackInstallerUrl(id: PrerequisiteCheckId): string | null {
  const platform = getInstallPlatform()

  return resolveFallbackInstallerUrl(platform ?? process.platform, id)
}

// After a system-level install on Windows, winget/the Python installer writes the
// new binary paths into the HKCU\Environment registry key but the running Electron
// process still has the old PATH snapshot from startup. Re-reading PATH from the
// registry and updating process.env.PATH lets subsequent findPython() calls see
// the freshly installed binary without needing an app restart.
async function refreshWindowsPath(): Promise<void> {
  if (process.platform !== 'win32') return

  try {
    const output = await runCommand(
      'powershell',
      [
        '-NonInteractive',
        '-NoProfile',
        '-Command',
        '([Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [Environment]::GetEnvironmentVariable("PATH","User")).TrimEnd(";")'
      ],
      4000
    )
    if (output) {
      process.env.PATH = output.trim()
    }
  } catch {
    // Non-critical: if this fails PATH stays as-is and the user may need to restart.
  }
}

// Installs a system-level prerequisite using the platform's package manager.
// Falls back to opening a download page when no supported manager is available.
async function installSystemPrerequisite(
  id: PrerequisiteCheckId,
  onLine?: (line: string) => void
): Promise<PrerequisiteInstallResult> {
  // Step 1 – resolve platform install candidates and the fallback URL
  const platform = getInstallPlatform()
  const candidates = platform ? resolveSystemInstallCandidates(platform, id) : []
  const fallbackUrl = getFallbackInstallerUrl(id)

  // Step 2 – probe each package manager; use the first one that responds
  for (const candidate of candidates) {
    const probed = await runCommand(candidate.probe, ['--version'], 4000)

    if (!probed) {
      continue
    }

    // Step 3 – run the install command and build the result
    const result = onLine
      ? await runStreamingCommand(candidate.command, [...candidate.args], onLine)
      : await runDetailedCommand(candidate.command, candidate.args)
    const command = `${candidate.command} ${candidate.args.join(' ')}`
    clearPrerequisiteCache()

    if (result.exitCode === 0) {
      await refreshWindowsPath()
    }

    return {
      action: 'installed',
      command,
      id,
      ok: result.exitCode === 0,
      stderr:
        result.exitCode === 0
          ? result.stderr
          : result.stderr || `Installation via ${candidate.label} failed.`,
      stdout: result.stdout
    }
  }

  // Step 4 – no package manager found; open the platform download page instead
  if (fallbackUrl) {
    return installViaUrl(id, fallbackUrl)
  }

  return {
    action: 'opened',
    id,
    ok: false,
    stderr: 'No supported package manager was found for this platform.'
  }
}

async function installCuda(onLine?: (line: string) => void): Promise<PrerequisiteInstallResult> {
  const id: PrerequisiteCheckId = 'cuda'

  // Step 1 – guard: CUDA is not supported on macOS
  if (process.platform === 'darwin') {
    return {
      action: 'installed',
      id,
      ok: false,
      stderr:
        'CUDA is not available on macOS. Whisper runs on CPU (or Apple GPU via supported backends) on this platform.'
    }
  }

  // Step 2 – resolve Python; fall back to opening the CUDA download page
  const python = await findPython()

  if (!python) {
    await shell.openExternal(installerUrls.cuda as string)
    return { action: 'opened', id, ok: true }
  }

  // Step 2b – upgrade pip first to repair any broken distribution metadata.
  await runDetailedCommand(
    python.command,
    [
      ...python.prefixArgs,
      '-m',
      'pip',
      'install',
      '--upgrade',
      '--quiet',
      '--disable-pip-version-check',
      'pip'
    ],
    60_000
  )

  // Step 2c – remove any partially-installed distributions left by a previously
  // interrupted pip run (e.g. "~ympy" for a broken numpy install). These appear
  // as tilde-prefixed folders in site-packages and can cause pip to exit with a
  // non-zero code even when the real packages install successfully.
  const cleanupCode = [
    'import pathlib, shutil, site',
    'dirs = site.getsitepackages()',
    'try:',
    '    dirs = dirs + [site.getusersitepackages()]',
    'except Exception:',
    '    pass',
    'for sdir in dirs:',
    '    try:',
    '        for p in pathlib.Path(sdir).iterdir():',
    '            if p.name.startswith("~"):',
    '                shutil.rmtree(str(p), ignore_errors=True)',
    '    except Exception:',
    '        pass'
  ].join('\n')
  await runDetailedCommand(python.command, [...python.prefixArgs, '-c', cleanupCode], 15_000)

  // Step 3 – install the CUDA-enabled torch build via pip.
  // --no-cache-dir is intentionally omitted: pip caches the partial download so
  // a subsequent retry can resume from where it left off rather than starting
  // over from 0 bytes.  The torch CUDA wheel is ~2.5 GB so resumability matters.
  const args = [
    ...python.prefixArgs,
    '-m',
    'pip',
    'install',
    '--upgrade',
    '--retries',
    '5',
    '--timeout',
    '120',
    '--disable-pip-version-check',
    'torch',
    'torchvision',
    'torchaudio',
    '--index-url',
    CUDA_TORCH_INDEX_URL
  ]
  const result = onLine
    ? await runStreamingCommand(python.command, args, onLine, CUDA_INSTALL_TIMEOUT_MS)
    : await runDetailedCommand(python.command, args, CUDA_INSTALL_TIMEOUT_MS)

  if (result.exitCode !== 0) {
    // Combine stdout + stderr so real ERROR: messages from pip are never lost
    // (pip occasionally writes error details to stdout rather than stderr).
    const combined = [result.stderr, result.stdout].filter(Boolean).join('\n')
    return {
      action: 'installed',
      command: `${python.command} ${args.join(' ')}`,
      id,
      ok: false,
      stderr: normalizePipInstallError(combined),
      stdout: result.stdout
    }
  }

  // Step 4 – verify GPU is now accessible via torch
  const cudaCheck = await checkCudaWithTorch(python, TORCH_PROBE_TIMEOUT_AFTER_INSTALL_MS)
  clearPrerequisiteCache()

  // Step 5 – build the result
  return {
    action: 'installed',
    command: `${python.command} ${args.join(' ')}`,
    id,
    ok: cudaCheck.status === 'ok',
    stderr:
      cudaCheck.status === 'ok'
        ? result.stderr
        : 'CUDA packages were installed, but GPU is still unavailable. Install/update NVIDIA drivers and ensure a CUDA-capable NVIDIA GPU is present.',
    stdout: result.stdout
  }
}

type Installer = (onLine?: (line: string) => void) => Promise<PrerequisiteInstallResult>

const INSTALLERS: Record<PrerequisiteCheckId, Installer> = {
  python: (onLine) => installSystemPrerequisite('python', onLine),
  ffmpeg: (onLine) => installSystemPrerequisite('ffmpeg', onLine),
  cuda: (onLine) => installCuda(onLine),
  'openai-whisper': (onLine) =>
    installViaPip('openai-whisper', pipInstallPackages['openai-whisper'] as string, onLine),
  torch: (onLine) => installViaPip('torch', pipInstallPackages.torch as string, onLine)
}

export async function installPrerequisite(
  id: PrerequisiteCheckId,
  onLine?: (line: string) => void
): Promise<PrerequisiteInstallResult> {
  return INSTALLERS[id](onLine)
}
