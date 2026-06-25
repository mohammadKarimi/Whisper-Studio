import { app } from 'electron'
import { cpus, totalmem } from 'node:os'
import type { AppInfo, DesktopPlatform, SystemStatus } from '../../../shared/ipc'

function formatMemory(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024 / 1024)} GB`
}

export function getAppInfo(): AppInfo {
  return {
    name: app.getName(),
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }
}

export function getDesktopPlatform(): DesktopPlatform {
  return process.platform as DesktopPlatform
}

export function getSystemStatus(): SystemStatus {
  const primaryCpu = cpus()[0]?.model?.replace(/\s+/g, ' ').trim() || process.arch

  return {
    ready: true,
    status: 'System Ready',
    activity: 'Idle',
    metrics: [
      { label: 'CPU', value: primaryCpu },
      { label: 'Memory', value: formatMemory(totalmem()) },
      { label: 'Platform', value: process.platform }
    ]
  }
}
