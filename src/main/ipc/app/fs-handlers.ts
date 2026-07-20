import { dialog, ipcMain, shell, type IpcMainInvokeEvent } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { FileSelection, IPC_CHANNELS } from '../../../shared/ipc'
import { SUPPORTED_MEDIA_EXTENSIONS } from '../../../shared/constants'

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
