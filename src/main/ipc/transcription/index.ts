import { registerTranscriptionHandlers } from './handlers'
import { registerRecordHandlers } from './records'

export function registerTranscriptionDomain(): void {
  registerTranscriptionHandlers()
  registerRecordHandlers()
}

// Re-export for callers that only need the output directory path
export { getOutputDirectory } from '../../paths'
