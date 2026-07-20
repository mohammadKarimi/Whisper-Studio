export type DesktopPlatform = 'aix' | 'darwin' | 'freebsd' | 'linux' | 'openbsd' | 'sunos' | 'win32'

export interface AppInfo {
  name: string
  version: string
  electron: string
  chrome: string
  node: string
  userDataPath: string
}

export interface SystemStatusMetric {
  label: string
  value: string
}

export interface SystemStatus {
  metrics: readonly SystemStatusMetric[]
  ready: boolean
  status: string
}
