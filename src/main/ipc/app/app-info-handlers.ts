import { app, ipcMain, net } from 'electron'
import { AppInfo, DesktopPlatform, IPC_CHANNELS } from '../../../shared/ipc'

const GITHUB_LATEST_RELEASE_URL =
  'https://api.github.com/repos/mohammadKarimi/Whisper-Studio/releases/latest'

interface GitHubRelease {
  tag_name: string
  html_url: string
  name: string
}

export function registerAppInfoHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.appInfo, getAppInfo)
  ipcMain.handle(IPC_CHANNELS.platform, getDesktopPlatform)

  ipcMain.handle(IPC_CHANNELS.appCheckUpdate, async () => {
    const response = await net.fetch(GITHUB_LATEST_RELEASE_URL, {
      headers: { 'User-Agent': 'Whisper-Studio' }
    })
    const data = (await response.json()) as GitHubRelease
    const latestVersion = data.tag_name.replace(/^v/, '')
    const currentVersion = app.getVersion()
    return {
      currentVersion,
      hasUpdate: latestVersion !== currentVersion,
      latestVersion,
      releaseUrl: data.html_url,
      releaseName: data.name
    }
  })
}

export function getAppInfo(): AppInfo {
  return {
    name: app.getName(),
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    userDataPath: app.getPath('userData')
  }
}

export function getDesktopPlatform(): DesktopPlatform {
  return process.platform as DesktopPlatform
}
