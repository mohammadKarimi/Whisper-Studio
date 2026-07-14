import { registerAppInfoHandlers } from './system/app-info-handlers'
import { registerFsHandlers } from './system/fs-handlers'
import { registerModelHandlers } from './system/model-handlers'
import { registerRuntimeHandlers } from './system/runtime-handlers'
import { registerSettingsHandlers } from './system/settings-handlers'
import { registerSystemStatusHandlers } from './system/systemStatus-handlers'
import { registerWindowControlHandlers, type WindowResolver } from './system/window-controls'

export function registerSystemHandlers(resolveWindow: WindowResolver): void {
  registerAppInfoHandlers()
  registerSystemStatusHandlers()
  registerModelHandlers()
  registerRuntimeHandlers()
  registerFsHandlers()
  registerSettingsHandlers()
  registerWindowControlHandlers(resolveWindow)
}
