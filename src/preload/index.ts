import { contextBridge, ipcRenderer } from 'electron'
import {
  IPC_CHANNELS,
  type AppInfo,
  type DesktopApi,
  type DesktopPlatform,
  type PrerequisiteCheck,
  type PrerequisiteCheckId,
  type PrerequisiteInstallResult,
  type SystemStatus,
  type WhisperFileSelection,
  type WhisperOutputChunk,
  type WhisperProgressUpdate,
  type WhisperTranscriptionResult
} from '../shared/ipc'

const desktopApi: DesktopApi = {
  getAppInfo: () => ipcRenderer.invoke(IPC_CHANNELS.appInfo) as Promise<AppInfo>,
  getPlatform: () => ipcRenderer.invoke(IPC_CHANNELS.platform) as Promise<DesktopPlatform>,
  getSystemStatus: () => ipcRenderer.invoke(IPC_CHANNELS.systemStatus) as Promise<SystemStatus>,
  getPrerequisites: () =>
    ipcRenderer.invoke(IPC_CHANNELS.prerequisites) as Promise<PrerequisiteCheck[]>,
  installPrerequisite: (id: PrerequisiteCheckId) =>
    ipcRenderer.invoke(IPC_CHANNELS.prerequisiteInstall, id) as Promise<PrerequisiteInstallResult>,
  selectWhisperFile: () =>
    ipcRenderer.invoke(IPC_CHANNELS.whisperSelectFile) as Promise<WhisperFileSelection>,
  transcribeWithWhisper: (filePath: string) =>
    ipcRenderer.invoke(
      IPC_CHANNELS.whisperTranscribe,
      filePath
    ) as Promise<WhisperTranscriptionResult>,
  onWhisperOutput: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, chunk: WhisperOutputChunk): void => {
      callback(chunk)
    }

    ipcRenderer.on(IPC_CHANNELS.whisperOutputChunk, listener)

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.whisperOutputChunk, listener)
    }
  },
  onWhisperProgress: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, update: WhisperProgressUpdate): void => {
      callback(update)
    }

    ipcRenderer.on(IPC_CHANNELS.whisperProgressUpdate, listener)

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.whisperProgressUpdate, listener)
    }
  },
  windowControls: {
    isMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.windowIsMaximized) as Promise<boolean>,
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.windowMinimize) as Promise<void>,
    maximize: () => ipcRenderer.invoke(IPC_CHANNELS.windowMaximize) as Promise<void>,
    close: () => ipcRenderer.invoke(IPC_CHANNELS.windowClose) as Promise<void>,
    onStateChange: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, isMaximized: boolean): void => {
        callback(isMaximized)
      }

      ipcRenderer.on(IPC_CHANNELS.windowStateChanged, listener)

      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.windowStateChanged, listener)
      }
    }
  }
}

contextBridge.exposeInMainWorld('desktop', desktopApi)
