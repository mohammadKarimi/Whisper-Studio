export interface DownloadedWhisperModel {
  downloadedAt: number
  id: string
  languages: string
  name: string
  params: string
  path: string
  precision: string
  sizeBytes: number
  source: string
}

export interface DownloadedWhisperModelsResult {
  models: DownloadedWhisperModel[]
  totalSizeBytes: number
}

export interface WhisperModelActionResult {
  id: string
  ok: boolean
  path?: string
  stderr?: string
  stdout?: string
}

export type WhisperModelDownloadProgressState = 'pending' | 'active' | 'complete' | 'error'

export interface WhisperModelDownloadProgress {
  downloadedBytes: number
  repoId: string
  state: WhisperModelDownloadProgressState
}
