export type RuntimeAccelerator = 'cpu' | 'cuda'
export type RuntimeArchiveFormat = 'zip'

export interface RuntimeArtifact {
  accelerator: RuntimeAccelerator
  arch: 'x64' | 'arm64'
  format: RuntimeArchiveFormat
  id: string
  minimumNvidiaDriver?: string
  platform: 'win32' | 'darwin' | 'linux'
  sha256: string
  sizeBytes: number
  url: string
  version: string
}

export interface RuntimeManifest {
  artifacts: RuntimeArtifact[]
  runtimeVersion: string
  schemaVersion: 1
}

export type RuntimeStatusState = 'missing' | 'ready' | 'invalid' | 'installing'

export interface RuntimeStatus {
  active: RuntimeArtifact | null
  available: RuntimeArtifact[]
  message?: string
  recommended: RuntimeArtifact | null
  state: RuntimeStatusState
}

export type RuntimeInstallPhase =
  | 'preparing'
  | 'downloading'
  | 'verifying'
  | 'extracting'
  | 'checking'
  | 'ready'
  | 'error'

export interface RuntimeInstallProgress {
  downloadedBytes?: number
  etaSeconds?: number
  extractedFiles?: number
  message: string
  phase: RuntimeInstallPhase
  speedBytesPerSec?: number
  totalBytes?: number
  totalFiles?: number
}

export interface RuntimeActionResult {
  ok: boolean
  status: RuntimeStatus
  stderr?: string
}
