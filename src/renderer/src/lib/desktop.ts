import type { AppInfo, DesktopApi, DesktopPlatform } from '@shared/ipc'

function detectBrowserPlatform(): DesktopPlatform {
  const platform = navigator.platform.toLowerCase()

  if (platform.includes('mac')) {
    return 'darwin'
  }

  if (platform.includes('win')) {
    return 'win32'
  }

  return 'linux'
}

const browserDesktopApi: DesktopApi = {
  getAppInfo: async (): Promise<AppInfo> => ({
    name: 'Whisper Studio',
    version: '0.1.0',
    electron: 'browser',
    chrome: 'browser',
    node: 'browser'
  }),
  getPlatform: async () => detectBrowserPlatform(),
  selectWhisperFile: async () => ({ canceled: true }),
  transcribeWithWhisper: async (filePath) => ({
    command: `python.exe -u -m whisper "${filePath}" --language fa`,
    exitCode: 1,
    stdout: '',
    stderr: 'Whisper transcription is available in the Electron desktop app.'
  }),
  onWhisperOutput: () => () => undefined,
  windowControls: {
    isMaximized: async () => false,
    minimize: async () => undefined,
    maximize: async () => undefined,
    close: async () => undefined,
    onStateChange: () => () => undefined
  }
}

export function getDesktopApi(): DesktopApi {
  return window.desktop ?? browserDesktopApi
}
