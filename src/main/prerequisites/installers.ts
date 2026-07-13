import { shell } from 'electron'
import type { PrerequisiteCheckId, PrerequisiteInstallResult } from '../../shared/ipc'
import { findPython, runCommand } from '../ipc/command'
import { parseVersion } from '../ipc/utils'
import {
  CUDA_INSTALL_TIMEOUT_MS,
  PIP_INSTALL_TIMEOUT_MS,
  TORCH_PROBE_TIMEOUT_AFTER_INSTALL_MS,
  installerUrls,
  pipInstallPackages,
  unsupportedPythonMessage
} from './config'
import { checkCudaWithTorch, detectCudaToolkit, getCudaTorchIndexUrl } from './cuda'
import { normalizePipInstallError } from './pip'
import {
  getInstallPlatform,
  resolveFallbackInstallerUrl,
  resolveSystemInstallCandidates
} from './platform-installers'
import { runDetailedCommand, runStreamingCommand } from './process'
import { clearPrerequisiteCache } from './service'
import { isUnsupportedPythonForPackages } from './utils'

async function installViaPip(
  id: PrerequisiteCheckId,
  pipPackage: string,
  onLine?: (line: string) => void,
  extraArgs: readonly string[] = []
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
    pipPackage,
    ...extraArgs
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

async function installWhisperX(
  onLine?: (line: string) => void
): Promise<PrerequisiteInstallResult> {
  const toolkit = await detectCudaToolkit()
  const extraArgs: string[] = toolkit
    ? ['--extra-index-url', getCudaTorchIndexUrl(toolkit.version)]
    : []
  return installViaPip('whisperx', pipInstallPackages['whisperx'], onLine, extraArgs)
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
    // If this fails, the user may need to restart the app for PATH changes.
  }
}

async function installSystemPrerequisite(
  id: PrerequisiteCheckId,
  onLine?: (line: string) => void
): Promise<PrerequisiteInstallResult> {
  const platform = getInstallPlatform()
  const candidates = platform ? resolveSystemInstallCandidates(platform, id) : []
  const fallbackUrl = getFallbackInstallerUrl(id)

  for (const candidate of candidates) {
    const probed = await runCommand(candidate.probe, ['--version'], 4000)

    if (!probed) {
      continue
    }

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
    await shell.openExternal(installerUrls.cuda)
    return { action: 'opened', id, ok: true }
  }

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

  const toolkit = await detectCudaToolkit()
  const cudaIndexUrl = getCudaTorchIndexUrl(toolkit?.version ?? null)
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
    cudaIndexUrl
  ]
  const result = onLine
    ? await runStreamingCommand(python.command, args, onLine, CUDA_INSTALL_TIMEOUT_MS)
    : await runDetailedCommand(python.command, args, CUDA_INSTALL_TIMEOUT_MS)

  if (result.exitCode !== 0) {
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

type Installer = (onLine?: (line: string) => void) => Promise<PrerequisiteInstallResult>

const INSTALLERS: Record<PrerequisiteCheckId, Installer> = {
  python: (onLine) => installSystemPrerequisite('python', onLine),
  ffmpeg: (onLine) => installSystemPrerequisite('ffmpeg', onLine),
  cuda: (onLine) => installCuda(onLine),
  whisperx: (onLine) => installWhisperX(onLine),
  torch: (onLine) => installViaPip('torch', pipInstallPackages.torch, onLine)
}

export async function installPrerequisite(
  id: PrerequisiteCheckId,
  onLine?: (line: string) => void
): Promise<PrerequisiteInstallResult> {
  return INSTALLERS[id](onLine)
}
