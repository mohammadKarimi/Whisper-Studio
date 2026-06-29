import { app } from 'electron'
import { cpus, totalmem } from 'node:os'
import type { AppInfo, DesktopPlatform, SystemStatus } from '../../../shared/ipc'

type BasicGpuDevice = {
  active?: boolean
  deviceString?: string
  vendorString?: string
}

type BasicGpuInfo = {
  gpuDevice?: BasicGpuDevice[]
}

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

async function getPrimaryGpu(): Promise<string> {
  try {
    const info = (await app.getGPUInfo('basic')) as BasicGpuInfo
    const devices = (info.gpuDevice ?? []).filter((device) => device.deviceString)

    if (devices.length === 0) {
      return 'Unknown'
    }

    const activeDevice = devices.find((device) => device.active) ?? devices[0]
    return activeDevice?.deviceString?.trim() || 'Unknown'
  } catch {
    return 'Unknown'
  }
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const primaryCpu = cpus()[0]?.model?.replace(/\s+/g, ' ').trim() || process.arch
  const primaryGpu = await getPrimaryGpu()

  return {
    ready: true,
    status: 'System Ready',
    activity: `v${app.getVersion()}`,
    metrics: [
      { label: 'CPU', value: primaryCpu },
      { label: 'GPU', value: primaryGpu },
      { label: 'Memory', value: formatMemory(totalmem()) },
      { label: 'Platform', value: process.platform }
    ]
  }
}
