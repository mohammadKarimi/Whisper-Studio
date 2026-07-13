export const IPC_CHANNELS = {
  appInfo: 'app:info',
  platform: 'system:platform',
  systemStatus: 'system:status',
  prerequisites: 'system:prerequisites',
  prerequisiteInstall: 'system:prerequisite-install',
  prerequisiteInstallProgress: 'system:prerequisite-install-progress',
  downloadedModels: 'models:downloaded',
  downloadModel: 'models:download',
  modelDownloadProgress: 'models:download-progress',
  deleteModel: 'models:delete',
  windowIsMaximized: 'window:is-maximized',
  windowStateChanged: 'window:state-changed',
  windowMinimize: 'window:minimize',
  windowMaximize: 'window:maximize',
  windowClose: 'window:close',
  whisperTranscribe: 'whisper:transcribe',
  whisperOutputChunk: 'whisper:output-chunk',
  whisperProgressUpdate: 'whisper:progress-update',
  listTranscriptions: 'transcriptions:list',
  deleteTranscription: 'transcriptions:delete',
  readTextFile: 'fs:read-text-file',
  writeTextFile: 'fs:write-text-file',
  selectDirectory: 'fs:select-directory',
  selectFile: 'fs:select-file',
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  appCheckUpdate: 'app:check-update',
  shellOpenExternal: 'shell:open-external'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

export type DesktopPlatform = 'aix' | 'darwin' | 'freebsd' | 'linux' | 'openbsd' | 'sunos' | 'win32'

export interface AppInfo {
  name: string
  version: string
  electron: string
  chrome: string
  node: string
}

export interface SystemStatusMetric {
  label: string
  value: string
}

export interface SystemStatus {
  activity: string
  metrics: readonly SystemStatusMetric[]
  ready: boolean
  status: string
}

export type PrerequisiteCheckId = 'python' | 'ffmpeg' | 'cuda' | 'whisperx' | 'torch'

export type PrerequisiteCheckStatus = 'ok' | 'missing' | 'unsupported' | 'attention'

export interface PrerequisiteCheck {
  id: PrerequisiteCheckId
  installed: string | null
  status: PrerequisiteCheckStatus
  detail?: string
}

export type PrerequisiteInstallAction = 'installed' | 'opened'

export interface PrerequisiteInstallResult {
  action: PrerequisiteInstallAction
  command?: string
  id: PrerequisiteCheckId
  ok: boolean
  stderr?: string
  stdout?: string
}

export interface PrerequisiteInstallProgress {
  id: PrerequisiteCheckId
  line: string
  downloadedBytes?: number
  totalBytes?: number
  speedBytesPerSec?: number
  etaSeconds?: number
}

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

export type WhisperModelDownloadProgressState = 'active' | 'complete' | 'error'

export interface WhisperModelDownloadProgress {
  downloadedBytes: number
  repoId: string
  state: WhisperModelDownloadProgressState
}

export interface FileSelection {
  canceled: boolean
  filePath?: string
  fileName?: string
}

export interface WhisperTranscriptionResult {
  command: string
  exitCode: number | null
  outputDirectory?: string
  outputFiles?: WhisperOutputFile[]
  record?: TranscriptionRecord
  stdout: string
  stderr: string
  transcript?: string
  transcriptPath?: string
}

export type TranscriptionEngineType = 'whisperx'

export const DEFAULT_TRANSCRIPTION_ENGINE_ID: TranscriptionEngineType = 'whisperx'

export interface WhisperTranscriptionRequest {
  compute: string
  diarization: boolean
  engine?: TranscriptionEngineType
  filePath: string
  formats: string[]
  language: string
  model: string
  noiseReduction: boolean
  removeSilence: boolean
  translate: boolean
  wordTimestamps: boolean
}

export interface WhisperOutputFile {
  format: string
  path: string
  sizeBytes: number
}

export interface Segment {
  id: number
  start: number
  end: number
  text: string
  speaker?: string
}

export interface TranscriptionRecord {
  id: string
  sourceFileName: string
  sourceFilePath: string
  engine?: TranscriptionEngineType
  model: string
  language: string
  compute: string
  outputDirectory: string
  outputFiles: WhisperOutputFile[]
  segments: Segment[]
  speakerNames?: Record<string, string>
  durationSeconds: number | null
  createdAt: number
  editedAt?: number
  exitCode: number | null
}

export interface WhisperOutputChunk {
  stream: 'stdout' | 'stderr'
  text: string
}

export type WhisperProgressPhase =
  | 'checking-command'
  | 'checking-whisper'
  | 'sending-command'
  | 'transcribing'
  | 'complete'
  | 'error'

export type WhisperProgressState = 'active' | 'complete' | 'error'

export interface WhisperProgressUpdate {
  message: string
  phase: WhisperProgressPhase
  state: WhisperProgressState
}

/** Application metadata, system status, prerequisites, and file-path utilities. */
export interface AppApi {
  getAppInfo: () => Promise<AppInfo>
  getPlatform: () => Promise<DesktopPlatform>
  getSystemStatus: () => Promise<SystemStatus>
  getPrerequisites: () => Promise<PrerequisiteCheck[]>
  installPrerequisite: (id: PrerequisiteCheckId) => Promise<PrerequisiteInstallResult>
  onPrerequisiteInstallProgress: (
    callback: (progress: PrerequisiteInstallProgress) => void
  ) => () => void
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
export interface AppSettings {
  defaultModel: string | null
  defaultLanguage: string
  defaultTask: 'transcribe' | 'translate'
  defaultCompute: 'cpu' | 'cuda' | 'auto'
  defaultOutputDirectory: string | null
  defaultExportFormats: string[]
  hfToken: string | null
}

/** Result returned by the update check IPC call. */
export interface UpdateCheckResult {
  currentVersion: string
  hasUpdate: boolean
  latestVersion: string
  releaseUrl: string
  releaseName: string
}

/** Settings persistence, update check, and shell utilities. */
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
