import type {
  AppInfo,
  DesktopApi,
  DesktopPlatform,
  DownloadedWhisperModelsResult,
  RuntimeActionResult,
  RuntimeManifest,
  RuntimeStatus,
  SystemStatus,
  WhisperModelActionResult
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
    node: 'browser',
    userDataPath: ''
  }),
  getPlatform: async () => detectBrowserPlatform(),
  getSystemStatus: async (): Promise<SystemStatus> => ({
    ready: true,
    status: 'System Ready',
    metrics: [
      {
        label: 'CPU',
        value: navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} cores` : 'Browser'
      },
      { label: 'GPU', value: 'Browser' },
      { label: 'Memory', value: 'Browser' },
      { label: 'Platform', value: detectBrowserPlatform() }
    ]
  }),
  getRuntimeStatus: async (): Promise<RuntimeStatus> => ({
    active: null,
    available: [],
    recommended: null,
    state: 'missing'
  }),
  getRuntimeManifest: async (): Promise<RuntimeManifest> => ({
    artifacts: [],
    runtimeVersion: '1.0.0',
    schemaVersion: 1
  }),
  installRuntime: async (): Promise<RuntimeActionResult> => ({
    ok: false,
    status: { active: null, available: [], recommended: null, state: 'missing' },
    stderr: 'Runtime installation is available in the Electron desktop app.'
  }),
  removeRuntime: async (): Promise<RuntimeActionResult> => ({
    ok: true,
    status: { active: null, available: [], recommended: null, state: 'missing' }
  }),
  activateManualRuntime: async (): Promise<RuntimeActionResult> => ({
    ok: false,
    status: { active: null, available: [], recommended: null, state: 'missing' },
    stderr: 'Manual activation is available in the Electron desktop app.'
  }),
  openRuntimeFolder: async () => undefined,
  onRuntimeInstallProgress: () => () => undefined,
  getDownloadedModels: async (): Promise<DownloadedWhisperModelsResult> => ({
    models: [],
    totalSizeBytes: 0
  }),
  downloadModel: async (repoId: string): Promise<WhisperModelActionResult> => ({
    id: repoId,
    ok: false,
    stderr: 'Model downloads are available in the Electron desktop app.'
  }),
  deleteModel: async (id: string): Promise<WhisperModelActionResult> => ({
    id,
    ok: false,
    stderr: 'Model deletion is available in the Electron desktop app.'
  }),
  getFilePath: (file: unknown): string => {
    if (file instanceof File) {
      return file.name
    }

    return ''
  },
  onModelDownloadProgress: () => () => undefined,
  selectWhisperFile: async () => ({ canceled: true }),
  transcribeWithWhisper: async (request) => ({
    command: `python.exe -u -c faster_whisper "${request.filePath}"`,
    exitCode: 1,
    stdout: '',
    stderr: 'Whisper transcription is available in the Electron desktop app.'
  }),
  onWhisperOutput: () => () => undefined,
  onWhisperProgress: () => () => undefined,
  listTranscriptions: async () => [],
  deleteTranscription: async () => ({ ok: false }),
  readTextFile: async () => '',
  writeTextFile: async () => {},
  saveRecording: async () => {
    throw new Error('Meeting recording is available in the Electron desktop app.')
  },
  selectDirectory: async () => null,
  getSettings: async () => ({
    defaultModel: null,
    defaultLanguage: 'Auto',
    defaultTask: 'transcribe',
    defaultCompute: 'auto',
    defaultOutputDirectory: null,
    defaultExportFormats: ['srt', 'vtt', 'txt', 'tsv'],
    hfToken: null
  }),
  setSettings: async () => undefined,
  checkForUpdates: async () => ({
    currentVersion: '0.1.0',
    hasUpdate: false,
    latestVersion: '0.1.0',
    releaseUrl: '',
    releaseName: 'Whisper Studio'
  }),
  openExternal: async () => undefined,
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
