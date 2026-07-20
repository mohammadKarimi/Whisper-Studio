import { rm } from 'node:fs/promises'
import type {
  RuntimeActionResult,
  RuntimeArtifact,
  RuntimeInstallProgress,
  RuntimeManifest,
  RuntimeStatus
} from '../../shared/ipc'
import { checkRuntimeFiles, removeQuarantine } from './health'
import { runInstallation, isInstallInProgress } from './installer'
import { loadRuntimeManifest } from './manifest'
import { getRuntimeFfmpegPath, getRuntimeInstallPath, getRuntimePythonPath } from './paths'
import { clearActiveRecord, readActiveRecord, writeActiveRecord } from './record'
import { getSelection } from './selection'

export async function getRuntimeStatus(manifest?: RuntimeManifest): Promise<RuntimeStatus> {
  const resolvedManifest = manifest ?? (await loadRuntimeManifest())
  const { available, recommended } = await getSelection(resolvedManifest)
  const record = await readActiveRecord()
  if (!record) {
    return {
      active: null,
      available,
      recommended,
      state: isInstallInProgress() ? 'installing' : 'missing'
    }
  }

  const root = getRuntimeInstallPath(record.artifact)
  try {
    await checkRuntimeFiles(root)
    return { active: record.artifact, available, recommended, state: 'ready' }
  } catch {
    return {
      active: record.artifact,
      available,
      recommended,
      state: 'invalid',
      message: 'Runtime files are missing.'
    }
  }
}

export async function installRuntime(
  artifactId: string | undefined,
  emit: (progress: RuntimeInstallProgress) => void
): Promise<RuntimeActionResult> {
  const result = await runInstallation(artifactId, emit)
  const status = await getRuntimeStatus(result.manifest)
  return result.ok
    ? { ok: true, status }
    : { ok: false, status, stderr: result.stderr ?? 'Runtime installation failed.' }
}

export async function activateManualRuntime(artifactId: string): Promise<RuntimeActionResult> {
  const manifest = await loadRuntimeManifest()
  const { available } = await getSelection(manifest)
  const artifact = available.find((a) => a.id === artifactId) ?? null

  if (!artifact) {
    return {
      ok: false,
      status: await getRuntimeStatus(manifest),
      stderr: `Artifact "${artifactId}" was not found in the manifest. Check your internet connection.`
    }
  }

  const root = getRuntimeInstallPath(artifact)
  try {
    await checkRuntimeFiles(root)
  } catch {
    const pythonHint = getRuntimePythonPath(root)
    const ffmpegHint = getRuntimeFfmpegPath(root)
    return {
      ok: false,
      status: await getRuntimeStatus(manifest),
      stderr: `Runtime files not found at:\n${root}\n\nMake sure the folder contains:\n  ${pythonHint}\n  ${ffmpegHint}`
    }
  }

  await removeQuarantine(root)
  await writeActiveRecord({ artifact, installedAt: Date.now() })
  return { ok: true, status: await getRuntimeStatus(manifest) }
}

export async function removeRuntime(): Promise<RuntimeActionResult> {
  const record = await readActiveRecord()
  if (record) await rm(getRuntimeInstallPath(record.artifact), { recursive: true, force: true })
  await clearActiveRecord()
  return { ok: true, status: await getRuntimeStatus() }
}

export async function getActiveRuntime(): Promise<{
  artifact: RuntimeArtifact
  root: string
} | null> {
  const record = await readActiveRecord()
  if (!record) return null
  return { artifact: record.artifact, root: getRuntimeInstallPath(record.artifact) }
}
