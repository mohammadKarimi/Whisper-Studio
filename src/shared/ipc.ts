export const IPC_CHANNELS = {
  appInfo: 'app:info',
  platform: 'system:platform',
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

export interface WhisperProgressUpdate {
  phase: WhisperProgressPhase
  message: string
  state: 'active' | 'complete' | 'error'
}

export interface DesktopApi {
  getAppInfo: () => Promise<AppInfo>
  getPlatform: () => Promise<DesktopPlatform>
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
