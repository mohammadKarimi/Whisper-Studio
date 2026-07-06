import { app, ipcMain, net, shell } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { IPC_CHANNELS, type AppSettings } from '../../../shared/ipc'

export const GITHUB_LATEST_RELEASE_URL =
  'https://api.github.com/repos/mohammadKarimi/Whisper-Studio/releases/latest'

const DEFAULT_SETTINGS: AppSettings = {
  defaultModel: null,
  defaultLanguage: 'Auto',
  defaultTask: 'transcribe',
  defaultCompute: 'auto',
  defaultOutputDirectory: null,
  defaultExportFormats: ['srt', 'vtt', 'txt', 'tsv']
}

function getSettingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

export async function readSettings(): Promise<AppSettings> {
  try {
    const raw = await readFile(getSettingsPath(), 'utf-8')
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

async function writeSettings(settings: AppSettings): Promise<void> {
  await writeFile(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8')
}

interface GitHubRelease {
  tag_name: string
  html_url: string
  name: string
}

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.settingsGet, () => readSettings())

  ipcMain.handle(IPC_CHANNELS.settingsSet, async (_, patch: Partial<AppSettings>) => {
    const current = await readSettings()
    await writeSettings({ ...current, ...patch })
  })

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

  ipcMain.handle(IPC_CHANNELS.shellOpenExternal, async (_, url: string) => {
    if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('mailto:'))) {
      await shell.openExternal(url)
    }
  })
}
