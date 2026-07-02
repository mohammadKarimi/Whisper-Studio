import { shell } from 'electron'
import { execFile } from 'node:child_process'
import type {
  PrerequisiteCheck,
  PrerequisiteCheckId,
  PrerequisiteInstallResult
} from '../../../shared/ipc'
import { PYTHON_TARGET_VERSION } from '../../../shared/constants'
import { createScopedCache } from './cache'

type CommandResult = {
  command: string
  output: string
  prefixArgs: string[]
}

type CommandCandidate = {
  args: readonly string[]
  command: string
  prefixArgs?: readonly string[]
  timeoutMs?: number
}

type DetailedCommandResult = {
  exitCode: number | null
  stderr: string
  stdout: string
}

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

function runCommand(
  command: string,
  args: readonly string[],
  timeoutMs = 3000
): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(
      command,
      [...args],
      { timeout: timeoutMs, windowsHide: true },
      (error, stdout, stderr) => {
        const output = `${stdout}${stderr}`.trim()

        if (error && !output) {
          resolve(null)
          return
        }

        resolve(output || null)
      }
    )
  })
}

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

async function runCommandCandidate(
  candidates: readonly CommandCandidate[]
): Promise<CommandResult | null> {
  for (const candidate of candidates) {
    const prefixArgs = [...(candidate.prefixArgs ?? [])]
    const output = await runCommand(
      candidate.command,
      [...prefixArgs, ...candidate.args],
      candidate.timeoutMs
    )

    if (output) {
      return { command: candidate.command, output, prefixArgs }
    }
  }

  return null
}

function parseVersion(output: string): string | null {
  // Match dotted versions (3.11.0) or date versions (20231117)
  return (
    output.match(/\d+(?:\.\d+)+(?:[A-Za-z0-9.+-]*)?/)?.[0] ?? output.match(/\b\d{8}\b/)?.[0] ?? null
  )
}

function compareVersions(actual: string, required: readonly number[]): number {
  const actualParts = actual
    .split(/[^\d]+/)
    .filter(Boolean)
    .map(Number)

  for (let index = 0; index < required.length; index += 1) {
    const actualPart = actualParts[index] ?? 0
    const requiredPart = required[index] ?? 0

    if (actualPart > requiredPart) {
      return 1
    }

    if (actualPart < requiredPart) {
      return -1
    }
  }

  return 0
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

// Shared Python discovery for system checks and model management.
// Prefers the pinned target version (e.g. python3.12 / py -3.12) so that an installed
// supported interpreter is used even when a newer, unsupported Python is also on PATH.
export async function findPython(): Promise<CommandResult | null> {
  const candidates = [
    { command: `python${PYTHON_TARGET_VERSION}`, args: ['--version'], timeoutMs: 1500 },
    {
      command: 'py',
      prefixArgs: [`-${PYTHON_TARGET_VERSION}`],
      args: ['--version'],
      timeoutMs: 1500
    },
    { command: 'python', args: ['--version'], timeoutMs: 2500 },
    { command: 'python3', args: ['--version'], timeoutMs: 1200 },
    { command: 'py', prefixArgs: ['-3'], args: ['--version'], timeoutMs: 1200 }
  ]

  for (const candidate of candidates) {
    const result = await runCommandCandidate([candidate])

    if (result && parseVersion(result.output)) {
      return result
    }
  }

  return null
}

async function checkPython(): Promise<{ check: PrerequisiteCheck; python: CommandResult | null }> {
  const python = await findPython()
  const installed = python ? parseVersion(python.output) : null

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

const prerequisitesCache = createScopedCache(checkPrerequisites, 5000)

export async function getCachedPrerequisites(): Promise<PrerequisiteCheck[]> {
  return prerequisitesCache.get()
}

function clearPrerequisiteCache(): void {
  prerequisitesCache.invalidate()
}

// ---------------------------------------------------------------------------
// Install strategies — one function per prerequisite type.
// To add a new prerequisite: add its id to `prerequisiteIds`, add a check to
// `checkPrerequisites`, and add one entry to `INSTALLERS` below.
// ---------------------------------------------------------------------------

async function installViaPip(
  id: PrerequisiteCheckId,
  pipPackage: string
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

  const args = [...python.prefixArgs, '-m', 'pip', 'install', pipPackage]
  const result = await runDetailedCommand(python.command, args)
  clearPrerequisiteCache()

  return {
    action: 'installed',
    command: `${python.command} ${args.join(' ')}`,
    id,
    ok: result.exitCode === 0,
    stderr: result.stderr,
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

// Installs a system-level prerequisite using the platform's package manager.
// Falls back to opening a download page when no supported manager is available.
async function installSystemPrerequisite(
  id: PrerequisiteCheckId
): Promise<PrerequisiteInstallResult> {
  const platform = getInstallPlatform()
  const candidates = platform ? resolveSystemInstallCandidates(platform, id) : []
  const fallbackUrl = getFallbackInstallerUrl(id)

  for (const candidate of candidates) {
    const probed = await runCommand(candidate.probe, ['--version'], 4000)

    if (!probed) {
      continue
    }

    const result = await runDetailedCommand(candidate.command, candidate.args)
    const command = `${candidate.command} ${candidate.args.join(' ')}`
    clearPrerequisiteCache()

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

  // No package manager found — open the platform download page instead.
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

async function installCuda(): Promise<PrerequisiteInstallResult> {
  const id: PrerequisiteCheckId = 'cuda'

  if (process.platform === 'darwin') {
    return {
      action: 'installed',
      id,
      ok: false,
      stderr:
        'CUDA is not available on macOS. Whisper runs on CPU (or Apple GPU via supported backends) on this platform.'
    }
  }

  const python = await findPython()

  if (!python) {
    await shell.openExternal(installerUrls.cuda as string)
    return { action: 'opened', id, ok: true }
  }

  const args = [
    ...python.prefixArgs,
    '-m',
    'pip',
    'install',
    '--upgrade',
    'torch',
    'torchvision',
    'torchaudio',
    '--index-url',
    CUDA_TORCH_INDEX_URL
  ]
  const result = await runDetailedCommand(python.command, args)

  if (result.exitCode !== 0) {
    return {
      action: 'installed',
      command: `${python.command} ${args.join(' ')}`,
      id,
      ok: false,
      stderr: result.stderr,
      stdout: result.stdout
    }
  }

  const cudaCheck = await checkCudaWithTorch(python, TORCH_PROBE_TIMEOUT_AFTER_INSTALL_MS)
  clearPrerequisiteCache()

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

type Installer = () => Promise<PrerequisiteInstallResult>

const INSTALLERS: Record<PrerequisiteCheckId, Installer> = {
  python: () => installSystemPrerequisite('python'),
  ffmpeg: () => installSystemPrerequisite('ffmpeg'),
  cuda: () => installCuda(),
  'openai-whisper': () =>
    installViaPip('openai-whisper', pipInstallPackages['openai-whisper'] as string),
  torch: () => installViaPip('torch', pipInstallPackages.torch as string)
}

export async function installPrerequisite(
  id: PrerequisiteCheckId
): Promise<PrerequisiteInstallResult> {
  return INSTALLERS[id]()
}
