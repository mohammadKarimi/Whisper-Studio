import { app, ipcMain } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { IPC_CHANNELS, type AppSettings } from '../../../shared/ipc'

const DEFAULT_SETTINGS: AppSettings = {
  defaultModel: null,
  defaultLanguage: 'Auto',
  defaultTask: 'transcribe',
  defaultCompute: 'auto',
  defaultOutputDirectory: null,
  defaultExportFormats: ['srt', 'vtt', 'txt', 'tsv'],
  hfToken: null
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

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.settingsGet, () => readSettings())

  ipcMain.handle(IPC_CHANNELS.settingsSet, async (_, patch: Partial<AppSettings>) => {
    const current = await readSettings()
    await writeSettings({ ...current, ...patch })
  })
}
