import type { PrerequisiteCheck } from '../../shared/ipc'
import type { CommandCandidate, CommandResult } from '../ipc/command'
import { findPython, runCommand, runCommandCandidate } from '../ipc/command'
import { parseVersion } from '../ipc/utils'
import { getVenvPath, getVenvPythonPath } from '../paths'
import { prerequisiteIds, unsupportedPythonMessage } from './config'
import { checkCudaWithTorch } from './cuda'
import { runDetailedCommand } from './process'
import { checkVersion, isUnsupportedPythonForPackages } from './utils'

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

  const check = checkVersion('python', installed, [3, 8])

  if (check.status === 'ok' && python && python.command !== getVenvPythonPath()) {
    await runDetailedCommand(
      python.command,
      [...python.prefixArgs, '-m', 'venv', getVenvPath()],
      60_000
    )
    const venvPython = await findPython()
    return { check, python: venvPython ?? python }
  }

  return { check, python }
}

async function checkCommandVersion(
  id: PrerequisiteCheck['id'],
  candidates: readonly CommandCandidate[],
  minimum?: readonly number[]
): Promise<PrerequisiteCheck> {
  const result = await runCommandCandidate(candidates)
  const installed = result ? parseVersion(result.output) : null

  return checkVersion(id, installed, minimum)
}

async function checkPythonPackages(python: CommandResult | null): Promise<PrerequisiteCheck[]> {
  const packages: readonly {
    id: PrerequisiteCheck['id']
    minimum?: readonly number[]
    packageName: string
  }[] = [
    { id: 'whisperx', packageName: 'whisperx' },
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

export async function checkPrerequisites(): Promise<PrerequisiteCheck[]> {
  const { check: pythonCheck, python } = await checkPython()
  const [ffmpegCheck, pythonPackageChecks, cudaByTorchCheck] = await Promise.all([
    checkCommandVersion('ffmpeg', [{ command: 'ffmpeg', args: ['-version'], timeoutMs: 1500 }]),
    checkPythonPackages(python),
    checkCudaWithTorch(python)
  ])

  const cudaCheck: PrerequisiteCheck =
    process.platform === 'darwin'
      ? { id: 'cuda', installed: null, status: 'unsupported' }
      : cudaByTorchCheck
  const checks = [pythonCheck, ffmpegCheck, cudaCheck, ...pythonPackageChecks]

  return prerequisiteIds.map(
    (id) => checks.find((check) => check.id === id) ?? { id, installed: null, status: 'missing' }
  )
}
