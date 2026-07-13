import type { PrerequisiteCheckId } from '../../shared/ipc'
import { PYTHON_TARGET_VERSION } from '../../shared/constants'

export const prerequisiteIds: readonly PrerequisiteCheckId[] = [
  'python',
  'ffmpeg',
  'cuda',
  'whisperx',
  'torch'
]

export const pipInstallPackages = {
  whisperx: 'whisperx',
  torch: 'torch'
} satisfies Partial<Record<PrerequisiteCheckId, string>>

export const PYTHON_PACKAGE_MAX_EXCLUSIVE = [3, 13] as const

export const unsupportedPythonMessage = `Python 3.13 was detected, but Whisper dependencies are not reliable with it yet. Install Python ${PYTHON_TARGET_VERSION}, then retry.`

export const installerUrls = {
  python: 'https://www.python.org/downloads/',
  ffmpeg: 'https://www.gyan.dev/ffmpeg/builds/',
  cuda: 'https://developer.nvidia.com/cuda-downloads'
} satisfies Partial<Record<PrerequisiteCheckId, string>>

export const CUDA_INSTALL_TIMEOUT_MS = 2 * 60 * 60 * 1000
export const PIP_INSTALL_TIMEOUT_MS = 30 * 60 * 1000
export const TORCH_PROBE_TIMEOUT_MS = 30_000
export const TORCH_PROBE_TIMEOUT_AFTER_INSTALL_MS = 90_000
