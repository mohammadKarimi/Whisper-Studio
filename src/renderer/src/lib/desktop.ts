import type {
  AppInfo,
  DesktopApi,
  DesktopPlatform,
  PrerequisiteCheck,
  PrerequisiteCheckId,
  PrerequisiteInstallResult,
  SystemStatus
} from '@shared/ipc'

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
  getSystemStatus: async (): Promise<SystemStatus> => ({
    ready: true,
    status: 'System Ready',
    activity: 'Idle',
    metrics: [
      {
        label: 'CPU',
        value: navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} cores` : 'Browser'
      },
      { label: 'Memory', value: 'Browser' },
      { label: 'Platform', value: detectBrowserPlatform() }
    ]
  }),
  getPrerequisites: async (): Promise<PrerequisiteCheck[]> => [
    { id: 'python', installed: null, status: 'missing' },
    { id: 'ffmpeg', installed: null, status: 'missing' },
    { id: 'cuda', installed: null, status: 'missing' },
    { id: 'faster-whisper', installed: null, status: 'missing' },
    { id: 'ctranslate2', installed: null, status: 'missing' },
    { id: 'torch', installed: null, status: 'missing' }
  ],
  installPrerequisite: async (id: PrerequisiteCheckId): Promise<PrerequisiteInstallResult> => ({
    action: 'opened',
    id,
    ok: false,
    stderr: 'Prerequisite installation is available in the Electron desktop app.'
  }),
  selectWhisperFile: async () => ({ canceled: true }),
  transcribeWithWhisper: async (filePath) => ({
    command: `python.exe -u -m whisper "${filePath}" --language fa`,
    exitCode: 1,
    stdout: '',
    stderr: 'Whisper transcription is available in the Electron desktop app.'
  }),
  onWhisperOutput: () => () => undefined,
  onWhisperProgress: () => () => undefined,
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
