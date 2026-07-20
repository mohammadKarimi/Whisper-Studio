import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import {
  IPC_CHANNELS,
  type DownloadedWhisperModelsResult,
  type WhisperModelActionResult,
  type WhisperModelDownloadProgress
} from '../../../shared/ipc'
import { downloadModel } from './download'
import { downloadedModelsCache, getDownloadedModels, deleteModel } from './scanner'

export function registerModelHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.downloadedModels,
    (): Promise<DownloadedWhisperModelsResult> => getDownloadedModels()
  )

  ipcMain.handle(
    IPC_CHANNELS.downloadModel,
    async (event: IpcMainInvokeEvent, repoId: string): Promise<WhisperModelActionResult> => {
      const result = await downloadModel(repoId, (progress: WhisperModelDownloadProgress) => {
        event.sender.send(IPC_CHANNELS.modelDownloadProgress, progress)
      })
      downloadedModelsCache.invalidate()
      return result
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.deleteModel,
    (_event: IpcMainInvokeEvent, id: string): Promise<WhisperModelActionResult> => deleteModel(id)
  )
}
