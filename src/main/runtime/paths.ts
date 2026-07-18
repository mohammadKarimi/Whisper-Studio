import { dirname, join } from 'node:path'
import type { RuntimeArtifact } from '../../shared/ipc'
import { getRuntimesPath } from '../paths'

export function getRuntimeInstallPath(artifact: RuntimeArtifact): string {
  return join(getRuntimesPath(), artifact.id)
}

export function getRuntimePythonPath(root: string): string {
  return process.platform === 'win32'
    ? join(root, 'python', 'python.exe')
    : join(root, 'python', 'bin', 'python3')
}

export function getRuntimePythonCommand(root: string): string {
  return process.platform === 'win32' ? getRuntimePythonPath(root) : 'python3'
}

export function getRuntimeBinPath(root: string): string {
  return process.platform === 'win32'
    ? join(root, 'python', 'Scripts')
    : dirname(getRuntimePythonPath(root))
}

export function getRuntimeFfmpegPath(root: string): string {
  return join(root, 'ffmpeg', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
}
