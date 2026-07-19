import { registerAppHandlers } from './app'
import { registerModelHandlers } from './models'
import { registerRuntimeHandlers } from './runtime'
import { registerTranscriptionDomain } from './transcription'
import type { WindowResolver } from './app/window-controls'

export function registerAllHandlers(resolveWindow: WindowResolver): void {
  registerAppHandlers(resolveWindow)
  registerRuntimeHandlers()
  registerModelHandlers()
  registerTranscriptionDomain()
}
