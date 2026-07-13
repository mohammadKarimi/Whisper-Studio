import { describe, expect, it } from 'vitest'
import {
  resolveFallbackInstallerUrl,
  resolveSystemInstallCandidates
} from '@main/prerequisites/platform-installers'

describe('resolveSystemInstallCandidates()', () => {
  it('returns winget installers on Windows', () => {
    const candidates = resolveSystemInstallCandidates('win32', 'python')

    expect(candidates).toHaveLength(1)
    expect(candidates[0]?.probe).toBe('winget')
    expect(candidates[0]?.args).toContain('Python.Python.3.12')
  })

  it('returns Linux package manager candidates in preference order', () => {
    const candidates = resolveSystemInstallCandidates('linux', 'ffmpeg')

    expect(candidates.map((candidate) => candidate.label)).toEqual(['apt-get', 'dnf'])
  })

  it('returns an empty list for unsupported platforms and pip-only prerequisites', () => {
    expect(resolveSystemInstallCandidates('freebsd', 'python')).toEqual([])
    expect(resolveSystemInstallCandidates('win32', 'torch')).toEqual([])
  })
})

describe('resolveFallbackInstallerUrl()', () => {
  it('returns platform-specific fallback URLs when available', () => {
    expect(resolveFallbackInstallerUrl('darwin', 'python')).toBe(
      'https://www.python.org/downloads/macos/'
    )
    expect(resolveFallbackInstallerUrl('linux', 'ffmpeg')).toBe(
      'https://ffmpeg.org/download.html#build-linux'
    )
  })

  it('falls back to generic URLs for known prerequisites', () => {
    expect(resolveFallbackInstallerUrl('freebsd', 'cuda')).toBe(
      'https://developer.nvidia.com/cuda-downloads'
    )
  })

  it('returns null when no direct installer URL exists', () => {
    expect(resolveFallbackInstallerUrl('linux', 'torch')).toBeNull()
  })
})
