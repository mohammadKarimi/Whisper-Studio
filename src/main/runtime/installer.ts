import { net } from 'electron'
import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { Readable, Transform } from 'node:stream'
import extract from 'extract-zip'
import type { RuntimeArtifact, RuntimeInstallProgress, RuntimeManifest } from '../../shared/ipc'
import { getRuntimeDownloadsPath, getRuntimeStagingPath } from '../paths'
import { checkRuntime } from './health'
import { loadRuntimeManifest } from './manifest'
import { getRuntimeInstallPath } from './paths'
import { writeActiveRecord } from './record'
import { getSelection } from './selection'

export interface InstallResult {
  ok: boolean
  manifest?: RuntimeManifest
  stderr?: string
}

let installInProgress = false

class CleanupSet {
  private readonly entries: Array<{ path: string; recursive: boolean }> = []

  track(path: string, recursive = false): void {
    this.entries.push({ path, recursive })
  }

  forget(path: string): void {
    const index = this.entries.findIndex((e) => e.path === path)
    if (index !== -1) this.entries.splice(index, 1)
  }

  async run(): Promise<void> {
    await Promise.allSettled(
      this.entries.map(({ path, recursive }) => rm(path, { force: true, recursive }))
    )
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

export function isInstallInProgress(): boolean {
  return installInProgress
}

export async function runInstallation(
  artifactId: string | undefined,
  emit: (progress: RuntimeInstallProgress) => void
): Promise<InstallResult> {
  if (installInProgress) {
    return { ok: false, stderr: 'A Runtime installation is already running.' }
  }
  installInProgress = true
  const cleanup = new CleanupSet()
  let manifest: RuntimeManifest | undefined

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
    const archivePath = join(getRuntimeDownloadsPath(), `${artifact.id}.zip.partial`)
    const stagingPath = join(getRuntimeStagingPath(), artifact.id)
    await Promise.all([
      rm(archivePath, { force: true }),
      rm(stagingPath, { recursive: true, force: true })
    ])

    cleanup.track(archivePath)
    cleanup.track(stagingPath, true)

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

    // ZIP fully extracted — delete immediately to reclaim disk space
    cleanup.forget(archivePath)
    await rm(archivePath, { force: true }).catch(() => undefined)

    emit({ phase: 'checking', message: 'Checking Python, WhisperX, Torch and FFmpeg.' })
    await checkRuntime(stagingPath, artifact)

    const installPath = getRuntimeInstallPath(artifact)
    await rm(installPath, { recursive: true, force: true })
    await rename(stagingPath, installPath)
    cleanup.forget(stagingPath)

    await writeActiveRecord({ artifact, installedAt: Date.now() })

    emit({ phase: 'ready', message: 'Whisper Runtime is ready.' })
    return { ok: true, manifest }
  } catch (error) {
    const stderr = error instanceof Error ? error.message : 'Runtime installation failed.'
    emit({ phase: 'error', message: stderr })
    return { ok: false, manifest, stderr }
  } finally {
    installInProgress = false
    await cleanup.run()
  }
}
