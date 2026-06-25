export const IPC_CHANNELS = {
  appInfo: 'app:info',
  platform: 'system:platform',
  systemStatus: 'system:status',
  prerequisites: 'system:prerequisites',
  prerequisiteInstall: 'system:prerequisite-install',
  windowIsMaximized: 'window:is-maximized',
  windowStateChanged: 'window:state-changed',
  windowMinimize: 'window:minimize',
  windowMaximize: 'window:maximize',
  windowClose: 'window:close',
  whisperSelectFile: 'whisper:select-file',
  whisperTranscribe: 'whisper:transcribe',
  whisperOutputChunk: 'whisper:output-chunk',
  whisperProgressUpdate: 'whisper:progress-update'
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

export type PrerequisiteCheckId =
  | 'python'
  | 'ffmpeg'
  | 'cuda'
  | 'faster-whisper'
  | 'ctranslate2'
  | 'torch'

export type PrerequisiteCheckStatus = 'ok' | 'missing'

export interface PrerequisiteCheck {
  id: PrerequisiteCheckId
  installed: string | null
  status: PrerequisiteCheckStatus
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

export interface WhisperFileSelection {
  canceled: boolean
  filePath?: string
  fileName?: string
}

export interface WhisperTranscriptionResult {
  command: string
  exitCode: number | null
  stdout: string
  stderr: string
  transcript?: string
  transcriptPath?: string
}

export interface WhisperOutputChunk {
  stream: 'stdout' | 'stderr'
  text: string
}

export type WhisperProgressPhase =
  | 'checking-command'
  | 'checking-whisper'
  | 'sending-command'
  | 'waiting'
  | 'transcribing'
  | 'complete'
  | 'error'

export type WhisperProgressState = 'active' | 'complete' | 'error'

export interface WhisperProgressUpdate {
  message: string
  phase: WhisperProgressPhase
  state: WhisperProgressState
}

export interface DesktopApi {
  getAppInfo: () => Promise<AppInfo>
  getPlatform: () => Promise<DesktopPlatform>
  getSystemStatus: () => Promise<SystemStatus>
  getPrerequisites: () => Promise<PrerequisiteCheck[]>
  installPrerequisite: (id: PrerequisiteCheckId) => Promise<PrerequisiteInstallResult>
  selectWhisperFile: () => Promise<WhisperFileSelection>
  transcribeWithWhisper: (filePath: string) => Promise<WhisperTranscriptionResult>
  onWhisperOutput: (callback: (chunk: WhisperOutputChunk) => void) => () => void
  onWhisperProgress: (callback: (update: WhisperProgressUpdate) => void) => () => void
  windowControls: {
    isMaximized: () => Promise<boolean>
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
    onStateChange: (callback: (isMaximized: boolean) => void) => () => void
  }
}
