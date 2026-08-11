import { dialog, ipcMain, shell, type IpcMainInvokeEvent } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { FileSelection, IPC_CHANNELS } from '../../../shared/ipc'
import { SUPPORTED_MEDIA_EXTENSIONS } from '../../../shared/constants'
import { app } from 'electron'

function getRecordingExtension(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'mp4'
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('wav')) return 'wav'
  return 'webm'
}

export function registerFsHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.selectDirectory, async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    })
    return result.canceled ? null : (result.filePaths[0] ?? null)
  })

  ipcMain.handle(
    IPC_CHANNELS.readTextFile,
    async (_event: IpcMainInvokeEvent, filePath: string): Promise<string> => {
      return readFile(filePath, 'utf8')
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.writeTextFile,
    async (_event: IpcMainInvokeEvent, filePath: string, content: string): Promise<void> => {
      await writeFile(filePath, content, 'utf8')
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.saveRecording,
    async (
      _event: IpcMainInvokeEvent,
      data: ArrayBuffer,
      metadata: { mimeType: string; startedAt: number }
    ): Promise<{ fileName: string; filePath: string }> => {
      const recordingsDir = join(app.getPath('userData'), 'meeting-recordings')
      await mkdir(recordingsDir, { recursive: true })

      const startedAt = Number.isFinite(metadata.startedAt) ? metadata.startedAt : Date.now()
      const stamp = new Date(startedAt).toISOString().replace(/[:.]/g, '-')
      const fileName = `meeting-${stamp}.${getRecordingExtension(metadata.mimeType)}`
      const filePath = join(recordingsDir, fileName)

      await writeFile(filePath, Buffer.from(data))

      return { fileName, filePath }
    }
  )

  ipcMain.handle(IPC_CHANNELS.selectFile, async (): Promise<FileSelection> => {
    const selection = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Audio and video', extensions: [...SUPPORTED_MEDIA_EXTENSIONS] },
        { name: 'All files', extensions: ['*'] }
      ]
    })

    if (selection.canceled || selection.filePaths.length === 0) {
      return { canceled: true }
    }

    const filePath = selection.filePaths[0]
    return { canceled: false, filePath, fileName: basename(filePath) }
  })

  ipcMain.handle(IPC_CHANNELS.shellOpenExternal, async (_, url: string) => {
    if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('mailto:'))) {
      await shell.openExternal(url)
    }
  })
}
