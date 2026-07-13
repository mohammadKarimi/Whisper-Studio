import type { PrerequisiteCheckId } from '../../shared/ipc'
import { PYTHON_TARGET_VERSION } from '../../shared/constants'
import { installerUrls } from './config'

export type InstallPlatform = 'darwin' | 'linux' | 'win32'

export type SystemInstallCandidate = {
  probe: string
  command: string
  args: readonly string[]
  label: string
}

const fallbackInstallerUrls: Record<
  InstallPlatform,
  Partial<Record<PrerequisiteCheckId, string>>
> = {
  win32: {
    python: 'https://www.python.org/downloads/windows/',
    ffmpeg: 'https://www.gyan.dev/ffmpeg/builds/'
  },
  darwin: {
    python: 'https://www.python.org/downloads/macos/',
    ffmpeg: 'https://ffmpeg.org/download.html#build-mac'
  },
  linux: {
    python: 'https://www.python.org/downloads/source/',
    ffmpeg: 'https://ffmpeg.org/download.html#build-linux'
  }
}

const systemInstallers: Record<
  InstallPlatform,
  Partial<Record<PrerequisiteCheckId, readonly SystemInstallCandidate[]>>
> = {
  win32: {
    python: [
      {
        probe: 'winget',
        command: 'winget',
        args: [
          'install',
          '-e',
          '--id',
          `Python.Python.${PYTHON_TARGET_VERSION}`,
          '--accept-source-agreements',
          '--accept-package-agreements'
        ],
        label: 'winget'
      }
    ],
    ffmpeg: [
      {
        probe: 'winget',
        command: 'winget',
        args: [
          'install',
          '-e',
          '--id',
          'Gyan.FFmpeg',
          '--accept-source-agreements',
          '--accept-package-agreements'
        ],
        label: 'winget'
      }
    ]
  },
  darwin: {
    python: [
      {
        probe: 'brew',
        command: 'brew',
        args: ['install', `python@${PYTHON_TARGET_VERSION}`],
        label: 'Homebrew'
      }
    ],
    ffmpeg: [{ probe: 'brew', command: 'brew', args: ['install', 'ffmpeg'], label: 'Homebrew' }]
  },
  linux: {
    python: [
      {
        probe: 'apt-get',
        command: 'sudo',
        args: [
          'apt-get',
          'install',
          '-y',
          `python${PYTHON_TARGET_VERSION}`,
          `python${PYTHON_TARGET_VERSION}-venv`,
          'python3-pip'
        ],
        label: 'apt-get'
      },
      {
        probe: 'dnf',
        command: 'sudo',
        args: [
          'dnf',
          'install',
          '-y',
          `python${PYTHON_TARGET_VERSION}`,
          `python${PYTHON_TARGET_VERSION}-pip`
        ],
        label: 'dnf'
      }
    ],
    ffmpeg: [
      {
        probe: 'apt-get',
        command: 'sudo',
        args: ['apt-get', 'install', '-y', 'ffmpeg'],
        label: 'apt-get'
      },
      { probe: 'dnf', command: 'sudo', args: ['dnf', 'install', '-y', 'ffmpeg'], label: 'dnf' }
    ]
  }
}

export function getInstallPlatform(): InstallPlatform | null {
  if (
    process.platform === 'win32' ||
    process.platform === 'darwin' ||
    process.platform === 'linux'
  ) {
    return process.platform
  }

  return null
}

export function resolveSystemInstallCandidates(
  platform: NodeJS.Platform,
  id: PrerequisiteCheckId
): readonly SystemInstallCandidate[] {
  if (platform === 'win32' || platform === 'darwin' || platform === 'linux') {
    return systemInstallers[platform][id] ?? []
  }

  return []
}

export function resolveFallbackInstallerUrl(
  platform: NodeJS.Platform,
  id: PrerequisiteCheckId
): string | null {
  const platformUrl =
    platform === 'win32' || platform === 'darwin' || platform === 'linux'
      ? fallbackInstallerUrls[platform]?.[id]
      : undefined

  return platformUrl ?? installerUrls[id] ?? null
}
