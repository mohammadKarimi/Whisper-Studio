import {
  DEFAULT_TRANSCRIPTION_ENGINE_ID,
  type TranscriptionEngineType
} from '../../../../shared/ipc'
import { whisperxEngine } from './whisperx'
import type { TranscriptionEngine } from './types'

const transcriptionEngines = {
  'whisperx': whisperxEngine
} satisfies Record<TranscriptionEngineType, TranscriptionEngine>

export function getTranscriptionEngine(
  engineId: TranscriptionEngineType | null | undefined
): TranscriptionEngine {
  return transcriptionEngines[engineId ?? DEFAULT_TRANSCRIPTION_ENGINE_ID]
}

export function getDefaultTranscriptionEngine(): TranscriptionEngine {
  return transcriptionEngines[DEFAULT_TRANSCRIPTION_ENGINE_ID]
}
