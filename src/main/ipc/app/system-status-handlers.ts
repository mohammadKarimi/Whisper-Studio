import { app, ipcMain } from 'electron'
import { IPC_CHANNELS, SystemStatus } from '../../../shared/ipc'
import { cpus, totalmem } from 'os'
import { getActiveRuntime } from '../../runtime/manager'

type BasicGpuDevice = {
  active?: boolean
  deviceString?: string
  vendorString?: string
}

type BasicGpuInfo = {
  gpuDevice?: BasicGpuDevice[]
}

export function registerSystemStatusHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.systemStatus, getSystemStatus)
}

function formatMemory(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024 / 1024)} GB`
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
  const [primaryGpu, runtime] = await Promise.all([getPrimaryGpu(), getActiveRuntime()])

  return {
    ready: runtime !== null,
    status: runtime ? 'Runtime Ready' : 'Runtime Required',
    activity: `v${app.getVersion()}`,
    metrics: [
      { label: 'CPU', value: primaryCpu },
      { label: 'GPU', value: primaryGpu },
      { label: 'Memory', value: formatMemory(totalmem()) },
      { label: 'Platform', value: process.platform }
    ]
  }
}
