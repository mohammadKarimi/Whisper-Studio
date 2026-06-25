import { ipcMain } from 'electron'
import {
  IPC_CHANNELS,
  type PrerequisiteCheck,
  type PrerequisiteCheckId,
  type PrerequisiteInstallResult
} from '../../shared/ipc'
import {
  getCachedPrerequisites,
  installPrerequisite,
  prerequisiteIds
} from './system/prerequisites'
import { getAppInfo, getDesktopPlatform, getSystemStatus } from './system/status'
import {
  registerWindowControlHandlers,
  type WindowResolver
} from './system/window-controls'

export function registerSystemHandlers(resolveWindow: WindowResolver): void {
  ipcMain.handle(IPC_CHANNELS.appInfo, getAppInfo)
  ipcMain.handle(IPC_CHANNELS.platform, getDesktopPlatform)
  ipcMain.handle(IPC_CHANNELS.systemStatus, getSystemStatus)

  ipcMain.handle(IPC_CHANNELS.prerequisites, async (): Promise<PrerequisiteCheck[]> => {
    return getCachedPrerequisites()
  })

  ipcMain.handle(
    IPC_CHANNELS.prerequisiteInstall,
    async (_event, id: PrerequisiteCheckId): Promise<PrerequisiteInstallResult> => {
      if (!prerequisiteIds.includes(id)) {
        return {
          action: 'opened',
          id,
          ok: false,
          stderr: 'Unknown prerequisite.'
        }
      }

      return installPrerequisite(id)
    }
  )

  registerWindowControlHandlers(resolveWindow)
}
