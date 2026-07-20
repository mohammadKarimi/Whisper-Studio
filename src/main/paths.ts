import { app } from 'electron'
import { join } from 'node:path'
import { homedir } from 'node:os'

export function getOutputDirectory(): string {
  return join(app.getPath('documents'), 'Whisper Studio', 'transcriptions')
}

export function getRuntimesPath(): string {
  return join(app.getPath('userData'), 'runtimes')
}

export function getRuntimeDownloadsPath(): string {
  return join(getRuntimesPath(), 'downloads')
}

export function getRuntimeStagingPath(): string {
  return join(getRuntimesPath(), 'staging')
}

export function getActiveRuntimeRecordPath(): string {
  return join(getRuntimesPath(), 'active.json')
}

export function getWhisperModelCacheDir(): string {
  return process.env.HF_HUB_CACHE ?? join(homedir(), '.cache', 'huggingface', 'hub')
}
