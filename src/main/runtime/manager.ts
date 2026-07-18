import { net } from 'electron'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { Readable, Transform } from 'node:stream'
import extract from 'extract-zip'
import type {
  RuntimeActionResult,
  RuntimeArtifact,
  RuntimeInstallProgress,
  RuntimeManifest,
  RuntimeStatus
} from '../../shared/ipc'
import {
  getActiveRuntimeRecordPath,
  getRuntimeDownloadsPath,
  getRuntimesPath,
  getRuntimeStagingPath
} from '../paths'
import { checkRuntime, checkRuntimeFiles, removeQuarantine } from './health'
import { loadRuntimeManifest } from './manifest'
import { getRuntimeInstallPath, getRuntimePythonPath, getRuntimeFfmpegPath } from './paths'
import {
  compareNumericVersions,
  getCompatibleRuntimeArtifacts,
  selectRuntimeArtifact
} from './selection'

interface ActiveRuntimeRecord {
  artifact: RuntimeArtifact
  installedAt: number
}

let installInProgress = false

async function getNvidiaDriverVersion(): Promise<string | null> {
  if (process.platform === 'darwin') return null
  return new Promise((resolve) => {
    execFile(
      'nvidia-smi',
      ['--query-gpu=driver_version', '--format=csv,noheader'],
      { timeout: 3000 },
      (error, stdout) => resolve(error ? null : stdout.trim().split(/\r?\n/)[0] || null)
    )
  })
}

async function readActiveRecord(): Promise<ActiveRuntimeRecord | null> {
  try {
    return JSON.parse(await readFile(getActiveRuntimeRecordPath(), 'utf8')) as ActiveRuntimeRecord
  } catch {
    return null
  }
}

async function getSelection(manifest: RuntimeManifest): Promise<{
  available: RuntimeArtifact[]
  recommended: RuntimeArtifact | null
}> {
  const available = getCompatibleRuntimeArtifacts(
    manifest.artifacts,
    process.platform,
    process.arch
  )
  const driverVersion = await getNvidiaDriverVersion()
  const cuda = driverVersion
    ? selectRuntimeArtifact(manifest.artifacts, {
        accelerator: 'cuda',
        arch: process.arch,
        platform: process.platform
      })
    : null
  const cudaCompatible =
    cuda &&
    (!cuda.minimumNvidiaDriver ||
      compareNumericVersions(driverVersion!, cuda.minimumNvidiaDriver) >= 0)
  const recommended = cudaCompatible
    ? cuda
    : selectRuntimeArtifact(manifest.artifacts, {
        accelerator: 'cpu',
        arch: process.arch,
        platform: process.platform
      })
  return { available, recommended }
}

export async function getRuntimeStatus(manifest?: RuntimeManifest): Promise<RuntimeStatus> {
  const resolvedManifest = manifest ?? (await loadRuntimeManifest())
  const { available, recommended } = await getSelection(resolvedManifest)
  const record = await readActiveRecord()
  if (!record)
    return {
      active: null,
      available,
      recommended,
      state: installInProgress ? 'installing' : 'missing'
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

async function downloadArtifact(
  artifact: RuntimeArtifact,
  destination: string,
  emit: (progress: RuntimeInstallProgress) => void
): Promise<void> {
  const response = await net.fetch(artifact.url)
  if (!response.ok || !response.body)
    throw new Error(`Runtime download failed with HTTP ${response.status}.`)
  const totalBytes = Number(response.headers.get('content-length')) || artifact.sizeBytes
  const hash = createHash('sha256')
  let downloadedBytes = 0
  let lastBytes = 0
  let lastTime = Date.now()
  const meter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      hash.update(chunk)
      downloadedBytes += chunk.length
      const now = Date.now()
      if (now - lastTime >= 500) {
        const speedBytesPerSec = ((downloadedBytes - lastBytes) * 1000) / (now - lastTime)
        emit({
          downloadedBytes,
          etaSeconds:
            speedBytesPerSec > 0 ? (totalBytes - downloadedBytes) / speedBytesPerSec : undefined,
          message: 'Downloading Whisper Runtime',
          phase: 'downloading',
          speedBytesPerSec,
          totalBytes
        })
        lastBytes = downloadedBytes
        lastTime = now
      }
      callback(null, chunk)
    }
  })
  await pipeline(Readable.fromWeb(response.body as never), meter, createWriteStream(destination))
  emit({
    downloadedBytes: totalBytes,
    etaSeconds: 0,
    message: 'Downloading Whisper Runtime',
    phase: 'downloading',
    speedBytesPerSec: 0,
    totalBytes
  })
  if (hash.digest('hex').toLowerCase() !== artifact.sha256.toLowerCase()) {
    throw new Error('Runtime checksum verification failed.')
  }
}

export async function installRuntime(
  artifactId: string | undefined,
  emit: (progress: RuntimeInstallProgress) => void
): Promise<RuntimeActionResult> {
  if (installInProgress)
    return {
      ok: false,
      status: await getRuntimeStatus(),
      stderr: 'A Runtime installation is already running.'
    }
  installInProgress = true
  let archivePath = ''
  let stagingPath = ''
  let extractionComplete = false
  let keepStaging = false
  let manifest: Awaited<ReturnType<typeof loadRuntimeManifest>> | undefined
  try {
    emit({ phase: 'preparing', message: 'Selecting the best Runtime for this computer.' })
    manifest = await loadRuntimeManifest()
    const selection = await getSelection(manifest)
    const artifact = artifactId
      ? (selection.available.find((candidate) => candidate.id === artifactId) ?? null)
      : selection.recommended
    if (!artifact)
      throw new Error(
        'No compatible Runtime artifact is available for this operating system and architecture.'
      )

    await mkdir(getRuntimeDownloadsPath(), { recursive: true })
    await mkdir(getRuntimeStagingPath(), { recursive: true })
    archivePath = join(getRuntimeDownloadsPath(), `${artifact.id}.zip.partial`)
    stagingPath = join(getRuntimeStagingPath(), artifact.id)
    await Promise.all([
      rm(archivePath, { force: true }),
      rm(stagingPath, { recursive: true, force: true })
    ])
    await downloadArtifact(artifact, archivePath, emit)

    emit({ phase: 'verifying', message: 'Runtime download verified.' })
    await mkdir(stagingPath, { recursive: true })
    emit({ phase: 'extracting', message: 'Extracting Runtime files.' })
    let extractedFiles = 0
    let lastEmitTime = Date.now()
    await extract(archivePath, {
      dir: stagingPath,
      onEntry: (_entry, zipfile) => {
        extractedFiles++
        const totalFiles = zipfile.entryCount
        const now = Date.now()
        if (now - lastEmitTime >= 300) {
          emit({
            phase: 'extracting',
            message: 'Extracting Runtime files.',
            extractedFiles,
            totalFiles
          })
          lastEmitTime = now
        }
      }
    })
    emit({
      phase: 'extracting',
      message: 'Extracting Runtime files.',
      extractedFiles,
      totalFiles: extractedFiles
    })

    // ZIP is fully extracted — delete it immediately to reclaim disk space
    extractionComplete = true
    await rm(archivePath, { force: true }).catch(() => undefined)
    archivePath = ''

    emit({ phase: 'checking', message: 'Checking Python, WhisperX, Torch and FFmpeg.' })
    await checkRuntime(stagingPath, artifact)
    const installPath = getRuntimeInstallPath(artifact)
    await rm(installPath, { recursive: true, force: true })
    await rename(stagingPath, installPath)
    keepStaging = true // renamed — no longer at the staging path
    await mkdir(getRuntimesPath(), { recursive: true })
    await writeFile(
      getActiveRuntimeRecordPath(),
      JSON.stringify({ artifact, installedAt: Date.now() } satisfies ActiveRuntimeRecord, null, 2),
      'utf8'
    )
    emit({ phase: 'ready', message: 'Whisper Runtime is ready.' })
    return { ok: true, status: await getRuntimeStatus(manifest) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Runtime installation failed.'
    emit({ phase: 'error', message })
    return { ok: false, status: await getRuntimeStatus(manifest), stderr: message }
  } finally {
    installInProgress = false
    if (archivePath) await rm(archivePath, { force: true }).catch(() => undefined)
    if (stagingPath && !keepStaging && !extractionComplete) {
      await rm(stagingPath, { recursive: true, force: true }).catch(() => undefined)
    }
  }
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
  await mkdir(getRuntimesPath(), { recursive: true })
  await writeFile(
    getActiveRuntimeRecordPath(),
    JSON.stringify({ artifact, installedAt: Date.now() } satisfies ActiveRuntimeRecord, null, 2),
    'utf8'
  )

  return { ok: true, status: await getRuntimeStatus(manifest) }
}

export async function removeRuntime(): Promise<RuntimeActionResult> {
  const record = await readActiveRecord()
  if (record) await rm(getRuntimeInstallPath(record.artifact), { recursive: true, force: true })
  await rm(getActiveRuntimeRecordPath(), { force: true })
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
