import type {
  TranscriptionEngineType,
  WhisperOutputChunk,
  WhisperOutputFile,
  WhisperProgressUpdate,
  Segment,
  WhisperTranscriptionRequest
} from '../../../../shared/ipc'
import type { TranscriptionError } from '../../../../shared/errors'
import type { Result } from '../../../../shared/types'

export interface TranscriptionEngineContext {
  emitOutput: (chunk: WhisperOutputChunk) => void
  emitProgress: (update: WhisperProgressUpdate) => void
}

export interface TranscriptionEngineResult {
  args: string[]
  command: string
  exitCode: number | null
  outputDirectory: string
  outputFiles: WhisperOutputFile[]
  segments: Segment[]
  stderr: string
  stdout: string
}

export interface TranscriptionEngine {
  id: TranscriptionEngineType
  label: string
  run: (
    request: WhisperTranscriptionRequest,
    context: TranscriptionEngineContext
  ) => Promise<Result<TranscriptionEngineResult, TranscriptionError>>
}
