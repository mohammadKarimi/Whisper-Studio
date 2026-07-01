import { registerAppInfoHandlers } from './system/app-info-handlers'
import { registerFsHandlers } from './system/fs-handlers'
import { registerModelHandlers } from './system/model-handlers'
import { registerPrerequisiteHandlers } from './system/prerequisite-handlers'
import { registerSettingsHandlers } from './system/settings-handlers'
import { registerWindowControlHandlers, type WindowResolver } from './system/window-controls'

export function registerSystemHandlers(resolveWindow: WindowResolver): void {
  registerAppInfoHandlers()
  registerModelHandlers()
  registerPrerequisiteHandlers()
  registerFsHandlers()
  registerSettingsHandlers()
  registerWindowControlHandlers(resolveWindow)
}
