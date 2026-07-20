import type { AppInfo, DesktopPlatform, SystemStatus } from './app'
import type {
  RuntimeActionResult,
  RuntimeInstallProgress,
  RuntimeManifest,
  RuntimeStatus
} from './runtime'
import type {
  DownloadedWhisperModelsResult,
  WhisperModelActionResult,
  WhisperModelDownloadProgress
} from './models'
import type { FileSelection, AppSettings, UpdateCheckResult } from './settings'
import type {
  TranscriptionRecord,
  WhisperOutputChunk,
  WhisperProgressUpdate,
  WhisperTranscriptionRequest,
  WhisperTranscriptionResult
} from './transcription'

/** Application metadata, system status, Runtime management, and file-path utilities. */
export interface AppApi {
  getAppInfo: () => Promise<AppInfo>
  getPlatform: () => Promise<DesktopPlatform>
  getSystemStatus: () => Promise<SystemStatus>
  getRuntimeStatus: () => Promise<RuntimeStatus>
  getRuntimeManifest: () => Promise<RuntimeManifest>
  installRuntime: (artifactId?: string) => Promise<RuntimeActionResult>
  removeRuntime: () => Promise<RuntimeActionResult>
  activateManualRuntime: (artifactId: string) => Promise<RuntimeActionResult>
  openRuntimeFolder: () => Promise<void>
  onRuntimeInstallProgress: (callback: (progress: RuntimeInstallProgress) => void) => () => void
  getFilePath: (file: unknown) => string
}

/** Whisper model download, list, and deletion. */
export interface ModelApi {
  getDownloadedModels: () => Promise<DownloadedWhisperModelsResult>
  downloadModel: (repoId: string) => Promise<WhisperModelActionResult>
  deleteModel: (id: string) => Promise<WhisperModelActionResult>
  onModelDownloadProgress: (
    callback: (progress: WhisperModelDownloadProgress) => void
  ) => () => void
}

/** Whisper transcription workflow and saved transcription records. */
export interface TranscriptionApi {
  selectWhisperFile: () => Promise<FileSelection>
  transcribeWithWhisper: (
    request: WhisperTranscriptionRequest
  ) => Promise<WhisperTranscriptionResult>
  onWhisperOutput: (callback: (chunk: WhisperOutputChunk) => void) => () => void
  onWhisperProgress: (callback: (update: WhisperProgressUpdate) => void) => () => void
  listTranscriptions: () => Promise<TranscriptionRecord[]>
  deleteTranscription: (id: string) => Promise<{ ok: boolean }>
}

/** File system read, write, and directory selection. */
export interface FileSystemApi {
  readTextFile: (path: string) => Promise<string>
  writeTextFile: (path: string, content: string) => Promise<void>
  selectDirectory: () => Promise<string | null>
}

/** Native window controls. */
export interface WindowControlsApi {
  windowControls: {
    isMaximized: () => Promise<boolean>
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
    onStateChange: (callback: (isMaximized: boolean) => void) => () => void
  }
}

/** Persisted user preferences. */
export interface SettingsApi {
  getSettings: () => Promise<AppSettings>
  setSettings: (patch: Partial<AppSettings>) => Promise<void>
  checkForUpdates: () => Promise<UpdateCheckResult>
  openExternal: (url: string) => Promise<void>
}

/** Full desktop API exposed by the preload bridge. Composed from all sub-interfaces. */
export type DesktopApi = AppApi &
  ModelApi &
  TranscriptionApi &
  FileSystemApi &
  WindowControlsApi &
  SettingsApi
