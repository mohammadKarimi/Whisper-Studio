import { mkdir } from 'node:fs/promises'
import { ipcMain, shell, type IpcMainInvokeEvent } from 'electron'
import type {
  RuntimeActionResult,
  RuntimeInstallProgress,
  RuntimeManifest,
  RuntimeStatus
} from '../../../shared/ipc'
import { IPC_CHANNELS } from '../../../shared/ipc'
import { loadRuntimeManifest } from '../../runtime/manifest'
import { getRuntimeStatus, installRuntime, removeRuntime, activateManualRuntime } from '../../runtime'
import { getRuntimesPath } from '../../paths'

export function registerRuntimeHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.runtimeManifest,
    (): Promise<RuntimeManifest> => loadRuntimeManifest()
  )
  ipcMain.handle(IPC_CHANNELS.runtimeStatus, (): Promise<RuntimeStatus> => getRuntimeStatus())
  ipcMain.handle(
    IPC_CHANNELS.runtimeInstall,
    (event: IpcMainInvokeEvent, artifactId?: string): Promise<RuntimeActionResult> =>
      installRuntime(artifactId, (progress: RuntimeInstallProgress) =>
        event.sender.send(IPC_CHANNELS.runtimeInstallProgress, progress)
      )
  )
  ipcMain.handle(IPC_CHANNELS.runtimeRemove, (): Promise<RuntimeActionResult> => removeRuntime())
  ipcMain.handle(
    IPC_CHANNELS.runtimeActivate,
    (_event: IpcMainInvokeEvent, artifactId: string): Promise<RuntimeActionResult> =>
      activateManualRuntime(artifactId)
  )
  ipcMain.handle(IPC_CHANNELS.runtimeOpenFolder, async (): Promise<void> => {
    const path = getRuntimesPath()
    await mkdir(path, { recursive: true })
    await shell.openPath(path)
  })
}
