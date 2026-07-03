import { contextBridge, ipcRenderer, webUtils } from 'electron'
import {
  FileSelection,
  IPC_CHANNELS,
  type AppApi,
  type AppInfo,
  type AppSettings,
  type DesktopApi,
  type DesktopPlatform,
  type DownloadedWhisperModelsResult,
  type FileSystemApi,
  type ModelApi,
  type PrerequisiteCheck,
  type PrerequisiteCheckId,
  type PrerequisiteInstallProgress,
  type PrerequisiteInstallResult,
  type SettingsApi,
  type SystemStatus,
  type TranscriptionApi,
  type TranscriptionRecord,
  type UpdateCheckResult,
  type WhisperModelActionResult,
  type WhisperModelDownloadProgress,
  type WhisperOutputChunk,
  type WhisperProgressUpdate,
  type WhisperTranscriptionRequest,
  type WhisperTranscriptionResult,
  type WindowControlsApi
} from '../shared/ipc'

const appApi: AppApi = {
  getAppInfo: () => ipcRenderer.invoke(IPC_CHANNELS.appInfo) as Promise<AppInfo>,
  getPlatform: () => ipcRenderer.invoke(IPC_CHANNELS.platform) as Promise<DesktopPlatform>,
  getSystemStatus: () => ipcRenderer.invoke(IPC_CHANNELS.systemStatus) as Promise<SystemStatus>,
  getPrerequisites: () =>
    ipcRenderer.invoke(IPC_CHANNELS.prerequisites) as Promise<PrerequisiteCheck[]>,
  installPrerequisite: (id: PrerequisiteCheckId) =>
    ipcRenderer.invoke(IPC_CHANNELS.prerequisiteInstall, id) as Promise<PrerequisiteInstallResult>,
  onPrerequisiteInstallProgress: (callback) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      progress: PrerequisiteInstallProgress
    ): void => {
      callback(progress)
    }
    ipcRenderer.on(IPC_CHANNELS.prerequisiteInstallProgress, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.prerequisiteInstallProgress, listener)
  },
  getFilePath: (file: unknown) =>
    webUtils.getPathForFile(file as Parameters<typeof webUtils.getPathForFile>[0])
}

const modelApi: ModelApi = {
  getDownloadedModels: () =>
    ipcRenderer.invoke(IPC_CHANNELS.downloadedModels) as Promise<DownloadedWhisperModelsResult>,
  downloadModel: (repoId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.downloadModel, repoId) as Promise<WhisperModelActionResult>,
  deleteModel: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.deleteModel, id) as Promise<WhisperModelActionResult>,
  onModelDownloadProgress: (callback) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      progress: WhisperModelDownloadProgress
    ): void => {
      callback(progress)
    }
    ipcRenderer.on(IPC_CHANNELS.modelDownloadProgress, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.modelDownloadProgress, listener)
  }
}

const transcriptionApi: TranscriptionApi = {
  selectWhisperFile: () => ipcRenderer.invoke(IPC_CHANNELS.selectFile) as Promise<FileSelection>,
  transcribeWithWhisper: (request: WhisperTranscriptionRequest) =>
    ipcRenderer.invoke(
      IPC_CHANNELS.whisperTranscribe,
      request
    ) as Promise<WhisperTranscriptionResult>,
  onWhisperOutput: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, chunk: WhisperOutputChunk): void => {
      callback(chunk)
    }
    ipcRenderer.on(IPC_CHANNELS.whisperOutputChunk, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.whisperOutputChunk, listener)
  },
  onWhisperProgress: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, update: WhisperProgressUpdate): void => {
      callback(update)
    }
    ipcRenderer.on(IPC_CHANNELS.whisperProgressUpdate, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.whisperProgressUpdate, listener)
  },
  listTranscriptions: () =>
    ipcRenderer.invoke(IPC_CHANNELS.listTranscriptions) as Promise<TranscriptionRecord[]>,
  deleteTranscription: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.deleteTranscription, id) as Promise<{ ok: boolean }>
}

const fileSystemApi: FileSystemApi = {
  readTextFile: (path: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.readTextFile, path) as Promise<string>,
  writeTextFile: (path: string, content: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.writeTextFile, path, content) as Promise<void>,
  selectDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.selectDirectory) as Promise<string | null>
}

const windowControlsApi: WindowControlsApi = {
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
      return () => ipcRenderer.removeListener(IPC_CHANNELS.windowStateChanged, listener)
    }
  }
}

const settingsApi: SettingsApi = {
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.settingsGet) as Promise<AppSettings>,
  setSettings: (patch: Partial<AppSettings>) =>
    ipcRenderer.invoke(IPC_CHANNELS.settingsSet, patch) as Promise<void>,
  checkForUpdates: () =>
    ipcRenderer.invoke(IPC_CHANNELS.appCheckUpdate) as Promise<UpdateCheckResult>,
  openExternal: (url: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.shellOpenExternal, url) as Promise<void>
}

const desktopApi: DesktopApi = {
  ...appApi,
  ...modelApi,
  ...transcriptionApi,
  ...fileSystemApi,
  ...windowControlsApi,
  ...settingsApi
}

contextBridge.exposeInMainWorld('desktop', desktopApi)
