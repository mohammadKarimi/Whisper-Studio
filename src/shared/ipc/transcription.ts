export type TranscriptionEngineType = 'whisperx'

export const DEFAULT_TRANSCRIPTION_ENGINE_ID: TranscriptionEngineType = 'whisperx'

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

export interface WhisperTranscriptionRequest {
  compute: string
  diarization: boolean
  engine?: TranscriptionEngineType
  filePath: string
  formats: string[]
  hotwords?: string
  initialPrompt?: string
  language: string
  model: string
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
