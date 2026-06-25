import { shell } from 'electron'
import { execFile } from 'node:child_process'
import type {
  PrerequisiteCheck,
  PrerequisiteCheckId,
  PrerequisiteInstallResult
} from '../../../shared/ipc'

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
  'faster-whisper',
  'ctranslate2',
  'torch'
]

const prerequisiteCacheDurationMs = 5000
let prerequisiteCache: { checkedAt: number; value: PrerequisiteCheck[] } | null = null
let prerequisiteRequest: Promise<PrerequisiteCheck[]> | null = null

const pipInstallPackages: Partial<Record<PrerequisiteCheckId, string>> = {
  'faster-whisper': 'faster-whisper',
  ctranslate2: 'ctranslate2',
  torch: 'torch'
}

const installerUrls: Partial<Record<PrerequisiteCheckId, string>> = {
  python: 'https://www.python.org/downloads/',
  ffmpeg: 'https://www.gyan.dev/ffmpeg/builds/',
  cuda: 'https://developer.nvidia.com/cuda-downloads'
}

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
  return output.match(/\d+(?:\.\d+)+(?:[A-Za-z0-9.+-]*)?/)?.[0] ?? null
}

function compareVersions(actual: string, required: readonly number[]): number {
  const actualParts = actual.split(/[^\d]+/).filter(Boolean).map(Number)

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

async function findPython(): Promise<CommandResult | null> {
  const candidates = [
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
    minimum: readonly number[]
    packageName: string
  }[] = [
    { id: 'faster-whisper', packageName: 'faster-whisper', minimum: [1, 0] },
    { id: 'ctranslate2', packageName: 'ctranslate2', minimum: [4, 0] },
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

async function checkPrerequisites(): Promise<PrerequisiteCheck[]> {
  const { check: pythonCheck, python } = await checkPython()
  const [ffmpegCheck, cudaCheck, pythonPackageChecks] = await Promise.all([
    checkCommandVersion('ffmpeg', [{ command: 'ffmpeg', args: ['-version'], timeoutMs: 1500 }]),
    checkCommandVersion(
      'cuda',
      [{ command: 'nvcc', args: ['--version'], timeoutMs: 1500 }],
      [11, 8]
    ),
    checkPythonPackages(python)
  ])
  const checks = [pythonCheck, ffmpegCheck, cudaCheck, ...pythonPackageChecks]

  return prerequisiteIds.map(
    (id) => checks.find((check) => check.id === id) ?? { id, installed: null, status: 'missing' }
  )
}

export async function getCachedPrerequisites(): Promise<PrerequisiteCheck[]> {
  if (prerequisiteCache && Date.now() - prerequisiteCache.checkedAt < prerequisiteCacheDurationMs) {
    return prerequisiteCache.value
  }

  if (!prerequisiteRequest) {
    prerequisiteRequest = checkPrerequisites().then((value) => {
      prerequisiteCache = { checkedAt: Date.now(), value }
      prerequisiteRequest = null
      return value
    })
  }

  return prerequisiteRequest
}

function clearPrerequisiteCache(): void {
  prerequisiteCache = null
  prerequisiteRequest = null
}

export async function installPrerequisite(
  id: PrerequisiteCheckId
): Promise<PrerequisiteInstallResult> {
  const pipPackage = pipInstallPackages[id]

  if (pipPackage) {
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

  const installerUrl = installerUrls[id]

  if (installerUrl) {
    await shell.openExternal(installerUrl)

    return {
      action: 'opened',
      id,
      ok: true
    }
  }

  return {
    action: 'opened',
    id,
    ok: false,
    stderr: 'No installer is configured for this prerequisite.'
  }
}
