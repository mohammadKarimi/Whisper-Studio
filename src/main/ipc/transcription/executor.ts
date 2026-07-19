import {
  DEFAULT_TRANSCRIPTION_ENGINE_ID,
  type WhisperTranscriptionRequest
} from '../../../shared/ipc'
import type { TranscriptionError } from '../../../shared/errors'
import type { Result } from '../../../shared/types'
import { getTranscriptionEngine } from './engines/registry'
import type { TranscriptionEngineContext, TranscriptionEngineResult } from './engines/types'
import { getOutputDirectory } from '../../paths'

export type ExecutorResult = TranscriptionEngineResult

export async function runWhisper(
  request: WhisperTranscriptionRequest,
  onOutput: TranscriptionEngineContext['emitOutput'],
  onProgress: TranscriptionEngineContext['emitProgress']
): Promise<Result<TranscriptionEngineResult, TranscriptionError>> {
  const engine = getTranscriptionEngine(request.engine ?? DEFAULT_TRANSCRIPTION_ENGINE_ID)
  return engine.run(request, {
    emitOutput: onOutput,
    emitProgress: onProgress
  })
}

export { getOutputDirectory }
