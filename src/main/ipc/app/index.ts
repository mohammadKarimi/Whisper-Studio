import { registerAppInfoHandlers } from './app-info-handlers'
import { registerFsHandlers } from './fs-handlers'
import { registerSettingsHandlers } from './settings-handlers'
import { registerSystemStatusHandlers } from './system-status-handlers'
import { registerWindowControlHandlers, type WindowResolver } from './window-controls'

export function registerAppHandlers(resolveWindow: WindowResolver): void {
  registerAppInfoHandlers()
  registerSystemStatusHandlers()
  registerFsHandlers()
  registerSettingsHandlers()
  registerWindowControlHandlers(resolveWindow)
}
