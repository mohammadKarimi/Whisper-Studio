import { type BrowserWindow, ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc'

export type WindowResolver = () => BrowserWindow | null

export function registerWindowControlHandlers(resolveWindow: WindowResolver): void {
  ipcMain.handle(IPC_CHANNELS.windowIsMaximized, () => {
    return resolveWindow()?.isMaximized() ?? false
  })

  ipcMain.handle(IPC_CHANNELS.windowMinimize, () => {
    resolveWindow()?.minimize()
  })

  ipcMain.handle(IPC_CHANNELS.windowMaximize, () => {
    const window = resolveWindow()

    if (!window) {
      return
    }

    if (window.isMaximized()) {
      window.unmaximize()
    } else {
      window.maximize()
    }
  })

  ipcMain.handle(IPC_CHANNELS.windowClose, () => {
    resolveWindow()?.close()
  })
}
