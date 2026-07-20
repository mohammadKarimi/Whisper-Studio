export interface FileSelection {
  canceled: boolean
  filePath?: string
  fileName?: string
}

export interface AppSettings {
  defaultModel: string | null
  defaultLanguage: string
  defaultTask: 'transcribe' | 'translate'
  defaultCompute: 'cpu' | 'cuda' | 'auto'
  defaultOutputDirectory: string | null
  defaultExportFormats: string[]
  hfToken: string | null
}

export interface UpdateCheckResult {
  currentVersion: string
  hasUpdate: boolean
  latestVersion: string
  releaseUrl: string
  releaseName: string
}
